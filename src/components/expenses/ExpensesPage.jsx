import { useEffect, useState } from 'react'
import { addDoc, collection, query, serverTimestamp, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { format, parseISO } from 'date-fns'

const TODAY = format(new Date(), 'yyyy-MM-dd')

const CATEGORY_ICONS = {
  food:          '🍕',
  transport:     '🚗',
  groceries:     '🛒',
  health:        '💊',
  entertainment: '🎬',
  shopping:      '🛍',
  bills:         '📄',
  other:         '💳',
}

export default function ExpensesPage() {
  const { profile } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('today')   // 'today' | 'all'
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({
    amount: '',
    description: '',
    category: 'food',
    merchant: '',
    paidBy: profile?.displayName || '',
  })

  useEffect(() => {
    if (!profile?.groupId) return

    const constraints = [
      where('groupId', '==', profile.groupId),
    ]
    if (filter === 'today') constraints.push(where('date', '==', TODAY))

    const q = query(collection(db, 'expenses'), ...constraints)

    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          // sort by createdAt descending (Timestamps)
          const ta = a.createdAt?.seconds || 0
          const tb = b.createdAt?.seconds || 0
          return tb - ta
        })
      setExpenses(docs)
      setLoading(false)
    })
    return unsub
  }, [profile, filter])

  const todayTotal = expenses
    .filter(e => e.date === TODAY)
    .reduce((s, e) => s + (e.amount || 0), 0)

  const allTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  /* Group by date for 'all' view */
  const grouped = expenses.reduce((acc, e) => {
    const d = e.date || 'Unknown'
    if (!acc[d]) acc[d] = []
    acc[d].push(e)
    return acc
  }, {})

  function setField(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const amount = Number(form.amount)
    if (!profile?.groupId) return setError('Sign in again to add an expense.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter a valid amount.')

    setSaving(true)
    try {
      await addDoc(collection(db, 'expenses'), {
        groupId: profile.groupId,
        date: TODAY,
        amount,
        description: form.description.trim() || null,
        category: form.category,
        merchant: form.merchant.trim() || null,
        paidBy: form.paidBy.trim() || profile.displayName || null,
        createdAt: serverTimestamp(),
      })
      setForm({
        amount: '',
        description: '',
        category: 'food',
        merchant: '',
        paidBy: profile.displayName || '',
      })
    } catch (submitError) {
      setError(submitError?.message || 'Could not save the expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-date">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <span className="badge badge-green">Live tracking</span>
      </div>

      <div className="card expense-entry-card" style={{ marginBottom: '1.25rem' }}>
        <div className="section-header">
          <span className="section-title">Add expense</span>
          <span className="badge badge-muted">Shared with your group</span>
        </div>
        <form className="expense-entry-form" onSubmit={handleSubmit}>
          <label className="input-group">
            <span className="input-label">Amount</span>
            <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={setField('amount')} placeholder="250" required />
          </label>
          <label className="input-group">
            <span className="input-label">Description</span>
            <input className="input" type="text" value={form.description} onChange={setField('description')} placeholder="Lunch at cafe" />
          </label>
          <label className="input-group">
            <span className="input-label">Category</span>
            <select className="input" value={form.category} onChange={setField('category')}>
              <option value="food">Food</option>
              <option value="transport">Transport</option>
              <option value="groceries">Groceries</option>
              <option value="health">Health</option>
              <option value="entertainment">Entertainment</option>
              <option value="shopping">Shopping</option>
              <option value="bills">Bills</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="input-group">
            <span className="input-label">Merchant</span>
            <input className="input" type="text" value={form.merchant} onChange={setField('merchant')} placeholder="The Coffee House" />
          </label>
          <label className="input-group">
            <span className="input-label">Paid by</span>
            <input className="input" type="text" value={form.paidBy} onChange={setField('paidBy')} placeholder="Alex" />
          </label>
          {error && <div className="auth-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save expense'}
          </button>
        </form>
      </div>

      {/* Summary */}
      <div className="card-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="card stat-tile">
          <span className="stat-label">Today</span>
          <span className="stat-value" style={{ color: 'var(--accent)' }}>
            ₹{todayTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>spent today</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Transactions</span>
          <span className="stat-value">{expenses.length}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filter === 'today' ? 'today' : 'shown'}</span>
        </div>
      </div>

      {filter === 'all' && (
        <div className="card stat-tile" style={{ marginBottom: '1.25rem' }}>
          <span className="stat-label">All time total</span>
          <span className="stat-value" style={{ color: 'var(--accent)' }}>
            ₹{allTotal.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>across all loaded transactions</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="tab-bar" style={{ marginBottom: '1.25rem' }}>
        <button className={`tab-btn${filter === 'today' ? ' active' : ''}`} onClick={() => setFilter('today')}>Today</button>
        <button className={`tab-btn${filter === 'all'   ? ' active' : ''}`} onClick={() => setFilter('all')}>All time</button>
      </div>

      {/* Expense list */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💳</span>
          <h3>No expenses {filter === 'today' ? 'today' : 'found'}</h3>
          <p>Add one using the form above and it will show up here for everyone in the group.</p>
          <ExpenseHelp groupId={profile?.groupId} />
        </div>
      ) : filter === 'today' ? (
        <div className="card" style={{ padding: '0 1.25rem' }}>
          {expenses.map(e => <ExpenseRow key={e.id} expense={e} />)}
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, items]) => (
            <div key={date} className="section">
              <div className="section-header">
                <span className="section-title">{formatDate(date)}</span>
                <span className="badge badge-accent">
                  ₹{items.reduce((s,i)=>s+(i.amount||0),0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="card" style={{ padding: '0 1.25rem' }}>
                {items.map(e => <ExpenseRow key={e.id} expense={e} />)}
              </div>
            </div>
          ))
      )}
    </div>
  )
}

function ExpenseRow({ expense }) {
  const icon = CATEGORY_ICONS[expense.category?.toLowerCase()] || CATEGORY_ICONS.other
  return (
    <div className="expense-row">
      <div className="expense-icon">{icon}</div>
      <div className="expense-info">
        <div className="expense-name">{expense.description || expense.merchant || 'Transaction'}</div>
        <div className="expense-detail">
          {expense.category ? `${expense.category}` : 'Other'}
          {expense.paidBy ? ` · ${expense.paidBy}` : ''}
        </div>
      </div>
      <div className="expense-amount" style={{ color: 'var(--accent)' }}>
        ₹{(expense.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
      </div>
    </div>
  )
}

function ExpenseHelp({ groupId }) {
  return (
    <div className="expense-webhook-card">
      <div className="expense-webhook-card-header">
        <strong>Example payload</strong>
        <span className="badge badge-muted">Read-only</span>
      </div>
      <pre className="expense-webhook-code">
{`{
  "groupId": "${groupId || 'YOUR_GROUP_ID'}",
  "date": "2025-01-15",
  "amount": 250.00,
  "description": "Lunch at cafe",
  "category": "food",
  "merchant": "The Coffee House",
  "paidBy": "Alex"
}`}
      </pre>
      <p className="expense-webhook-copy">
        This is the same shape saved by the form above, so manual entries and future webhook automation stay compatible.
      </p>
    </div>
  )
}

function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'EEEE, MMM d')
  } catch {
    return dateStr
  }
}
