import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Building2, Eye, EyeOff, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const inputCls =
  'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm'

export default function RegisterPage() {
  const { login } = useAuth()
  const nav = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)

  // Step 1
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [plan, setPlan] = useState('pro')

  // Step 2
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleNameChange = (val: string) => {
    setCompanyName(val)
    if (!slugManual) setSlug(toSlug(val))
  }

  const handleSlugChange = (val: string) => {
    setSlugManual(true)
    setSlug(toSlug(val))
  }

  const validateStep1 = () => {
    if (!companyName.trim()) { setError('El nombre de la empresa es requerido'); return false }
    if (!slug.trim()) { setError('El slug es requerido'); return false }
    setError('')
    return true
  }

  const validateStep2 = () => {
    if (!firstName.trim() || !lastName.trim()) { setError('El nombre y apellido son requeridos'); return false }
    if (!email.trim()) { setError('El email es requerido'); return false }
    if (password.length < 8) { setError('La contraseña debe tener mínimo 8 caracteres'); return false }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return false }
    setError('')
    return true
  }

  const goNext = () => {
    if (validateStep1()) setStep(2)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep2()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/auth/register', {
        tenant: { name: companyName, slug, plan },
        admin: { firstName, lastName, email, password },
      })
      const tenant = data.tenant ?? { id: '', name: companyName, slug, plan }
      login(data.access_token, data.user, tenant)
      setRegistered(true)
      setTimeout(() => nav('/'), 2500)
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? 'Error al registrar la empresa')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">CRM Ing. Civil</h1>
          <p className="text-gray-400 mt-1">Registrar nueva empresa</p>
        </div>

        {/* Trial badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-sm font-semibold px-4 py-2 rounded-full">
            🎁 <strong>5 días gratis</strong>, sin tarjeta de crédito
          </span>
        </div>

        {/* Success welcome message */}
        {registered && (
          <div className="mb-6 bg-green-900/40 border border-green-600 rounded-xl px-5 py-4 text-center">
            <p className="text-green-300 font-semibold text-sm">✅ ¡Empresa creada con éxito!</p>
            <p className="text-green-400/80 text-xs mt-1">Tu prueba gratuita de 5 días ha comenzado. Redirigiendo…</p>
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                s === step ? 'bg-indigo-600 text-white' :
                s < step ? 'bg-indigo-800 text-indigo-300' :
                'bg-gray-700 text-gray-500'
              }`}>{s}</div>
              {s < 2 && <div className={`w-12 h-0.5 ${step > 1 ? 'bg-indigo-600' : 'bg-gray-700'}`} />}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-500 mb-6">
          Paso {step} de 2 — {step === 1 ? 'Datos de la empresa' : 'Datos del administrador'}
        </p>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre de la empresa *</label>
                <input
                  className={inputCls}
                  placeholder="Constructora Ejemplo S.A.S."
                  value={companyName}
                  onChange={e => handleNameChange(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug *</label>
                <input
                  className={inputCls}
                  placeholder="constructora-ejemplo"
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  required
                />
                {slug && (
                  <p className="text-xs text-indigo-400 mt-1.5">
                    Vista previa: <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded">{slug}</span>
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Solo minúsculas, números y guiones. Se genera automáticamente desde el nombre.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Plan</label>
                <select
                  className={inputCls}
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
              )}

              <button
                type="button"
                onClick={goNext}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
              >
                Siguiente <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre *</label>
                  <input
                    className={inputCls}
                    placeholder="Juan"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Apellido *</label>
                  <input
                    className={inputCls}
                    placeholder="Pérez"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email *</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña * (mín. 8 caracteres)</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className={inputCls + ' pr-10'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmar contraseña *</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className={inputCls + ' pr-10'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError('') }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={18} /> Atrás
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 size={18} className="animate-spin" /> Registrando...</> : 'Crear empresa'}
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                Al registrarte aceptas nuestros términos. Tu prueba incluye acceso completo a todas las funcionalidades.
              </p>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
              ← Volver al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
