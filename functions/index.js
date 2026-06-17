const functions = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()

exports.api = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  res.set('Access-Control-Allow-Methods', 'POST,OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }

  const url = new URL(req.originalUrl || req.url, 'http://localhost')
  const path = url.pathname.replace(/^\/api/, '') || '/'

  if (req.method !== 'POST' || path !== '/expenses') {
    return res.status(404).json({ error: 'Not found' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const groupId = String(body.groupId || '').trim()
    const date = String(body.date || '').trim()
    const amount = Number(body.amount)

    if (!groupId || !date || !Number.isFinite(amount)) {
      return res.status(400).json({ error: 'groupId, date, and amount are required' })
    }

    const payload = {
      groupId,
      date,
      amount,
      description: String(body.description || '').trim() || null,
      category: String(body.category || 'other').trim(),
      merchant: String(body.merchant || '').trim() || null,
      paidBy: String(body.paidBy || '').trim() || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }

    const doc = await db.collection('expenses').add(payload)

    return res.status(201).json({
      ok: true,
      id: doc.id,
      path: `/expenses/${doc.id}`,
    })
  } catch (error) {
    console.error('Failed to record expense', error)
    return res.status(500).json({ error: 'Failed to record expense' })
  }
})