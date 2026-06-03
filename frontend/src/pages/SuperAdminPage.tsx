import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  ShieldAlert, Building2, Zap, Loader2, CheckCircle2, X,
  ToggleLeft, ToggleRight, Search, ChevronDown,
} from 'lucide-react'

// ---- Types ----
interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  activeUsers: number
  createdAt: string
  status: 'ACTIVE' | 'INACTIVE'
}

interface SuperUser {
  id: string
  firstName: string
  lastName: string
  email: string
  tenantName: string
  tenantId: string
  role?: string
  isActive: boolean
  isSuperAdmin: boolean
  lastLogin?: string
}

function Toast({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  return (
    <div className={`fixed top-6 right-6 z-50 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
      type === 'success' ? 'bg-green-700' : 'bg-red-700'
    }`}>
      <CheckCircle2 size={18} /> {message}
    </div>
  )
}

// ---- 403 card ----
function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-amber-900/20 border border-amber-700 rounded-2xl p-10 max-w-md text-center space-y-4">
        <ShieldAlert size={48} className="text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-amber-400">Acceso denegado</h2>
        <p className="text-amber-200/80 text-sm">
          Solo el super-administrador puede acceder a esta sección.
        </p>
      </div>
    </div>
  )
}

// ---- Plan badge ----
function PlanBadge({ plan }: { plan: string }) {
  const cls: Record<string, string> = {
    FREE: 'bg-gray-700 text-gray-300 border-gray-600',
    STARTER: 'bg-blue-900/60 text-blue-300 border-blue-700',
    PRO: 'bg-indigo-900/60 text-indigo-300 border-indigo-700',
    ENTERPRISE: 'bg-purple-900/60 text-purple-300 border-purple-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls[plan] ?? cls.FREE}`}>
      {plan}
    </span>
  )
}

// ---- Status badge ----
function StatusBadge({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
      status === 'ACTIVE'
        ? 'bg-green-900/60 text-green-300 border-green-700'
        : 'bg-red-900/60 text-red-300 border-red-700'
    }`}>
      {status === 'ACTIVE' ? 'Activa' : 'Inactiva'}
    </span>
  )
}

// ---- Main page ----
export default function SuperAdminPage() {
  const { user } = useAuth()

  if (!user?.isSuperAdmin) return <AccessDenied />

  return <SuperAdminContent currentUserId={user.id} />
}

function SuperAdminContent({ currentUserId }: { currentUserId: string }) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'usuarios'>('empresas')
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)
  const [filterTenantId, setFilterTenantId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTenants = useCallback(async () => {
    setTenantsLoading(true)
    try {
      const res = await api.get('/super-admin/tenants')
      setTenants(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setTenantsLoading(false)
    }
  }, [])

  useEffect(() => { fetchTenants() }, [fetchTenants])

  const toggleTenant = async (t: Tenant) => {
    try {
      await api.patch(`/super-admin/tenants/${t.id}/toggle`)
      showToast(t.status === 'ACTIVE' ? 'Empresa desactivada' : 'Empresa activada')
      fetchTenants()
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Error al cambiar estado', 'error')
    }
  }

  const handleViewUsers = (tenantId: string) => {
    setFilterTenantId(tenantId)
    setActiveTab('usuarios')
  }

  // Stats
  const totalEmpresas = tenants.length
  const activas = tenants.filter(t => t.status === 'ACTIVE').length
  const planCounts = tenants.reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast message={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-900/40 border border-amber-700 flex items-center justify-center">
          <ShieldAlert size={20} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Super Admin <span className="text-amber-400">⚡</span>
          </h1>
          <p className="text-gray-400 text-sm">Panel de administración global del sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['empresas', 'usuarios'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'empresas' ? 'Empresas' : 'Todos los Usuarios'}
          </button>
        ))}
      </div>

      {/* ---- EMPRESAS TAB ---- */}
      {activeTab === 'empresas' && (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total empresas" value={totalEmpresas} icon={Building2} color="text-amber-400" />
            <StatCard label="Activas" value={activas} icon={CheckCircle2} color="text-green-400" />
            {Object.entries(planCounts).map(([plan, count]) => (
              <StatCard key={plan} label={`Plan ${plan}`} value={count} icon={Zap} color="text-indigo-400" />
            ))}
          </div>

          {/* Table */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {tenantsLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
                <Loader2 size={20} className="animate-spin" /> Cargando empresas...
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">Nombre</th>
                    <th className="text-left px-6 py-3">Slug</th>
                    <th className="text-left px-6 py-3">Plan</th>
                    <th className="text-left px-6 py-3">Usuarios</th>
                    <th className="text-left px-6 py-3">Creación</th>
                    <th className="text-left px-6 py-3">Estado</th>
                    <th className="text-left px-6 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-gray-700/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-900/40 border border-amber-700/50 flex items-center justify-center">
                            <Building2 size={14} className="text-amber-400" />
                          </div>
                          <span className="text-white text-sm font-medium">{t.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm font-mono">{t.slug}</td>
                      <td className="px-6 py-4"><PlanBadge plan={t.plan} /></td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{t.activeUsers ?? 0}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString('es-CO') : '—'}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={t.status} /></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTenant(t)}
                            title={t.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
                            className={`transition-colors ${
                              t.status === 'ACTIVE'
                                ? 'text-green-400 hover:text-red-400'
                                : 'text-gray-500 hover:text-green-400'
                            }`}
                          >
                            {t.status === 'ACTIVE' ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                          </button>
                          <button
                            onClick={() => handleViewUsers(t.id)}
                            className="text-xs text-amber-400 hover:text-amber-300 border border-amber-700/50 hover:border-amber-500 px-2 py-1 rounded transition-colors"
                          >
                            Ver usuarios
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">No hay empresas registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ---- USUARIOS TAB ---- */}
      {activeTab === 'usuarios' && (
        <UsersTab
          tenants={tenants}
          initialTenantFilter={filterTenantId}
          currentUserId={currentUserId}
          showToast={showToast}
        />
      )}
    </div>
  )
}

// ---- Stat card ----
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center gap-3">
        <Icon size={20} className={color} />
        <div>
          <p className="text-xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ---- Users tab ----
function UsersTab({
  tenants, initialTenantFilter, currentUserId, showToast,
}: {
  tenants: Tenant[]
  initialTenantFilter: string | null
  currentUserId: string
  showToast: (msg: string, type?: 'success' | 'error') => void
}) {
  const [users, setUsers] = useState<SuperUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tenantFilter, setTenantFilter] = useState(initialTenantFilter ?? '')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/super-admin/users')
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // Sync if parent changes the filter
  useEffect(() => {
    if (initialTenantFilter) setTenantFilter(initialTenantFilter)
  }, [initialTenantFilter])

  const toggleSuperAdmin = async (u: SuperUser) => {
    try {
      await api.patch(`/super-admin/users/${u.id}/toggle-superadmin`)
      showToast(u.isSuperAdmin ? 'Super-admin revocado' : 'Super-admin concedido')
      fetchUsers()
    } catch (err: any) {
      showToast(err.response?.data?.message ?? 'Error al cambiar super-admin', 'error')
    }
  }

  const filtered = users.filter(u => {
    const matchSearch =
      !search ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchTenant = !tenantFilter || u.tenantId === tenantFilter
    return matchSearch && matchTenant
  })

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative min-w-52">
          <select
            className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-8 text-white text-sm focus:outline-none focus:border-amber-500"
            value={tenantFilter}
            onChange={e => setTenantFilter(e.target.value)}
          >
            <option value="">Todas las empresas</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {tenantFilter && (
          <button
            onClick={() => setTenantFilter('')}
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 border border-amber-700/50 px-3 py-2 rounded-lg transition-colors"
          >
            <X size={12} /> Quitar filtro
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 size={20} className="animate-spin" /> Cargando usuarios...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Nombre</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Empresa</th>
                <th className="text-left px-6 py-3">Rol</th>
                <th className="text-left px-6 py-3">Activo</th>
                <th className="text-left px-6 py-3">Último login</th>
                <th className="text-left px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <span className="text-white text-sm font-medium">{u.firstName} {u.lastName}</span>
                        {u.isSuperAdmin && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-900/50 text-amber-300 border border-amber-700">
                            ⚡ Super Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300 text-sm">{u.email}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{u.tenantName}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">{u.role ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      u.isActive
                        ? 'bg-green-900/60 text-green-300 border-green-700'
                        : 'bg-gray-700 text-gray-400 border-gray-600'
                    }`}>
                      {u.isActive ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => toggleSuperAdmin(u)}
                        title={u.isSuperAdmin ? 'Revocar super-admin' : 'Hacer super-admin'}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          u.isSuperAdmin
                            ? 'text-amber-400 border-amber-700/50 hover:border-red-500 hover:text-red-400'
                            : 'text-gray-400 border-gray-600 hover:border-amber-500 hover:text-amber-400'
                        }`}
                      >
                        {u.isSuperAdmin ? '⚡ Revocar' : 'Hacer ⚡'}
                      </button>
                    )}
                    {u.id === currentUserId && (
                      <span className="text-xs text-gray-600 italic">Tú</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    {users.length === 0 ? 'No hay usuarios' : 'Sin resultados para los filtros aplicados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-gray-500 text-right">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''} mostrado{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  )
}
