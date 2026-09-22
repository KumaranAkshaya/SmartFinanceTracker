import '../CSS/login.css'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../api'

function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!username || !password) {
      setMessage({ text: 'Please enter username and password', type: 'error' })
      return
    }

    setIsLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const response = await loginUser({ username, password })
      const tokens = response?.data || response

      if (tokens?.access && tokens?.refresh) {
        localStorage.setItem('accessToken', tokens.access)
        localStorage.setItem('refreshToken', tokens.refresh)
        navigate('/dashboard', { replace: true })
        return
      }

      setMessage({ text: response?.message || 'Login successful', type: 'success' })
    } catch (error) {
      setMessage({ text: error.message || 'Login failed', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">

        <h1>Finance Tracker</h1>
        <p className="login-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>

          {message.text && (
            <p className={`message ${message.type}`}>
              {message.text}
            </p>
          )}
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create account</Link>
        </p>

      </div>
    </div>
  )
}

export default Login