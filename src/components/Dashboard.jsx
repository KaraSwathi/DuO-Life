import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { format } from 'date-fns'

const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [stats, setStats]   = useState({ routinesDone: 0, routinesTotal: 0, calories: 0, spent: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.groupId) return
    fetchStats()
  }, [profile])

  async function fetchStats() {
    try {
      // Routines
      const rQ = query(
        collection(db, 'routines'),
        where('groupId', '==', profile.groupId),
        where('date', '==', TODAY)
      )
      const rSnap = await getDocs(rQ)
      const routines = rSnap.docs.map(d => d.data())

      // Health — calories today
      const hQ = query(
        collection(db, 'healthLogs'),
        where('userId', '==', user.uid),
        where('date',   '==', TODAY)
      )
      const hSnap = await getDocs(hQ)
      const totalCal = hSnap.docs.reduce((s, d) => s + (d.data().calories || 0), 0)

      // Expenses today
      const eQ = query(
        collection(db, 'expenses'),
        where('groupId', '==', profile.groupId),
        where('date',    '==', TODAY)
      )
      const eSnap = await getDocs(eQ)
      const totalSpent = eSnap.docs.reduce((s, d) => s + (d.data().amount || 0), 0)

      setStats({
        routinesDone:  routines.filter(r => r.isCompleted).length,
        routinesTotal: routines.length,
        calories:      totalCal,
        spent:         totalSpent,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const pct = stats.routinesTotal > 0
    ? Math.round((stats.routinesDone / stats.routinesTotal) * 100)
    : 0

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div>
          <h1>Good {greeting()} 👋</h1>
          <p className="page-date">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
        {profile?.groupId && (
          <InviteButton groupId={profile.groupId} />
        )}
      </div>

      {/* Stat tiles */}
      <div className="card-grid" style={{ marginBottom: '1.5rem' }}>
        <Link to="/routines" style={{ textDecoration: 'none' }}>
          <div className="card stat-tile">
            <span className="stat-label">✅ Routines</span>
            <span className="stat-value" style={{ color: 'var(--accent3)' }}>
              {loading ? '—' : `${stats.routinesDone}/${stats.routinesTotal}`}
            </span>
            <div className="progress-bar" style={{ marginTop: 4 }}>
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </Link>

        <Link to="/health" style={{ textDecoration: 'none' }}>
          <div className="card stat-tile">
            <span className="stat-label">🔥 Calories</span>
            <span className="stat-value" style={{ color: 'var(--accent2)' }}>
              {loading ? '—' : stats.calories.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>kcal today</span>
          </div>
        </Link>

        <Link to="/expenses" style={{ textDecoration: 'none' }}>
          <div className="card stat-tile">
            <span className="stat-label">💸 Spent</span>
            <span className="stat-value" style={{ color: 'var(--accent)' }}>
              {loading ? '—' : `₹${stats.spent.toLocaleString('en-IN')}`}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>today</span>
          </div>
        </Link>

        <div className="card stat-tile" style={{ cursor: 'default' }}>
          <span className="stat-label">📅 Date</span>
          <span className="stat-value" style={{ fontSize: '1.1rem' }}>
            {format(new Date(), 'MMM d')}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {format(new Date(), 'yyyy')}
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Quick links</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <Link to="/routines" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
            ✅ &nbsp; Check off today's routines
          </Link>
          <Link to="/health" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
            🥗 &nbsp; Log a meal or weight
          </Link>
          <Link to="/expenses" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
            💳 &nbsp; View today's expenses
          </Link>
        </div>
      </div>

      {/* Group invite section */}
      {profile?.groupId && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Your group</span>
          </div>
          <div className="invite-box">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Group ID — share this invite link with your partner:</span>
            <span className="invite-code">{profile.groupId}</span>
            <a
              className="btn btn-ghost btn-sm"
              style={{ width: 'fit-content' }}
              href={`${window.location.origin}/signup?group=${profile.groupId}`}
              onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(`${window.location.origin}/signup?group=${profile.groupId}`) }}
            >
              📋 Copy invite link
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function InviteButton({ groupId }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(`${window.location.origin}/signup?group=${groupId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button className="btn btn-ghost btn-sm" onClick={copy}>
      {copied ? '✓ Copied' : '🔗 Invite'}
    </button>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
