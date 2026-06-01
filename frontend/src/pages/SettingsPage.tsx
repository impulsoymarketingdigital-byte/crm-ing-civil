import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  User, Building2, Shield, Eye, EyeOff, Loader2, CheckCircle2,
  Copy, Check, Plus, X,
} from 'lucide-react'

const inputCls =
  'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm'
const readonlyCls =
  'w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm cursor-default select-all'

type Tab = 'profile' | 'company' | 'roles'

interface Role { id: string; name: string; permissions: string[] }

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed top-6 right-6 z-50 bg-green-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
      <CheckCircle2 size={18} /> {message}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ---- Profile Tab ----
function ProfileTab() {
  const { user } = useAuth()
  const [form, setForm] = useState({ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' })
  const [saving, setSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState({ cur: false, nw: false, cf: false })
  const [changingPwd, setChangingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setProfileMsg(null)
    try {
      await api.put('/auth/profile', form)
      setProfileMsg({ type: 'ok', text: 'Perfil actualizado correctamente' })
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.response?.data?.message ?? 'Error al guardar' })
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdMsg({ type: 'err', text: 'Las contraseñas no coinciden' }); return
    }
    if (pwd.newPassword.length < 8) {
      setPwdMsg({ type: 'err', text: 'La contraseña debe tener mínimo 8 caracteres' }); return
    }
    setChangingPwd(true)
    setPwdMsg(null)
    try {
      await api.post('/auth/change-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword })
      setPwdMsg({ type: 'ok', text: 'Contraseña cambiada correctamente' })
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      setPwdMsg({ type: 'err', text: err.response?.data?.message ?? 'Error al cambiar contraseña' })
    } finally {
      setChangingPwd(false)
    }
  }

  const pwdField = (field: 'cur' | 'nw' | 'cf', key: keyof typeof pwd, placeholder: string) => (
    <div className="relative">
      <input
        type={showPwd[field] ? 'text' : 'password'}
        className={inputCls + ' pr-10'}
        placeholder={placeholder}
        value={pwd[key]}
        onChange={e => setPwd(p => ({ ...p, [key]: e.target.value }))}
        required
      />
      <button type="button" onClick={() => setShowPwd(p => ({ ...p, [field]: !p[field] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
        {showPwd[field] ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )

  return (
    <div className="space-y-8 max-w-lg">
      {/* Profile info */}
      <form onSubmit={saveProfile} className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center text-white font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-white font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Nombre</label>
            <input className={inputCls} value={form.firstName}
              onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Apellido</label>
            <input className={inputCls} value={form.lastName}
              onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} required />
          </div>
        </div>
        {profileMsg && (
          <p className={`text-xs ${profileMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{profileMsg.text}</p>
        )}
        <button type="submit" disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          {saving ? <><Loader2 size={15} className="animate-spin" /> Guardando...</> : 'Guardar'}
        </button>
      </form>

      {/* Change password */}
      <form onSubmit={changePassword} className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
        <h3 className="text-base font-semibold text-white">Cambiar Contraseña</h3>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Contraseña actual *</label>
          {pwdField('cur', 'currentPassword', '••••••••')}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Nueva contraseña * (mín. 8 caracteres)</label>
          {pwdField('nw', 'newPassword', '••••••••')}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Confirmar nueva contraseña *</label>
          {pwdField('cf', 'confirmPassword', '••••••••')}
        </div>
        {pwdMsg && (
          <p className={`text-xs ${pwdMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{pwdMsg.text}</p>
        )}
        <button type="submit" disabled={changingPwd}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          {changingPwd ? <><Loader2 size={15} className="animate-spin" /> Cambiando...</> : 'Cambiar Contraseña'}
        </button>
      </form>
    </div>
  )
}

// ---- Company Tab ----
function CompanyTab() {
  const { tenant } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyId = () => {
    if (!tenant?.id) return
    navigator.clipboard.writeText(tenant.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fields = [
    { label: 'Nombre de la empresa', value: tenant?.name },
    { label: 'Slug', value: tenant?.slug },
    { label: 'Plan', value: tenant?.plan?.toUpperCase() },
  ]

  return (
    <div className="space-y-6 max-w-lg">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-700 flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">{tenant?.name}</p>
            <p className="text-gray-400 text-xs">Plan: {tenant?.plan?.toUpperCase()}</p>
          </div>
        </div>

        {fields.map(f => (
          <div key={f.label}>
            <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>
            <input className={readonlyCls} value={f.value ?? '—'} readOnly />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">ID del Tenant</label>
          <div className="flex gap-2">
            <input className={readonlyCls + ' flex-1 font-mono text-xs'} value={tenant?.id ?? ''} readOnly />
            <button onClick={copyId}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 transition-colors"
              title="Copiar ID">
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-indigo-900/30 border border-indigo-700/50 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Building2 size={20} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-indigo-300 font-medium text-sm mb-1">Comparte tu slug con tus colaboradores</p>
            <p className="text-indigo-400/80 text-xs leading-relaxed">
              Para que tus colaboradores puedan iniciar sesión, compárteles el slug{' '}
              <span className="font-mono bg-indigo-900/60 px-1.5 py-0.5 rounded text-indigo-300">{tenant?.slug}</span>{' '}
              junto con sus credenciales de acceso.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Roles Tab ----
const ALL_PERMISSIONS = [
  'users:read', 'users:write', 'users:delete',
  'projects:read', 'projects:write', 'projects:delete',
  'inventory:read', 'inventory:write',
  'payroll:read', 'payroll:write',
  'accounting:read', 'accounting:write',
  'reports:read', 'admin:all',
]

function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/roles')
      setRoles(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  return (
    <div className="space-y-6 max-w-2xl">
      {toast && <Toast message={toast} />}
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{roles.length} roles configurados</p>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nuevo Rol
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" /> Cargando roles...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Nombre</th>
                <th className="text-left px-6 py-3">Permisos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {roles.map(r => (
                <tr key={r.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 text-white text-sm font-medium">{r.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                      {r.permissions?.length ?? 0} permiso{(r.permissions?.length ?? 0) !== 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr><td colSpan={2} className="text-center py-10 text-gray-500">No hay roles configurados</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <NewRoleModal
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); fetchRoles(); showToast('Rol creado correctamente') }}
        />
      )}
    </div>
  )
}

function NewRoleModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggle = (p: string) =>
    setSelected(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre del rol es requerido'); return }
    setLoading(true)
    try {
      await api.post('/roles', { name, permissions: selected })
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al crear rol')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Nuevo Rol" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Nombre del rol *</label>
          <input className={inputCls} placeholder="ej. SUPERVISOR" value={name}
            onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Permisos</label>
          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {ALL_PERMISSIONS.map(p => (
              <label key={p} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={selected.includes(p)} onChange={() => toggle(p)}
                  className="accent-indigo-500" />
                <span className="text-xs text-gray-300 group-hover:text-white transition-colors font-mono">{p}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{selected.length} permiso(s) seleccionado(s)</p>
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg py-2.5 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Creando...</> : 'Crear Rol'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ---- Main Page ----
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile')

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'profile', label: 'Mi Perfil', icon: User },
    { key: 'company', label: 'Empresa', icon: Building2 },
    { key: 'roles', label: 'Roles', icon: Shield },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-gray-400 text-sm mt-1">Administra tu perfil, empresa y roles</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 flex gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab />}
      {tab === 'company' && <CompanyTab />}
      {tab === 'roles' && <RolesTab />}
    </div>
  )
}
