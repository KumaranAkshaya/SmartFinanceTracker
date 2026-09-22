import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Login         from './login.jsx'
import Register      from './Register.jsx'
import Sidebar       from './Sidebar.jsx'
import Dashboard     from './Dashboard.jsx'
import Income        from './Income.jsx'
import Expenses      from './Expenses.jsx'
import Budget        from './Budget.jsx'
import Transactions  from './Transactions.jsx'
import Analytics     from './Analytics.jsx'
import Savings       from './Savings.jsx'
import Investments   from './Investments.jsx'
import EMI           from './EMI.jsx'
import Emergency     from './Emergency.jsx'
import Notifications from './Notifications.jsx'
import Profile       from './Profile.jsx'
import { SessionProvider } from './SessionContext.jsx'
import { registerSessionExpiredHandler } from '../api.js'

function isAuthenticated() {
  return Boolean(localStorage.getItem('accessToken'))
}

function PublicRoute({ children }) {
  if (isAuthenticated()) return <Navigate to="/dashboard" replace />
  return children
}

// Registers the session expired handler once the router is mounted
function SessionRegistrar() {
  const navigate = useNavigate()

  useEffect(() => {
    // This is called by api.js when a 401 token error is detected
    // The actual modal is shown by SessionProvider — this just
    // ensures the navigate function is available inside api.js
    registerSessionExpiredHandler(() => {
      // SessionProvider handles showing the modal via triggerExpiry
      // We dispatch a custom event that SessionProvider listens to
      window.dispatchEvent(new Event('session:expired'))
    })
  }, [navigate])

  return null
}

function ProtectedLayout() {
  if (!isAuthenticated()) return <Navigate to="/" replace />
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <SessionRegistrar />
        <Routes>
          {/* Public */}
          <Route path="/"         element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/income"        element={<Income />} />
            <Route path="/expenses"      element={<Expenses />} />
            <Route path="/budget"        element={<Budget />} />
            <Route path="/transactions"  element={<Transactions />} />
            <Route path="/analytics"     element={<Analytics />} />
            <Route path="/savings"       element={<Savings />} />
            <Route path="/investments"   element={<Investments />} />
            <Route path="/emi"           element={<EMI />} />
            <Route path="/emergency"     element={<Emergency />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/profile"       element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  )
}

export default AppRoutes