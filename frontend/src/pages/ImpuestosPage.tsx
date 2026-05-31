import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, DollarSign } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const TAX_TYPES = ['IVA', 'RETEFUENTE', 'RETEICA', 'RENTA', 'ICA']

const statusBadge = (s: string) => {
  const cls: Record<string, string> = {
    PENDING: 'bg-yellow-900/40 text-yellow-400',
    PAID:    'bg-emerald-900/40 text-emerald-400',
    OVERDUE: 'bg-red-900/40 text-red-400',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] ?? 'bg-gray-700 text-gray-400'}`}>{s}</span>
}

function ObligacionesTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [payTarget, setPayTarget] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [payForm, setPayForm] = useState({ cashAccountId: '', paidDate: new Date().toISOString().slice(0, 10) })
  const [form, setForm] = useState({ type: 'IVA', period: '', base: '', rate: '', dueDate: '' })

  const load = () => {
    setLoading(true)
    api.get('/taxes/obligations').then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const amount = Number(form.base) * Number(form.rate)

  const openModal = () => {
    setForm({ type: 'IVA', period: '', base: '', rate: '', dueDate: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/taxes/obligations', {
        type: form.type,
        period: form.period,
        base: Number(form.base),
        rate: Number(form.rate),
        amount,
        dueDate: form.dueDate,
      })
      setShowModal(false); load()
    } catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al crear obligación') }
    finally { setSaving(false) }
  }

  const openPay = async (row: any) => {
    setPayTarget(row)
    setPayForm({ cashAccountId: '', paidDate: new Date().toISOString().slice(0, 10) })
    try {
      const aRes = await api.get('/accounts')
      const all: any[] = aRes.data?.data ?? aRes.data ?? []
      setAccounts(all.filter((a: any) => String(a.code ?? '').startsWith('11')))
    } catch {}
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault(); setPaying(payTarget.id)
    try {
      await api.post(`/taxes/obligations/${payTarget.id}/pay`, payForm)
      setPayTarget(null); load()
    } catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al registrar pago') }
    finally { setPaying(null) }
  }

  const pending = rows.filter(r => r.status !== 'PAID')

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nueva Obligación
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          : pending.length === 0 ? <p className="text-gray-500 text-center py-16">Sin obligaciones tributarias pendientes.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Tipo','Período','Base','Tarifa','Valor','Vencimiento','Estado',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pending.map((r: any) => (
                  <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{r.type}</td>
                    <td className="px-4 py-3 text-gray-300">{r.period}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(Number(r.base))}</td>
                    <td className="px-4 py-3 text-gray-400">{(Number(r.rate) * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-white font-semibold">{fmt(Number(r.amount))}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleDateString('es-CO') : '—'}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3">
                      {r.status !== 'PAID' && (
                        <button onClick={() => openPay(r)} className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors">
                          <DollarSign size={12} /> Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Nueva Obligación Tributaria</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Tipo de Impuesto</label>
                  <select required value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                    {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Período (ej. 2025-03)</label>
                  <input type="text" required value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2025-03" className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Base Gravable</label>
                  <input type="number" required min="0" step="1" value={form.base} onChange={e => setForm(f => ({ ...f, base: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Tarifa (ej. 0.19)</label>
                  <input type="number" required min="0" max="1" step="0.001" value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              {form.base && form.rate && (
                <div className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between text-sm">
                  <span className="text-gray-400">Valor calculado:</span>
                  <span className="text-white font-semibold">{fmt(amount)}</span>
                </div>
              )}
              <div>
                <label className="block text-gray-400 text-sm mb-1">Fecha de Vencimiento</label>
                <input type="date" required value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setPayTarget(null) }}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Pagar {payTarget.type} — {payTarget.period}</h2>
              <button onClick={() => setPayTarget(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handlePay} className="px-6 py-4 space-y-4">
              <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm flex justify-between">
                <span className="text-gray-400">Monto a pagar:</span>
                <span className="text-white font-semibold">{fmt(Number(payTarget.amount))}</span>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Cuenta de Pago (Caja/Bancos)</label>
                <select required value={payForm.cashAccountId} onChange={e => setPayForm(f => ({ ...f, cashAccountId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Seleccionar...</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Fecha de Pago</label>
                <input type="date" required value={payForm.paidDate} onChange={e => setPayForm(f => ({ ...f, paidDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setPayTarget(null)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm">Cancelar</button>
                <button type="submit" disabled={paying === payTarget.id} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm">
                  {paying === payTarget.id ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />} Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

function PagosTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/taxes/obligations?status=PAID').then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        : rows.length === 0 ? <p className="text-gray-500 text-center py-16">Sin impuestos pagados registrados aún.</p>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Tipo','Período','Monto Pagado','Fecha Pago','Cuenta'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{r.type}</td>
                  <td className="px-4 py-3 text-gray-300">{r.period}</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">{fmt(Number(r.amount))}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.paidDate ? new Date(r.paidDate).toLocaleDateString('es-CO') : '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{r.cashAccount?.code} {r.cashAccount?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}

export default function ImpuestosPage() {
  const [tab, setTab] = useState<'obligaciones' | 'pagos'>('obligaciones')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Impuestos</h1>
        <p className="text-gray-400 text-sm mt-1">Obligaciones tributarias y pagos realizados</p>
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit">
        {([['obligaciones', 'Obligaciones'], ['pagos', 'Pagos Realizados']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'obligaciones' ? <ObligacionesTab /> : <PagosTab />}
    </div>
  )
}
