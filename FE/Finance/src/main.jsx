import React from 'react'
import ReactDOM from 'react-dom/client'
import './CSS/theme.css'
import './CSS/login.css'
import AppRoutes from './components/Routes.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>
)