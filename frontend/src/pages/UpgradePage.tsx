import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, X, Loader2, Star } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const features = [
  'Módulos completos (contabilidad, nómina, proyectos, APU, presupuestos, actas, liquidación)',
  'Múltiples empresas y usuarios',
  'Reportes PDF',
  'SECOP II',
  'Soporte por email',
]

interface Plan {
  id: 'free' | 'monthly' | 'annual'
  name: string
  price: string
  period: string
  sub: string
  badge?: string
  popular?: boolean
  extraFeature?: string
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'FREE',
    price: '$0',
    period: '',
    sub: 'Solo período de prueba',
  },
  {
    id: 'monthly',
    name: 'MENSUAL',
    price: '$59 USD',
    period: '/mes',
    sub: '/8 usuarios · ≈ 2 meses gratis',
    badge: 'MÁS POPULAR',
    popular: true,
  },
  {
    id: 'annual',
    name: 'ANUAL',
    price: '$590 USD',
    period: '/año',
    sub: '/8 usuarios · ~17% desc.',
    extraFeature: 'Soporte prioritario',
  },
]

interface ModalProps {
  plan: Plan
  billingEmail: string
  onClose: () => void
}

function ActivationModal({ plan, billingEmail: initialEmail, onClose }: ModalProps) {
  const navigate = useNavigate()
  const [email, setEmail] = useState(initialEmail)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async () => {
    if (!email.trim()) { setError('El email de facturación es requerido'); return }
    if (!accepted) { setError('Debes aceptar los términos y condiciones'); return }
    setError('')
    setLoading(true)
    try {
      await api.post('/subscription/request', { plan: plan.id, billingEmail: email })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-900/40 rounded-full">
              <CheckCircle size={36} className="text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white">¡Solicitud enviada!</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              ✅ Nuestro equipo te contactará en menos de 24 horas para confirmar el pago y activar tu cuenta.
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg py-3 transition-colors mt-2"
            >
              Volver al inicio
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-bold text-white">Activar plan {plan.name}</h3>
              <p className="text-indigo-400 font-semibold mt-1">
                {plan.price}<span className="text-gray-400 text-sm font-normal">{plan.period}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email de facturación</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="facturacion@empresa.com"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={e => setAccepted(e.target.checked)}
                className="mt-0.5 accent-indigo-500"
              />
              <span className="text-sm text-gray-300">
                Acepto los <span className="text-indigo-400 underline cursor-pointer">términos y condiciones</span>
              </span>
            </label>

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">{error}</div>
            )}

            <button
              onClick={submit}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : 'Solicitar activación'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UpgradePage() {
  const { tenant } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const currentPlan = tenant?.plan ?? 'free'

  // Determine which plan key matches current tenant plan
  const currentPlanId = currentPlan === 'monthly' || currentPlan === 'annual' ? currentPlan : 'free'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <h1 className="text-4xl font-extrabold text-white mb-3">Elige tu plan</h1>
        <p className="text-gray-400 text-lg">
          Sin contratos. Sin sorpresas. Cancela cuando quieras.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {plans.map(plan => {
          const isCurrent = plan.id === currentPlanId
          const isPopular = plan.popular

          return (
            <div
              key={plan.id}
              className={`relative bg-gray-800 rounded-2xl p-6 flex flex-col transition-all ${
                isPopular
                  ? 'ring-2 ring-indigo-500 shadow-xl shadow-indigo-900/30'
                  : 'border border-gray-700'
              }`}
            >
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    <Star size={11} fill="currentColor" /> MÁS POPULAR
                  </span>
                </div>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <div className="absolute -top-3.5 right-4">
                  <span className="bg-green-700 text-green-100 text-xs font-bold px-3 py-1 rounded-full">
                    PLAN ACTUAL
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{plan.name}</h2>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-400 text-sm mb-1">{plan.period}</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-1">{plan.sub}</p>
                {(plan.id === 'monthly' || plan.id === 'annual') && (
                  <p className="text-gray-500 text-xs mt-0.5">Cada 8 usuarios adicionales = +$59/mes</p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-6">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <CheckCircle size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
                {plan.extraFeature && (
                  <li className="flex items-start gap-2 text-sm text-green-300 font-medium">
                    <CheckCircle size={15} className="text-green-400 shrink-0 mt-0.5" />
                    {plan.extraFeature}
                  </li>
                )}
              </ul>

              {/* CTA */}
              {plan.id === 'free' ? (
                <button
                  disabled
                  className="w-full bg-gray-700 text-gray-500 font-semibold rounded-lg py-2.5 text-sm cursor-not-allowed"
                >
                  Solo período de prueba
                </button>
              ) : isCurrent ? (
                <button
                  disabled
                  className="w-full bg-green-900/40 text-green-400 border border-green-700 font-semibold rounded-lg py-2.5 text-sm cursor-not-allowed"
                >
                  Plan actual
                </button>
              ) : (
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full font-semibold rounded-lg py-2.5 text-sm transition-colors ${
                    isPopular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  Seleccionar plan
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-gray-600 text-xs mt-8 text-center max-w-md">
        Al seleccionar un plan, nuestro equipo te contactará para procesar el pago. No se realiza ningún cargo automático sin tu confirmación.
      </p>

      <button
        onClick={() => navigate('/')}
        className="mt-6 text-gray-500 hover:text-gray-300 text-sm transition-colors"
      >
        ← Volver al inicio
      </button>

      {selectedPlan && (
        <ActivationModal
          plan={selectedPlan}
          billingEmail={tenant ? '' : ''}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </div>
  )
}
