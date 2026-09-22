import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import '../CSS/sidebar.css'

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard',     label: 'Dashboard',     emoji: '📊' },
      { path: '/analytics',     label: 'Analytics',     emoji: '📈' },
    ],
  },
  {
    label: 'Money',
    items: [
      { path: '/income',        label: 'Income',        emoji: '💰' },
      { path: '/expenses',      label: 'Expenses',      emoji: '💸' },
      { path: '/transactions',  label: 'Transactions',  emoji: '🔄' },
      { path: '/budget',        label: 'Budget',        emoji: '🎯' },
    ],
  },
  {
    label: 'Wealth',
    items: [
      { path: '/savings',       label: 'Savings',       emoji: '🏦' },
      { path: '/investments',   label: 'Investments',   emoji: '📉' },
      { path: '/emi',           label: 'EMI / Loans',   emoji: '🏠' },
      { path: '/emergency',     label: 'Emergency',     emoji: '🚨' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/notifications', label: 'Notifications', emoji: '🔔', badge: true },
      { path: '/profile',       label: 'Profile',       emoji: '👤' },
    ],
  },
]

function SidebarContent({ notifCount, onLinkClick, handleLogout }) {
  return (
    <>
      <div className="sidebar__brand">
        <div className="sidebar__logo-mark">SF</div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-name">SmartFinance</span>
          <span className="sidebar__brand-tag">Personal</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_SECTIONS.map((section) => (
          <div className="sidebar__section" key={section.label}>
            <span className="sidebar__section-label">{section.label}</span>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onLinkClick}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
              >
                <span className="sidebar__item-icon">{item.emoji}</span>
                <span className="sidebar__item-label">{item.label}</span>
                {item.badge && notifCount > 0 && (
                  <span className="sidebar__badge">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">U</div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">My Account</span>
            <span className="sidebar__user-role">Personal Finance</span>
          </div>
        </div>
        <button className="sidebar__logout" onClick={handleLogout}>
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </>
  )
}

function Sidebar({ notifCount = 0 }) {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    navigate('/', { replace: true })
  }

  return (
    <>
      {/* Desktop sidebar — always visible, no collapse */}
      <aside className="sidebar sidebar--desktop">
        <SidebarContent
          notifCount={notifCount}
          onLinkClick={undefined}
          handleLogout={handleLogout}
        />
      </aside>

      {/* Mobile topbar */}
      <header className="mobile-topbar">
        <button
          className="mobile-topbar__hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span /><span /><span />
        </button>
        <div className="mobile-topbar__brand">
          <div className="sidebar__logo-mark" style={{ width: 28, height: 28, fontSize: 11 }}>SF</div>
          <span className="sidebar__brand-name">SmartFinance</span>
        </div>
        <NavLink to="/notifications" className="mobile-topbar__notif" style={{ position: 'relative' }}>
          🔔
          {notifCount > 0 && (
            <span className="sidebar__badge" style={{ position: 'absolute', top: -4, right: -4 }}>
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </NavLink>
      </header>

      {/* Overlay */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`sidebar sidebar--mobile ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        <button
          className="mobile-drawer__close"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>
        <SidebarContent
          notifCount={notifCount}
          onLinkClick={() => setMobileOpen(false)}
          handleLogout={handleLogout}
        />
      </aside>
    </>
  )
}

export default Sidebar