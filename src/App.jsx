import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage    from './components/auth/LoginPage'
import SignupPage   from './components/auth/SignupPage'
import Dashboard    from './components/Dashboard'
import RoutinesPage from './components/routines/RoutinesPage'
import HealthPage   from './components/health/HealthPage'
import ExpensesPage from './components/expenses/ExpensesPage'
import AppShell     from './components/shared/AppShell'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="splash"><div className="spinner" /></div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <AppShell>
                  <Dashboard />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/routines"
            element={
              <PrivateRoute>
                <AppShell>
                  <RoutinesPage />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/health"
            element={
              <PrivateRoute>
                <AppShell>
                  <HealthPage />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <PrivateRoute>
                <AppShell>
                  <ExpensesPage />
                </AppShell>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
