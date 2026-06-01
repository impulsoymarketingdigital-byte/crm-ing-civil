import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

interface SubscriptionStatus {
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'suspended'
  trialDaysLeft: number | null
  trialEndsAt: string | null
  plan: string | null
  subscriptionEndDate: string | null
}

export default function TrialBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    if (user?.isSuperAdmin) return
    api.get<SubscriptionStatus>('/subscription/status')
      .then(r => setStatus(r.data))
      .catch(() => {/* silently ignore */})
  }, [user?.isSuperAdmin])

  if (!status || user?.isSuperAdmin) return null
  if (status.status === 'active') return null
  if (status.status !== 'trial' && status.status !== 'expired') return null

  // Expired
  if (status.status === 'expired') {
    return (
      <div className="w-full bg-red-700 text-white flex items-center justify-between px-4 py-3 min-h-[48px] shrink-0">
        <span className="text-sm font-medium">
          🔒 Tu período de prueba ha vencido. Para continuar, elige un plan.
        </span>
        <button
          onClick={() => navigate('/upgrade')}
          className="ml-4 shrink-0 bg-white text-red-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors"
        >
          Elegir plan →
        </button>
      </div>
    )
  }

  // Trial — last day
  if (status.trialDaysLeft === 0) {
    return (
      <div className="w-full bg-orange-600 text-white flex items-center justify-between px-4 py-3 min-h-[48px] shrink-0">
        <span className="text-sm font-medium">
          ⚠️ Tu prueba vence <strong>hoy</strong>. Actualiza antes de medianoche.
        </span>
        <button
          onClick={() => navigate('/upgrade')}
          className="ml-4 shrink-0 bg-white text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-orange-50 transition-colors"
        >
          Ver planes →
        </button>
      </div>
    )
  }

  // Trial — days remaining
  return (
    <div className="w-full bg-yellow-500 text-gray-900 flex items-center justify-between px-4 py-3 min-h-[48px] shrink-0">
      <span className="text-sm font-medium">
        🎁 Período de prueba: te quedan <strong>{status.trialDaysLeft} días</strong>. Actualiza tu plan para continuar.
      </span>
      <button
        onClick={() => navigate('/upgrade')}
        className="ml-4 shrink-0 bg-gray-900 text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
      >
        Ver planes →
      </button>
    </div>
  )
}
