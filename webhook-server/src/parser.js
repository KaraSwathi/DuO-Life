const AMOUNT_PATTERNS = [
  /(?:rs\.?|inr|mrp\s*rs\.?|amt\s*rs\.?|amount\s*(?:of)?\s*rs\.?)[\s:]*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:debited|spent|paid|purchase(?:d)?|transaction\s*(?:of)?)[^\d]{0,20}([\d,]+(?:\.\d{1,2})?)/i,
]

const MERCHANT_PATTERNS = [
  /(?:at|to|towards|to\s+vpa)\s+([a-z0-9 .,&@_-]{3,80})/i,
  /(?:from\s+merchant|merchant)\s*[:\-]\s*([a-z0-9 .,&@_-]{3,80})/i,
]

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAmount(text) {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    const numeric = Number(match[1].replace(/,/g, ''))
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  return null
}

function parseMerchant(text) {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern)
    if (!match?.[1]) continue
    return normalizeSpaces(match[1])
  }
  return null
}

function classifyCategory(rawSms, explicitCategory) {
  if (explicitCategory) return explicitCategory
  const lower = rawSms.toLowerCase()

  if (/uber|ola|metro|fuel|petrol|diesel|cab|auto|bus|train/.test(lower)) return 'transport'
  if (/swiggy|zomato|restaurant|cafe|dine|food|pizza|burger/.test(lower)) return 'food'
  if (/dmart|bigbasket|blinkit|zepto|grocery|supermarket/.test(lower)) return 'groceries'
  if (/pharma|hospital|clinic|medicine|apollo/.test(lower)) return 'health'
  if (/netflix|prime|movie|bookmyshow|spotify/.test(lower)) return 'entertainment'
  if (/amazon|flipkart|myntra|ajio|shopping/.test(lower)) return 'shopping'
  if (/electricity|water bill|broadband|recharge|postpaid|emi/.test(lower)) return 'bills'

  return 'other'
}

function parseDate(inputDate) {
  if (!inputDate) {
    return new Date().toISOString().slice(0, 10)
  }

  const parsed = new Date(inputDate)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10)
  }

  return parsed.toISOString().slice(0, 10)
}

export function parseTaskerExpensePayload(body = {}) {
  const groupId = normalizeSpaces(body.groupId)
  const rawSms = normalizeSpaces(body.rawSms || body.sms || body.message)

  if (!groupId) {
    throw new Error('groupId is required')
  }

  if (!rawSms) {
    throw new Error('rawSms (or sms/message) is required')
  }

  const amount = Number(body.amount)
  const resolvedAmount = Number.isFinite(amount) && amount > 0 ? amount : parseAmount(rawSms)

  if (!resolvedAmount) {
    throw new Error('Could not detect amount from payload')
  }

  const merchant = normalizeSpaces(body.merchant) || parseMerchant(rawSms)
  const paidBy = normalizeSpaces(body.paidBy) || normalizeSpaces(body.deviceName) || 'SMS Auto'
  const description = normalizeSpaces(body.description) || merchant || 'SMS payment'

  return {
    groupId,
    date: parseDate(body.date || body.timestamp),
    amount: resolvedAmount,
    description,
    category: classifyCategory(rawSms, normalizeSpaces(body.category).toLowerCase() || null),
    merchant: merchant || null,
    paidBy,
    source: 'sms',
    rawSms,
    smsSender: normalizeSpaces(body.sender) || null,
    deviceId: normalizeSpaces(body.deviceId) || null,
  }
}
