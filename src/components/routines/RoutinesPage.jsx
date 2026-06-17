import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../hooks/useAuth'
import { format } from 'date-fns'

const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function RoutinesPage() {
  const { user, profile } = useAuth()
  const [routines, setRoutines] = useState([])
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [form, setForm]         = useState({ taskName: '', assignedTo: user?.uid || '' })
  const [saving, setSaving]     = useState(false)

  /* Real-time listener on group routines for today */
  useEffect(() => {
    if (!profile?.groupId) return
    const q = query(
      collection(db, 'routines'),
      where('groupId', '==', profile.groupId),
      where('date',    '==', TODAY)
    )
    const unsub = onSnapshot(q, (snap) => {
      setRoutines(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [profile])

  /* Toggle completion */
  async function toggle(routine) {
    await updateDoc(doc(db, 'routines', routine.id), {
      isCompleted: !routine.isCompleted,
      updatedAt: serverTimestamp(),
    })
  }

  /* Add routine */
  async function handleAdd(e) {
    e.preventDefault()
    if (!form.taskName.trim()) return
    setSaving(true)
    try {
      await addDoc(collection(db, 'routines'), {
        taskName:    form.taskName.trim(),
        date:        TODAY,
        isCompleted: false,
        assignedTo:  form.assignedTo || user.uid,
        groupId:     profile.groupId,
        createdBy:   user.uid,
        createdAt:   serverTimestamp(),
      })
      setForm({ taskName: '', assignedTo: user.uid })
      setAdding(false)
    } finally {
      setSaving(false)
    }
  }

  /* Delete routine */
  async function handleDelete(id) {
    await deleteDoc(doc(db, 'routines', id))
  }

  const done    = routines.filter(r => r.isCompleted)
  const pending = routines.filter(r => !r.isCompleted)
  const pct     = routines.length > 0 ? Math.round((done.length / routines.length) * 100) : 0

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Routines</h1>
          <p className="page-date">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setAdding(a => !a)}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Progress */}
      {routines.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{done.length} of {routines.length} done</span>
            <span className={`badge ${pct === 100 ? 'badge-green' : 'badge-accent'}`}>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Add form */}
      {adding && (
        <form className="card form-stack" style={{ marginBottom: '1.25rem' }} onSubmit={handleAdd}>
          <h3>New routine for today</h3>
          <div className="input-group">
            <label className="input-label">Task name</label>
            <input
              className="input"
              placeholder="e.g. Morning yoga, Take vitamins…"
              value={form.taskName}
              onChange={e => setForm(f => ({ ...f, taskName: e.target.value }))}
              required
              autoFocus
            />
          </div>
          <div className="input-group">
            <label className="input-label">Assigned to</label>
            <select
              className="input"
              value={form.assignedTo}
              onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
            >
              <option value={user.uid}>Me ({profile?.displayName || 'You'})</option>
              <option value="partner">Partner</option>
              <option value="both">Both of us</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Add routine'}
          </button>
        </form>
      )}

      {/* Pending */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">To do · {pending.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {pending.map(r => (
                  <RoutineCard key={r.id} routine={r} onToggle={toggle} onDelete={handleDelete} profile={profile} />
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="section">
              <div className="section-header">
                <span className="section-title">Done · {done.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {done.map(r => (
                  <RoutineCard key={r.id} routine={r} onToggle={toggle} onDelete={handleDelete} profile={profile} />
                ))}
              </div>
            </div>
          )}

          {routines.length === 0 && !adding && (
            <div className="empty-state">
              <span className="empty-icon">📋</span>
              <h3>No routines yet</h3>
              <p>Tap "+ Add" to create your first task for today.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RoutineCard({ routine, onToggle, onDelete, profile }) {
  const assigneeLabel =
    routine.assignedTo === 'both' ? 'Both of you' :
    routine.assignedTo === 'partner' ? 'Partner' :
    profile?.displayName || 'Me'

  return (
    <div
      className={`routine-card${routine.isCompleted ? ' done' : ''}`}
      onClick={() => onToggle(routine)}
    >
      <div className="routine-check">
        {routine.isCompleted && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F0F1A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <div className="routine-meta">
        <div className="routine-name">{routine.taskName}</div>
        <div className="routine-assignee">👤 {assigneeLabel}</div>
      </div>
      <button
        className="btn btn-icon btn-ghost btn-sm"
        style={{ color: 'var(--text-muted)', flexShrink: 0 }}
        onClick={e => { e.stopPropagation(); onDelete(routine.id) }}
        aria-label="Delete"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
        </svg>
      </button>
    </div>
  )
}
