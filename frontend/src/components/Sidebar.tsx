import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Package, BookOpen,
  BarChart3, Bot, LogOut, Building2,
  FolderOpen, Users, Calculator, ClipboardList, DollarSign, Search,
  Truck, Wallet, Landmark, Settings, CreditCard, ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const generalNav = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects',      icon: FolderOpen,       label: 'Proyectos' },
  { to: '/inventory',     icon: Package,          label: 'Inventario' },
  { to: '/payroll',       icon: Users,            label: 'Nómina' },
  { to: '/apu',           icon: Calculator,       label: 'APU' },
  { to: '/budgets',       icon: FileText,         label: 'Presupuestos' },
  { to: '/certificates',  icon: ClipboardList,    label: 'Actas de Avance' },
  { to: '/liquidation',   icon: DollarSign,       label: 'Liquidación' },
  { to: '/secop',         icon: Search,           label: 'SECOP' },
  { to: '/ai-ocr',        icon: Bot,              label: 'IA · OCR' },
]

const contabilidadNav = [
  { to: '/contabilidad',  icon: BookOpen,         label: 'Contabilidad' },
  { to: '/invoices',      icon: FileText,         label: 'Facturas de Venta' },
  { to: '/proveedores',   icon: Truck,            label: 'Proveedores' },
  { to: '/caja',          icon: Wallet,           label: 'Caja Menor' },
  { to: '/impuestos',     icon: Landmark,         label: 'Impuestos' },
  { to: '/accounts',      icon: BookOpen,         label: 'Plan de Cuentas' },
  { to: '/trial-balance', icon: BarChart3,        label: 'Balance' },
]

const adminNav = [
  { to: '/users',         icon: Users,            label: 'Usuarios' },
  { to: '/billing',       icon: CreditCard,       label: 'Facturación' },
  { to: '/settings',      icon: Settings,         label: 'Configuración' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
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
  )
}

export default function Sidebar() {
  const { tenant, user, logout } = useAuth()

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()

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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {generalNav.map(item => <NavItem key={item.to} {...item} />)}

        <div className="pt-4 pb-1">
          <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Contabilidad</p>
        </div>
        {contabilidadNav.map(item => <NavItem key={item.to} {...item} />)}

        {/* Admin section */}
        <div className="pt-4 pb-1">
          <div className="border-t border-gray-800 mb-3" />
          <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Administración</p>
        </div>
        {adminNav.map(item => <NavItem key={item.to} {...item} />)}

        {/* Super Admin link — only visible to super admins */}
        {user?.isSuperAdmin && (
          <NavLink
            to="/super-admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber-900/40 text-amber-400 border border-amber-700'
                  : 'text-amber-400/70 hover:bg-amber-900/20 hover:text-amber-400 border border-transparent hover:border-amber-700/50'
              }`
            }
          >
            <ShieldAlert size={18} />
            Super Admin ⚡
          </NavLink>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-800 space-y-3">
        {/* Company + user info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initials || <Users size={14} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{tenant?.name}</p>
          </div>
          <button onClick={logout} className="ml-auto text-gray-400 hover:text-red-400 transition-colors shrink-0" title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
