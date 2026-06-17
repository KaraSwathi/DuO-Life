import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function SignupPage() {
  const { signUp }       = useAuth()
  const navigate         = useNavigate()
  const [params]         = useSearchParams()
  const inviteGroupId    = params.get('group') || null  // ?group=<groupId>

  const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6)       { setError('Password must be at least 6 characters.'); return }

    setLoading(true)
    try {
      await signUp(form.email, form.password, form.name, inviteGroupId)
      navigate('/')
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">💞</span>
          <h1>Create account</h1>
          <p>{inviteGroupId ? '✨ You were invited — joining an existing group.' : 'Start tracking together.'}</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="card form-stack">
            <div className="input-group">
              <label className="input-label">Your name</label>
              <input
                className="input"
                type="text"
                placeholder="Alex"
                value={form.name}
                onChange={set('name')}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                required
                autoComplete="email"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={set('password')}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="input-group">
              <label className="input-label">Confirm password</label>
              <input
                className="input"
                type="password"
                placeholder="Same as above"
                value={form.confirm}
                onChange={set('confirm')}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-link-row">
          Already have an account?&nbsp;<Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/invalid-email':        'Invalid email address.',
    'auth/weak-password':        'Password is too weak.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}
