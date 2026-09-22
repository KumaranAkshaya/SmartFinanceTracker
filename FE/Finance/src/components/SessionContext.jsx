import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SessionExpired from './SessionExpired.jsx'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [expired, setExpired] = useState(false)

  // Listen for the custom event fired by api.js
  useEffect(() => {
    const handler = () => setExpired(true)
    window.addEventListener('session:expired', handler)
    return () => window.removeEventListener('session:expired', handler)
  }, [])

  const clearExpiry = useCallback(() => {
    setExpired(false)
  }, [])

  return (
    <SessionContext.Provider value={{}}>
      {children}
      {expired && <SessionExpired onClose={clearExpiry} />}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}