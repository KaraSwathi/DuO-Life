import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(form.email, form.password)
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
          <h1>DuoLife</h1>
          <p>Your shared daily tracker</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <div className="card form-stack">
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
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-link-row">
          No account yet?&nbsp;<Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  )
}

function friendlyError(code) {
  const map = {
    'auth/user-not-found':   'No account found with that email.',
    'auth/wrong-password':   'Incorrect password. Try again.',
    'auth/invalid-email':    'Invalid email address.',
    'auth/too-many-requests':'Too many attempts. Try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}
