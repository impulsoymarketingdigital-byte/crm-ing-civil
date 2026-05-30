import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Package, BookOpen,
  BarChart3, Bot, LogOut, Building2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/invoices',    icon: FileText,         label: 'Facturas' },
  { to: '/inventory',   icon: Package,          label: 'Inventario' },
  { to: '/accounts',    icon: BookOpen,         label: 'Cuentas' },
  { to: '/trial-balance', icon: BarChart3,      label: 'Balance' },
  { to: '/ai-ocr',      icon: Bot,              label: 'IA · OCR' },
]

export default function Sidebar() {
  const { tenant, user, logout } = useAuth()

  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{tenant?.name ?? 'NetSuite Clone'}</p>
            <p className="text-xs text-gray-400 capitalize">{tenant?.plan ?? 'free'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
