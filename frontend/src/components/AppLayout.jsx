import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Car, LayoutGrid, LogOut, Menu, Settings2, ShieldCheck, X } from 'lucide-react'

import { useAuth } from '../context/AuthContext'

function Brand({ onClick }) {
  return (
    <Link to="/" onClick={onClick} className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
        <Car size={18} className="text-blue-400" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-tight text-slate-900">Apex Motors</span>
        <span className="block text-[11px] font-medium text-slate-500">Inventory system</span>
      </span>
    </Link>
  )
}

function NavItems({ isAdmin, onNavigate }) {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <nav className="space-y-1" aria-label="Main navigation">
      <NavLink to="/" end className={linkClass} onClick={onNavigate}>
        <LayoutGrid size={18} aria-hidden="true" />
        Inventory
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={linkClass} onClick={onNavigate}>
          <Settings2 size={18} aria-hidden="true" />
          Manage inventory
        </NavLink>
      )}
    </nav>
  )
}

function UserPanel({ user, isAdmin, onLogout }) {
  const initials = (user?.name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  return (
    <div className="border-t border-slate-200 pt-4">
      <div className="flex items-center gap-3 px-1">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600
                     text-xs font-bold text-white"
          aria-hidden="true"
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>
      <p className="mt-2 px-1">
        {isAdmin ? (
          <span className="badge bg-blue-50 text-blue-700">
            <ShieldCheck size={12} aria-hidden="true" />
            Administrator
          </span>
        ) : (
          <span className="badge bg-slate-100 text-slate-600">Customer</span>
        )}
      </p>
      <button type="button" onClick={onLogout} className="btn-secondary mt-3 w-full">
        <LogOut size={16} aria-hidden="true" />
        Sign out
      </button>
    </div>
  )
}

export default function AppLayout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200
                   bg-white/90 px-4 py-3 backdrop-blur lg:hidden"
      >
        <Brand onClick={() => setMobileNavOpen(false)} />
        <button
          type="button"
          onClick={() => setMobileNavOpen((open) => !open)}
          className="btn-ghost p-2"
          aria-expanded={mobileNavOpen}
          aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
      </header>

      {mobileNavOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
          <NavItems isAdmin={isAdmin} onNavigate={() => setMobileNavOpen(false)} />
          <UserPanel user={user} isAdmin={isAdmin} onLogout={handleLogout} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r
                   border-slate-200 bg-white px-4 py-5 lg:flex"
      >
        <div>
          <Brand />
          <div className="mt-7">
            <NavItems isAdmin={isAdmin} />
          </div>
        </div>
        <UserPanel user={user} isAdmin={isAdmin} onLogout={handleLogout} />
      </aside>

      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
