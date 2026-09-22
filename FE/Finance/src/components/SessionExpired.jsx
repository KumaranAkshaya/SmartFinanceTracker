import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import '../CSS/session.css'

function SessionExpired({ onClose }) {
  const navigate = useNavigate()

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleLogin = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    onClose()
    navigate('/', { replace: true })
  }

  return (
    <div className="session-overlay">

      {/* Blurred backdrop — blocks all clicks */}
      <div className="session-backdrop" />

      {/* Modal */}
      <div className="session-modal" role="alertdialog" aria-modal="true" aria-labelledby="session-title">

        {/* Icon */}
        <div className="session-icon-wrap">
          <div className="session-icon-ring" />
          <div className="session-icon-ring session-icon-ring--2" />
          <span className="session-icon">🔒</span>
        </div>

        {/* Text */}
        <h2 className="session-title" id="session-title">Session Expired</h2>
        <p className="session-desc">
          Your session has timed out for security reasons.<br />
          Please sign in again to continue.
        </p>

        {/* Meta info */}
        <div className="session-info-row">
          <div className="session-info-item">
            <span className="session-info-label">Status</span>
            <span className="session-info-value session-info-value--red">● Expired</span>
          </div>
          <div className="session-info-divider" />
          <div className="session-info-item">
            <span className="session-info-label">Action Required</span>
            <span className="session-info-value">Re-authenticate</span>
          </div>
        </div>

        {/* CTA */}
        <button className="session-btn" onClick={handleLogin}>
          <span>Sign In Again</span>
          <span className="session-btn-arrow">→</span>
        </button>

        <p className="session-note">
          Your data is safe. You'll be redirected to the login page.
        </p>

      </div>
    </div>
  )
}

export default SessionExpired