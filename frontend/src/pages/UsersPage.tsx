import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  Users, UserPlus, Pencil, Key, UserCheck, UserX, X, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck,
} from 'lucide-react'

const inputCls =
  'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-900/60 text-red-300 border border-red-700',
  PROJECT_MANAGER: 'bg-blue-900/60 text-blue-300 border border-blue-700',
  ACCOUNTANT: 'bg-purple-900/60 text-purple-300 border border-purple-700',
  PAYROLL_MANAGER: 'bg-green-900/60 text-green-300 border border-green-700',
  VIEWER: 'bg-gray-700 text-gray-300 border border-gray-600',
}
const roleBadge = (role: string) =>
  `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[role] ?? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700'}`

// Full permission catalogue
const ALL_PERMISSIONS: { group: string; perms: { label: string; value: string }[] }[] = [
  { group: 'Usuarios', perms: [
    { label: 'Ver usuarios', value: 'user:read' },
    { label: 'Gestionar usuarios', value: 'user:write' },
  ]},
  { group: 'Cuentas', perms: [
    { label: 'Ver cuentas', value: 'account:read' },
    { label: 'Gestionar cuentas', value: 'account:write' },
  ]},
  { group: 'Asientos contables', perms: [
    { label: 'Ver asientos', value: 'journal:read' },
    { label: 'Crear asientos', value: 'journal:write' },
    { label: 'Contabilizar asientos', value: 'journal:post' },
    { label: 'Anular asientos', value: 'journal:void' },
  ]},
  { group: 'Inventario', perms: [
    { label: 'Ver inventario', value: 'inventory:read' },
    { label: 'Gestionar inventario', value: 'inventory:write' },
  ]},
  { group: 'Clientes', perms: [
    { label: 'Ver clientes', value: 'customer:read' },
    { label: 'Gestionar clientes', value: 'customer:write' },
  ]},
  { group: 'Facturas', perms: [
    { label: 'Ver facturas', value: 'invoice:read' },
    { label: 'Crear facturas', value: 'invoice:write' },
    { label: 'Emitir facturas', value: 'invoice:issue' },
  ]},
  { group: 'IA', perms: [
    { label: 'Usar IA', value: 'ai:use' },
  ]},
  { group: 'Proyectos', perms: [
    { label: 'Ver proyectos', value: 'project:read' },
    { label: 'Gestionar proyectos', value: 'project:write' },
    { label: 'Eliminar proyectos', value: 'project:delete' },
  ]},
  { group: 'APU', perms: [
    { label: 'Ver APU', value: 'apu:read' },
    { label: 'Gestionar APU', value: 'apu:write' },
  ]},
  { group: 'Presupuestos', perms: [
    { label: 'Ver presupuestos', value: 'budget:read' },
    { label: 'Gestionar presupuestos', value: 'budget:write' },
    { label: 'Aprobar presupuestos', value: 'budget:approve' },
  ]},
  { group: 'Actas', perms: [
    { label: 'Ver actas', value: 'certificate:read' },
    { label: 'Crear actas', value: 'certificate:write' },
    { label: 'Aprobar actas', value: 'certificate:approve' },
    { label: 'Pagar actas', value: 'certificate:pay' },
  ]},
  { group: 'Liquidación', perms: [
    { label: 'Ver liquidación', value: 'liquidation:read' },
    { label: 'Crear liquidación', value: 'liquidation:write' },
    { label: 'Finalizar liquidación', value: 'liquidation:finalize' },
  ]},
  { group: 'Nómina', perms: [
    { label: 'Ver nómina', value: 'payroll:read' },
    { label: 'Gestionar nómina', value: 'payroll:write' },
    { label: 'Aprobar nómina', value: 'payroll:approve' },
    { label: 'Pagar nómina', value: 'payroll:pay' },
  ]},
  { group: 'SECOP', perms: [
    { label: 'Buscar SECOP', value: 'secop:search' },
  ]},
  { group: 'PDF', perms: [
    { label: 'Generar PDFs', value: 'pdf:generate' },
  ]},
]

interface Role { id: string; name: string; permissions?: string[] }
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role?: { name: string; permissions?: string[] }
  roleId?: string
  isActive: boolean
  createdAt: string
  customPermissions?: string[]
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`bg-gray-800 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 bg-green-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
      <CheckCircle2 size={18} /> {message}
    </div>
  )
}

export default function UsersPage() {
  const { tenant } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // modals
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [resetUser, setResetUser] = useState<User | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([api.get('/users'), api.get('/roles')])
      setUsers(usersRes.data)
      setRoles(rolesRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const toggleActive = async (user: User) => {
    try {
      await api.patch(`/users/${user.id}/${user.isActive ? 'deactivate' : 'activate'}`)
      showToast(user.isActive ? 'Usuario desactivado' : 'Usuario activado')
      fetchAll()
    } catch (err: any) {
      console.error(err)
    }
  }

  const activeCount = users.filter(u => u.isActive).length
  const roleCount = new Set(users.map(u => u.role?.name).filter(Boolean)).size

  return (
    <div className="p-6 space-y-6">
      {toast && <Toast message={toast} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-gray-400 text-sm mt-1">Administra los usuarios de tu empresa</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <UserPlus size={18} /> Invitar Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total usuarios', value: users.length, icon: Users, color: 'text-indigo-400' },
          { label: 'Usuarios activos', value: activeCount, icon: UserCheck, color: 'text-green-400' },
          { label: 'Roles en uso', value: roleCount, icon: Key, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center gap-3">
              <s.icon size={22} className={s.color} />
              <div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
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
                <th className="text-left px-6 py-3">Rol</th>
                <th className="text-left px-6 py-3">Estado</th>
                <th className="text-left px-6 py-3">Ingreso</th>
                <th className="text-left px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-white text-xs font-semibold">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <span className="text-white text-sm font-medium">{u.firstName} {u.lastName}</span>
                        {(u.customPermissions?.length ?? 0) > 0 && (
                          <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700">
                            <ShieldCheck size={10} /> +{u.customPermissions!.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300 text-sm">{u.email}</td>
                  <td className="px-6 py-4">
                    {u.role?.name && <span className={roleBadge(u.role.name)}>{u.role.name}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.isActive ? 'bg-green-900/60 text-green-300 border border-green-700' : 'bg-gray-700 text-gray-400 border border-gray-600'
                    }`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditUser(u)}
                        title="Editar" className="text-gray-400 hover:text-indigo-400 transition-colors">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => toggleActive(u)}
                        title={u.isActive ? 'Desactivar' : 'Activar'}
                        className={`transition-colors ${u.isActive ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-green-400'}`}>
                        {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                      <button onClick={() => setResetUser(u)}
                        title="Resetear contraseña" className="text-gray-400 hover:text-yellow-400 transition-colors">
                        <Key size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">No hay usuarios registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <InviteModal
          roles={roles}
          tenantId={tenant?.id ?? ''}
          onClose={() => setShowInvite(false)}
          onSuccess={() => { setShowInvite(false); fetchAll(); showToast('Usuario invitado correctamente') }}
        />
      )}

      {/* Edit Modal */}
      {editUser && (
        <EditUserModal
          user={editUser}
          roles={roles}
          onClose={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); fetchAll(); showToast('Usuario actualizado') }}
        />
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSuccess={() => { setResetUser(null); showToast('Contraseña restablecida') }}
        />
      )}
    </div>
  )
}

// ---- Sub-modals ----

function InviteModal({ roles, tenantId, onClose, onSuccess }: {
  roles: Role[]; tenantId: string; onClose: () => void; onSuccess: () => void
}) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', roleId: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 8) { setError('La contraseña debe tener mínimo 8 caracteres'); return }
    setLoading(true)
    try {
      await api.post('/users', { ...form, tenantId, confirmPassword: undefined })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  const f = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  return (
    <Modal title="Invitar Usuario" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nombre *</label>
            <input className={inputCls} placeholder="Juan" value={form.firstName} onChange={f('firstName')} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Apellido *</label>
            <input className={inputCls} placeholder="Pérez" value={form.lastName} onChange={f('lastName')} required />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Email *</label>
          <input type="email" className={inputCls} placeholder="usuario@empresa.com" value={form.email} onChange={f('email')} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña temporal *</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} className={inputCls + ' pr-10'}
              placeholder="••••••••" value={form.password} onChange={f('password')} required />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Confirmar contraseña *</label>
          <input type="password" className={inputCls} placeholder="••••••••"
            value={form.confirmPassword} onChange={f('confirmPassword')} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Rol *</label>
          <select className={inputCls} value={form.roleId} onChange={f('roleId')} required>
            <option value="">Seleccionar rol...</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : 'Invitar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ---- EditUserModal with tabs ----

function EditUserModal({ user, roles, onClose, onSuccess }: {
  user: User; roles: Role[]; onClose: () => void; onSuccess: () => void
}) {
  const [activeTab, setActiveTab] = useState<'datos' | 'permisos'>('datos')

  // Tab 1 state
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    roleId: user.roleId ?? '',
  })
  const [formError, setFormError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  // Tab 2 state
  const [rolePerms, setRolePerms] = useState<string[]>([])
  const [customPerms, setCustomPerms] = useState<string[]>(user.customPermissions ?? [])
  const [permsLoading, setPermsLoading] = useState(false)
  const [permsError, setPermsError] = useState('')
  const [permsSaving, setPermsSaving] = useState(false)

  // Load role permissions when tab switches or roleId changes
  useEffect(() => {
    if (activeTab !== 'permisos') return
    const selectedRole = roles.find(r => r.id === form.roleId)
    if (selectedRole?.permissions) {
      setRolePerms(selectedRole.permissions)
      return
    }
    if (!form.roleId) { setRolePerms([]); return }
    setPermsLoading(true)
    api.get(`/roles/${form.roleId}`)
      .then(res => setRolePerms(res.data.permissions ?? []))
      .catch(() => setRolePerms([]))
      .finally(() => setPermsLoading(false))
  }, [activeTab, form.roleId, roles])

  const submitDatos = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      await api.put(`/users/${user.id}`, form)
      onSuccess()
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Error al actualizar usuario')
    } finally {
      setFormLoading(false)
    }
  }

  const submitPermisos = async () => {
    setPermsSaving(true)
    setPermsError('')
    try {
      await api.put(`/users/${user.id}/permissions`, { customPermissions: customPerms })
      onSuccess()
    } catch (err: any) {
      setPermsError(err.response?.data?.message ?? 'Error al guardar permisos')
    } finally {
      setPermsSaving(false)
    }
  }

  const toggleCustomPerm = (perm: string) => {
    if (rolePerms.includes(perm)) return // role perms are locked
    setCustomPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  const effectivePerms = Array.from(new Set([...rolePerms, ...customPerms]))

  return (
    <Modal title={`Editar Usuario — ${user.firstName} ${user.lastName}`} onClose={onClose} wide>
      {/* Tabs */}
      <div className="flex border-b border-gray-700 mb-5 -mt-1">
        {(['datos', 'permisos'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'datos' ? 'Datos' : 'Permisos extra'}
          </button>
        ))}
      </div>

      {/* Tab 1: Datos */}
      {activeTab === 'datos' && (
        <form onSubmit={submitDatos} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nombre *</label>
              <input className={inputCls} value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Apellido *</label>
              <input className={inputCls} value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Rol</label>
            <select className={inputCls} value={form.roleId}
              onChange={e => setForm(p => ({ ...p, roleId: e.target.value }))}>
              <option value="">Sin rol</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={formLoading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2">
              {formLoading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar datos'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Permisos extra */}
      {activeTab === 'permisos' && (
        <div className="space-y-4">
          {permsLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
              <Loader2 size={18} className="animate-spin" /> Cargando permisos del rol...
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">
                Los permisos del rol aparecen marcados y bloqueados <span className="text-gray-500">(del rol)</span>. Puedes añadir permisos extra individualmente.
              </p>

              <div className="max-h-72 overflow-y-auto space-y-4 pr-1">
                {ALL_PERMISSIONS.map(group => (
                  <div key={group.group}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.group}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {group.perms.map(p => {
                        const fromRole = rolePerms.includes(p.value)
                        const isCustom = customPerms.includes(p.value)
                        const checked = fromRole || isCustom
                        return (
                          <label
                            key={p.value}
                            className={`flex items-center gap-2 cursor-pointer ${fromRole ? 'opacity-60' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={fromRole}
                              onChange={() => toggleCustomPerm(p.value)}
                              className="w-3.5 h-3.5 rounded border-gray-500 accent-indigo-500 disabled:cursor-not-allowed"
                            />
                            <span className="text-sm text-gray-300">{p.label}</span>
                            {fromRole && (
                              <span className="text-xs text-gray-500 italic">(rol)</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Effective permissions summary */}
              <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                <p className="text-xs font-semibold text-gray-400 mb-2">
                  Permisos efectivos ({effectivePerms.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {effectivePerms.length === 0 ? (
                    <span className="text-xs text-gray-500 italic">Ninguno</span>
                  ) : effectivePerms.map(p => (
                    <span key={p} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono ${
                      rolePerms.includes(p)
                        ? 'bg-gray-700 text-gray-400'
                        : 'bg-indigo-900/60 text-indigo-300 border border-indigo-700'
                    }`}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {permsError && <p className="text-red-400 text-xs">{permsError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
                  Cancelar
                </button>
                <button onClick={submitPermisos} disabled={permsSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2">
                  {permsSaving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Guardar permisos'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

function ResetPasswordModal({ user, onClose, onSuccess }: {
  user: User; onClose: () => void; onSuccess: () => void
}) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return }
    setLoading(true)
    try {
      await api.post(`/users/${user.id}/reset-password`, { password })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al resetear contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Resetear contraseña — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Nueva contraseña *</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className={inputCls + ' pr-10'}
              placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="button" onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Reseteando...</> : 'Resetear'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
