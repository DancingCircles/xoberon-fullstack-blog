import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'
import './AdminSidebar.css'

const navItems = [
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/admin/reviews',
    label: 'Content Review',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Users',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/admin/contacts',
    label: 'Contacts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
]

export default function AdminSidebar() {
  const location = useLocation()
  const { currentUser } = useAuth()

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__header">
        <Link to="/" className="admin-sidebar__logo">
          <span className="admin-sidebar__logo-brand">XOberon</span>
          <span className="admin-sidebar__logo-badge">ADMIN</span>
        </Link>
      </div>

      <nav className="admin-sidebar__nav">
        {navItems.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`admin-sidebar__link ${location.pathname === item.to ? 'admin-sidebar__link--active' : ''}`}
          >
            <span className="admin-sidebar__link-icon">{item.icon}</span>
            <span className="admin-sidebar__link-label">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <Link to="/home" className="admin-sidebar__back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12,19 5,12 12,5" />
          </svg>
          <span>Back to Site</span>
        </Link>
        {currentUser && (
          <div className="admin-sidebar__user">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="admin-sidebar__user-avatar"
            />
            <div className="admin-sidebar__user-info">
              <span className="admin-sidebar__user-name">{currentUser.name}</span>
              <span className="admin-sidebar__user-role">{currentUser.role}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
