import express from 'express'
import admin from 'firebase-admin'
import { parseTaskerExpensePayload } from './parser.js'

const PORT = Number(process.env.PORT || 8787)
const WEBHOOK_TOKEN = String(process.env.WEBHOOK_TOKEN || '').trim()

function loadServiceAccountCredentials() {
  const rawJson = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim()
  const rawBase64 = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64 || '').trim()

  if (rawJson) {
    if (rawJson.startsWith('{')) {
      return JSON.parse(rawJson)
    }

    try {
      const decoded = Buffer.from(rawJson, 'base64').toString('utf8').trim()
      if (decoded.startsWith('{')) {
        return JSON.parse(decoded)
      }
    } catch {
      // fall through to the explicit error below
    }

    throw new Error(
      'Invalid FIREBASE_SERVICE_ACCOUNT_JSON. Use a raw service-account JSON string or set FIREBASE_SERVICE_ACCOUNT_JSON_B64.',
    )
  }

  if (rawBase64) {
    const decoded = Buffer.from(rawBase64, 'base64').toString('utf8').trim()
    if (!decoded.startsWith('{')) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON_B64. Expected base64-encoded service-account JSON.')
    }
    return JSON.parse(decoded)
  }

  return null
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64) {
  console.warn('Missing Firebase credentials. Set GOOGLE_APPLICATION_CREDENTIALS, FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_SERVICE_ACCOUNT_JSON_B64.')
}

if (!admin.apps.length) {
  const credentials = loadServiceAccountCredentials()

  if (credentials) {
    admin.initializeApp({ credential: admin.credential.cert(credentials) })
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
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
