import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { format } from 'date-fns'

const TODAY = format(new Date(), 'yyyy-MM-dd')
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
const WATER_GLASSES = 8

export default function HealthPage() {
  const { user } = useAuth()
  const [tab, setTab]   = useState('meals')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Health</h1>
          <p className="page-date">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
      </div>

      <div className="tab-bar">
        {['meals', 'weight', 'water'].map(t => (
          <button
            key={t}
            className={`tab-btn${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'meals' ? '🍽 Meals' : t === 'weight' ? '⚖️ Weight' : '💧 Water'}
          </button>
        ))}
      </div>

      {tab === 'meals'  && <MealsTab  uid={user.uid} />}
      {tab === 'weight' && <WeightTab uid={user.uid} />}
      {tab === 'water'  && <WaterTab  uid={user.uid} />}
    </div>
  )
}

/* ── Meals Tab ────────────────────────────────────────────────────── */
function MealsTab({ uid }) {
  const [logs, setLogs]       = useState([])
  const [form, setForm]       = useState({ mealType: 'Breakfast', description: '', calories: '' })
  const [saving, setSaving]   = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'healthLogs'),
      where('userId', '==', uid),
      where('date',   '==', TODAY),
      where('type',   '==', 'meal')
    )
    return onSnapshot(q, snap =>
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    )
  }, [uid])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await addDoc(collection(db, 'healthLogs'), {
        userId:      uid,
        date:        TODAY,
        type:        'meal',
        mealType:    form.mealType,
        description: form.description.trim(),
        calories:    Number(form.calories) || 0,
        createdAt:   serverTimestamp(),
      })
      setForm({ mealType: 'Breakfast', description: '', calories: '' })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const totalCal = logs.reduce((s, l) => s + (l.calories || 0), 0)

  return (
    <div>
      {/* Summary */}
      <div className="card-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="card stat-tile">
          <span className="stat-label">Total today</span>
          <span className="stat-value" style={{ color: 'var(--accent2)' }}>{totalCal}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>kcal</span>
        </div>
        <div className="card stat-tile">
          <span className="stat-label">Meals logged</span>
          <span className="stat-value">{logs.length}</span>
        </div>
      </div>

      {/* Log button */}
      <button className="btn btn-primary" style={{ marginBottom: '1rem' }} onClick={() => setShowForm(s => !s)}>
        {showForm ? 'Cancel' : '+ Log meal'}
      </button>

      {/* Form */}
      {showForm && (
        <form className="card form-stack" style={{ marginBottom: '1rem' }} onSubmit={handleAdd}>
          <div className="input-group">
            <label className="input-label">Meal type</label>
            <select className="input" value={form.mealType} onChange={e => setForm(f => ({ ...f, mealType: e.target.value }))}>
              {MEAL_TYPES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">What did you eat?</label>
            <input
              className="input"
              placeholder="e.g. Oats with banana and honey"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="input-group">
            <label className="input-label">Calories (kcal)</label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="350"
              value={form.calories}
              onChange={e => setForm(f => ({ ...f, calories: e.target.value }))}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save meal'}
          </button>
        </form>
      )}

      {/* Meal list grouped by type */}
      {MEAL_TYPES.map(mt => {
        const items = logs.filter(l => l.mealType === mt)
        if (items.length === 0) return null
        return (
          <div key={mt} className="section">
            <div className="section-header">
              <span className="section-title">{mt}</span>
              <span className="badge badge-pink">{items.reduce((s,i) => s + (i.calories||0), 0)} kcal</span>
            </div>
            <div className="card" style={{ padding: '0 1.25rem' }}>
              {items.map(item => (
                <div key={item.id} className="meal-item">
                  <div>
                    <div className="meal-label">{item.description || '(no description)'}</div>
                    <div className="meal-cal">{item.calories || 0} kcal</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {logs.length === 0 && !showForm && (
        <div className="empty-state">
          <span className="empty-icon">🥗</span>
          <h3>No meals logged yet</h3>
          <p>Tap "+ Log meal" to record your first meal today.</p>
        </div>
      )}
    </div>
  )
}

/* ── Weight Tab ───────────────────────────────────────────────────── */
function WeightTab({ uid }) {
  const [history, setHistory] = useState([])
  const [form, setForm]       = useState({ weight: '', unit: 'kg' })
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    const q = query(
      collection(db, 'healthLogs'),
      where('userId', '==', uid),
      where('type',   '==', 'weight')
    )
    return onSnapshot(q, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => b.date.localeCompare(a.date))
      setHistory(sorted)
    })
  }, [uid])

  async function handleSave(e) {
    e.preventDefault()
    if (!form.weight) return
    setSaving(true)
    try {
      // Upsert today's weight entry
      await setDoc(
        doc(db, 'healthLogs', `${uid}_weight_${TODAY}`),
        {
          userId: uid,
          date: TODAY,
          type: 'weight',
          weight: parseFloat(form.weight),
          unit: form.unit,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
      setForm(f => ({ ...f, weight: '' }))
    } finally {
      setSaving(false)
    }
  }

  const latest = history[0]

  return (
    <div>
      {latest && (
        <div className="card" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Latest</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent)' }}>
            {latest.weight} <span style={{ fontSize: '1.2rem' }}>{latest.unit}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{latest.date}</div>
        </div>
      )}

      <form className="card form-stack" style={{ marginBottom: '1.5rem' }} onSubmit={handleSave}>
        <h3>Log today's weight</h3>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label className="input-label">Weight</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min="20"
              placeholder="68.5"
              value={form.weight}
              onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
              required
            />
          </div>
          <div className="input-group" style={{ width: 90 }}>
            <label className="input-label">Unit</label>
            <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save weight'}
        </button>
      </form>

      {/* History */}
      {history.length > 0 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">History</span>
          </div>
          <div className="card" style={{ padding: '0 1.25rem' }}>
            {history.slice(0, 14).map(h => (
              <div key={h.id} className="meal-item">
                <span className="meal-label">{h.date}</span>
                <span style={{ fontWeight: 700 }}>{h.weight} {h.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Water Tab ────────────────────────────────────────────────────── */
function WaterTab({ uid }) {
  const [glasses, setGlasses] = useState(0)
  const [saving, setSaving]   = useState(false)
  const docId = `${uid}_water_${TODAY}`

  useEffect(() => {
    getDoc(doc(db, 'healthLogs', docId)).then(snap => {
      if (snap.exists()) setGlasses(snap.data().glasses || 0)
    })
  }, [docId])

  async function updateGlasses(n) {
    const val = Math.max(0, Math.min(n, WATER_GLASSES))
    setGlasses(val)
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'healthLogs', docId),
        { userId: uid, date: TODAY, type: 'water', glasses: val, updatedAt: serverTimestamp() },
        { merge: true }
      )
    } finally {
      setSaving(false)
    }
  }

  const pct = Math.round((glasses / WATER_GLASSES) * 100)

  return (
    <div>
      <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>Today's water intake</div>
        <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent3)' }}>
          {glasses}<span style={{ fontSize: '1.2rem' }}> / {WATER_GLASSES}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>glasses ({glasses * 250} ml)</div>
        <div className="progress-bar" style={{ marginBottom: 16 }}>
          <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #43E97B, #38f9d7)' }} />
        </div>
        <div className="water-grid" style={{ justifyContent: 'center' }}>
          {Array.from({ length: WATER_GLASSES }).map((_, i) => (
            <button
              key={i}
              className={`water-bubble${i < glasses ? ' filled' : ''}`}
              onClick={() => updateGlasses(i < glasses ? i : i + 1)}
              aria-label={`Glass ${i + 1}`}
            >
              💧
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => updateGlasses(glasses - 1)} disabled={glasses === 0 || saving}>
          − Remove glass
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => updateGlasses(glasses + 1)} disabled={glasses >= WATER_GLASSES || saving}>
          + Add glass
        </button>
      </div>
    </div>
  )
}
