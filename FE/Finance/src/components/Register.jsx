import '../CSS/login.css'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../api'

function Register() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const validate = () => {
    const { username, email, password, confirmPassword } = formData
    if (!username || !email || !password || !confirmPassword)
      return 'Please fill in all fields'
    if (username.length < 3)
      return 'Username must be at least 3 characters'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return 'Please enter a valid email address'
    if (password.length < 6)
      return 'Password must be at least 6 characters'
    if (password !== confirmPassword)
      return 'Passwords do not match'
    return null
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const error = validate()
    if (error) {
      setMessage({ text: error, type: 'error' })
      return
    }

    setIsLoading(true)
    setMessage({ text: '', type: '' })

    try {
      const { username, email, password } = formData
      const response = await registerUser({ username, email, password })
      const tokens = response?.data || response

      if (tokens?.access && tokens?.refresh) {
        localStorage.setItem('accessToken', tokens.access)
        localStorage.setItem('refreshToken', tokens.refresh)
        navigate('/dashboard', { replace: true })
        return
      }

      setMessage({ text: response?.message || 'Registration successful', type: 'success' })
    } catch (error) {
      setMessage({ text: error.message || 'Registration failed', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const fields = [
    { name: 'username',        label: 'Username',         type: 'text',     placeholder: 'Enter username',        autoComplete: 'username' },
    { name: 'email',           label: 'Email',            type: 'email',    placeholder: 'Enter email',           autoComplete: 'email' },
    { name: 'password',        label: 'Password',         type: 'password', placeholder: 'Enter password',        autoComplete: 'new-password' },
    { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: 'Confirm your password', autoComplete: 'new-password' },
  ]

  return (
    <div className="login-container">
      <div className="login-box">

        <h1>Finance Tracker</h1>
        <p className="login-subtitle">Create your account</p>

        <form onSubmit={handleSubmit}>
          {fields.map((field, i) => (
            <div className="input-group" key={field.name}>
              <label htmlFor={field.name}>{field.label}</label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                placeholder={field.placeholder}
                value={formData[field.name]}
                onChange={handleChange}
                autoComplete={field.autoComplete}
                autoFocus={i === 0}
              />
            </div>
          ))}

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>

          {message.text && (
            <p className={`message ${message.type}`}>
              {message.text}
            </p>
          )}
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/">Sign in</Link>
        </p>

      </div>
    </div>
  )
}

export default Register