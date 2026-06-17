import express from 'express'
import admin from 'firebase-admin'
import { parseTaskerExpensePayload } from './parser.js'

const PORT = Number(process.env.PORT || 8787)
const WEBHOOK_TOKEN = String(process.env.WEBHOOK_TOKEN || '').trim()

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.warn('Missing Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.')
}

if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    admin.initializeApp({ credential: admin.credential.cert(credentials) })
  } else {
    admin.initializeApp()
  }
}

const db = admin.firestore()
const app = express()

app.use(express.json({ limit: '512kb' }))

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'duo-life-webhook', uptime: process.uptime() })
})

app.post('/webhook/tasker/sms', async (req, res) => {
  try {
    const providedToken = String(req.get('x-webhook-token') || req.query.token || req.body?.token || '').trim()
    if (!WEBHOOK_TOKEN || providedToken !== WEBHOOK_TOKEN) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' })
    }

    const expense = parseTaskerExpensePayload(req.body || {})
    expense.createdAt = admin.firestore.FieldValue.serverTimestamp()

    const docRef = await db.collection('expenses').add(expense)

    return res.status(201).json({
      ok: true,
      id: docRef.id,
      amount: expense.amount,
      date: expense.date,
      category: expense.category,
    })
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: error?.message || 'Invalid payload',
    })
  }
})

app.listen(PORT, () => {
  console.log(`Webhook receiver running on port ${PORT}`)
})
