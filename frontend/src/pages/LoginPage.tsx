import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Building2, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({ slug: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', form)
      const tenant = data.tenant ?? { id: data.user.tenantId, name: form.slug, slug: form.slug, plan: 'pro' }
      login(data.access_token, data.user, tenant)
      nav('/')
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.response?.data?.message ?? err.message ?? 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CRM Ing. Civil</h1>
          <p className="text-gray-400 mt-1">Micro-ERP · Inicia sesión</p>
        </div>

        {/* Card */}
        <form onSubmit={submit} className="bg-gray-800 rounded-2xl p-8 shadow-2xl space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre de empresa / Slug</label>
            <input
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              placeholder="constructora-demo"
              value={form.slug}
              onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              required
            />
            <p className="text-xs text-gray-500 mt-1.5">
              El slug es el identificador único de tu empresa (solo minúsculas, sin espacios)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              placeholder="admin@empresa.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
            <input
              type="password"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
          </button>

          <p className="text-center text-sm text-gray-500">
            ¿Empresa nueva?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              Registrar nueva empresa →
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
