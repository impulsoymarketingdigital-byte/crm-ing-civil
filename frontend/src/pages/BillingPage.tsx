import { useEffect, useState } from 'react'
import { api } from '../api/client'
import {
  Loader2, CreditCard, Users, Calendar, DollarSign,
  CheckCircle, AlertTriangle, Clock, RefreshCw, Mail
} from 'lucide-react'

const fmtUsd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })

const statusBadge = (s: string) => {
  const map: Record<string, { cls: string; label: string; icon: any }> = {
    PENDING: { cls: 'bg-yellow-900/40 text-yellow-300 border border-yellow-700', label: 'Pendiente', icon: Clock },
    PAID:    { cls: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700', label: 'Pagada', icon: CheckCircle },
    OVERDUE: { cls: 'bg-red-900/40 text-red-300 border border-red-700', label: 'Vencida', icon: AlertTriangle },
    VOID:    { cls: 'bg-gray-700 text-gray-400 border border-gray-600', label: 'Anulada', icon: null },
  }
  const { cls, label, icon: Icon } = map[s] ?? map['PENDING']
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>
      {Icon && <Icon size={11} />} {label}
    </span>
  )
}

export default function BillingPage() {
  const [summary,   setSummary]   = useState<any>(null)
  const [invoices,  setInvoices]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [paying,    setPaying]    = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [email,     setEmail]     = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailOk,   setEmailOk]   = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [s, i] = await Promise.all([
        api.get('/billing/summary').then(r => r.data),
        api.get('/billing/invoices').then(r => r.data),
      ])
      setSummary(s)
      setInvoices(i)
      setEmail(s.billingEmail ?? '')
    } catch {/* ignore */} finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const markPaid = async (id: string) => {
    setPaying(id)
    try { await api.patch(`/billing/invoices/${id}/pay`); await load() }
    catch (e: any) { alert(e.response?.data?.message ?? 'Error') }
    finally { setPaying(null) }
  }

  const generate = async () => {
    setGenerating(true)
    try { await api.post('/billing/generate'); await load(); alert('Factura generada') }
    catch (e: any) { alert(e.response?.data?.message ?? 'Error') }
    finally { setGenerating(false) }
  }

  const saveEmail = async () => {
    setSavingEmail(true)
    try {
      await api.patch('/billing/email', { email })
      setEmailOk(true)
      setTimeout(() => setEmailOk(false), 3000)
    } catch (e: any) { alert(e.response?.data?.message ?? 'Error') }
    finally { setSavingEmail(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-indigo-400" />
    </div>
  )

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard size={24} className="text-indigo-400" /> Facturación
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Plan de suscripción · $59 USD por cada 8 usuarios · ciclo de 30 días
          </p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Generar factura manual
        </button>
      </div>

      {/* Resumen de consumo actual */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Usuarios activos */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-900/50 flex items-center justify-center">
                <Users size={18} className="text-indigo-400" />
              </div>
              <span className="text-sm text-gray-400">Usuarios activos</span>
            </div>
            <p className="text-3xl font-bold text-white">{summary.activeUsers}</p>
            <p className="text-xs text-gray-500 mt-1">de {summary.units * summary.usersPerUnit} del bloque actual</p>
          </div>

          {/* Bloques facturados */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-900/50 flex items-center justify-center">
                <DollarSign size={18} className="text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Bloques de 8 usuarios</span>
            </div>
            <p className="text-3xl font-bold text-white">{summary.units}</p>
            <p className="text-xs text-gray-500 mt-1">× ${summary.unitPriceUsd} USD c/u</p>
          </div>

          {/* Próximo cobro */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-900/50 flex items-center justify-center">
                <DollarSign size={18} className="text-emerald-400" />
              </div>
              <span className="text-sm text-gray-400">Próximo cobro</span>
            </div>
            <p className="text-3xl font-bold text-white">{fmtUsd(summary.nextChargeUsd)}</p>
            <p className="text-xs text-gray-500 mt-1">USD</p>
          </div>

          {/* Fecha próximo cobro */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-900/50 flex items-center justify-center">
                <Calendar size={18} className="text-amber-400" />
              </div>
              <span className="text-sm text-gray-400">Fecha próximo cobro</span>
            </div>
            <p className="text-lg font-bold text-white leading-tight">
              {summary.nextBillingDate ? fmtDate(summary.nextBillingDate) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Fórmula de cálculo */}
      {summary && (
        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-4 flex items-start gap-3">
          <DollarSign size={18} className="text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-300">Cálculo del período actual</p>
            <p className="text-sm text-indigo-400/80 mt-0.5 font-mono">{summary.breakdown?.formula}</p>
          </div>
        </div>
      )}

      {/* Alerta si hay facturas vencidas */}
      {summary?.totalOwedUsd > 0 && (
        <div className="bg-red-950/40 border border-red-700 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">Tienes facturas pendientes de pago</p>
            <p className="text-sm text-red-400 mt-0.5">
              Total adeudado: <strong>{fmtUsd(summary.totalOwedUsd)}</strong> USD
              · {summary.pendingInvoices} factura{summary.pendingInvoices !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Email de facturación */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Mail size={16} className="text-gray-400" /> Email de facturación
        </h2>
        <div className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="facturacion@tuempresa.com"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={saveEmail}
            disabled={savingEmail}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {savingEmail ? <Loader2 size={13} className="animate-spin" /> : null}
            {emailOk ? '✓ Guardado' : 'Guardar'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Las facturas de suscripción se notificarán a este email al generarse
        </p>
      </div>

      {/* Historial de facturas */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Historial de facturas</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard size={36} className="mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">Sin facturas generadas todavía</p>
              <p className="text-gray-500 text-sm mt-1">
                El sistema genera facturas automáticamente cada 30 días
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Número', 'Período', 'Usuarios', 'Bloques', 'Total', 'Vence', 'Estado', 'Acción'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-indigo-400 font-mono text-xs font-medium">
                      {inv.number}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">
                      <div>{fmtDate(inv.periodStart)}</div>
                      <div className="text-gray-500">→ {fmtDate(inv.periodEnd)}</div>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{inv.activeUsers}</td>
                    <td className="px-4 py-3 text-gray-300">{inv.units}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">
                      {fmtUsd(Number(inv.totalUsd))}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {fmtDate(inv.dueDate)}
                      {inv.paidAt && (
                        <div className="text-emerald-500">Pagada: {fmtDate(inv.paidAt)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                    <td className="px-4 py-3">
                      {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                        <button
                          onClick={() => markPaid(inv.id)}
                          disabled={paying === inv.id}
                          className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 text-emerald-200 text-xs px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {paying === inv.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <CheckCircle size={11} />
                          }
                          Marcar pagada
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
