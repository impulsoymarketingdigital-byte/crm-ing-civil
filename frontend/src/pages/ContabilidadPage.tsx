import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, CheckCircle } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const statusBadge = (s: string) => {
  const cls: Record<string, string> = {
    DRAFT:  'bg-yellow-900/40 text-yellow-400',
    POSTED: 'bg-emerald-900/40 text-emerald-400',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] ?? 'bg-gray-700 text-gray-400'}`}>{s}</span>
}

function ReceiptsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [form, setForm] = useState({ number: '', concept: '', thirdParty: '', amount: '', cashAccountId: '', relatedInvoiceId: '', date: '', notes: '' })

  const load = () => {
    setLoading(true)
    api.get('/accounting/receipts').then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = async () => {
    setForm({ number: '', concept: '', thirdParty: '', amount: '', cashAccountId: '', relatedInvoiceId: '', date: new Date().toISOString().slice(0, 10), notes: '' })
    setShowModal(true)
    try {
      const res = await api.get('/accounts')
      const all: any[] = res.data?.data ?? res.data ?? []
      setAccounts(all.filter((a: any) => String(a.code ?? '').startsWith('11')))
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/accounting/receipts', { ...form, amount: Number(form.amount) })
      setShowModal(false)
      load()
    } catch (ex: any) {
      alert(ex.response?.data?.message ?? 'Error al crear recibo')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nuevo Recibo
        </button>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-center py-16">Sin recibos de caja registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Número','Concepto','Tercero','Valor','Cuenta Destino','Fecha','Estado'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{r.number}</td>
                  <td className="px-4 py-3 text-gray-300">{r.concept}</td>
                  <td className="px-4 py-3 text-gray-300">{r.thirdParty ?? '—'}</td>
                  <td className="px-4 py-3 text-white font-semibold">{fmt(Number(r.amount))}</td>
                  <td className="px-4 py-3 text-gray-400">{r.cashAccount?.code} {r.cashAccount?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.date ? new Date(r.date).toLocaleDateString('es-CO') : '—'}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Nuevo Recibo de Caja</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Número</label>
                  <input type="text" required value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="RC-001" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Fecha</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Concepto</label>
                <input type="text" required value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Tercero (opcional)</label>
                <input type="text" value={form.thirdParty} onChange={e => setForm(f => ({ ...f, thirdParty: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Valor</label>
                <input type="number" required min="0" step="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Cuenta Destino (11xx Caja/Bancos)</label>
                <select required value={form.cashAccountId} onChange={e => setForm(f => ({ ...f, cashAccountId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Factura Relacionada (opcional)</label>
                <input type="text" value={form.relatedInvoiceId} onChange={e => setForm(f => ({ ...f, relatedInvoiceId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="ID de factura..." />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Notas (opcional)</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
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
    </>
  )
}

function DisbursementsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [form, setForm] = useState({ number: '', concept: '', beneficiary: '', amount: '', cashAccountId: '', expenseAccountId: '', date: '', notes: '', projectId: '' })

  const load = () => {
    setLoading(true)
    api.get('/accounting/disbursements').then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = async () => {
    setForm({ number: '', concept: '', beneficiary: '', amount: '', cashAccountId: '', expenseAccountId: '', date: new Date().toISOString().slice(0, 10), notes: '', projectId: '' })
    setShowModal(true)
    try {
      const [accRes, projRes] = await Promise.all([api.get('/accounts'), api.get('/projects')])
      const allAcc: any[] = accRes.data?.data ?? accRes.data ?? []
      setAccounts(allAcc)
      setProjects(projRes.data?.data ?? projRes.data ?? [])
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = { ...form, amount: Number(form.amount) }
      if (!payload.projectId) delete payload.projectId
      await api.post('/accounting/disbursements', payload)
      setShowModal(false)
      load()
    } catch (ex: any) {
      alert(ex.response?.data?.message ?? 'Error al crear comprobante')
    } finally { setSaving(false) }
  }

  const postDisbursement = async (id: string) => {
    setPosting(id)
    try {
      await api.post(`/accounting/disbursements/${id}/post`)
      load()
    } catch (ex: any) {
      alert(ex.response?.data?.message ?? 'Error al contabilizar')
    } finally { setPosting(null) }
  }

  const cashAccounts = accounts.filter((a: any) => String(a.code ?? '').startsWith('11'))

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nuevo Egreso
        </button>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-center py-16">Sin comprobantes de egreso registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Número','Concepto','Beneficiario','Valor','Cuenta Origen','Fecha','Estado',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{r.number}</td>
                  <td className="px-4 py-3 text-gray-300">{r.concept}</td>
                  <td className="px-4 py-3 text-gray-300">{r.beneficiary}</td>
                  <td className="px-4 py-3 text-white font-semibold">{fmt(Number(r.amount))}</td>
                  <td className="px-4 py-3 text-gray-400">{r.cashAccount?.code} {r.cashAccount?.name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.date ? new Date(r.date).toLocaleDateString('es-CO') : '—'}</td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'DRAFT' && (
                      <button
                        onClick={() => postDisbursement(r.id)}
                        disabled={posting === r.id}
                        className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        {posting === r.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Contabilizar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Nuevo Comprobante de Egreso</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Número</label>
                  <input type="text" required value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="CE-001" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Fecha</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Concepto</label>
                <input type="text" required value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Beneficiario</label>
                <input type="text" required value={form.beneficiary} onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Valor</label>
                <input type="number" required min="0" step="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Cuenta Origen (Caja/Bancos 11xx)</label>
                <select required value={form.cashAccountId} onChange={e => setForm(f => ({ ...f, cashAccountId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Seleccionar...</option>
                  {cashAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Cuenta de Gasto/Egreso</label>
                <select required value={form.expenseAccountId} onChange={e => setForm(f => ({ ...f, expenseAccountId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Seleccionar...</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Proyecto (opcional)</label>
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Sin proyecto</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Notas (opcional)</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
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
    </>
  )
}

export default function ContabilidadPage() {
  const [tab, setTab] = useState<'receipts' | 'disbursements'>('receipts')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contabilidad</h1>
        <p className="text-gray-400 text-sm mt-1">Recibos de caja y comprobantes de egreso</p>
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit">
        {([['receipts', 'Recibos de Caja'], ['disbursements', 'Comprobantes de Egreso']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'receipts' ? <ReceiptsTab /> : <DisbursementsTab />}
    </div>
  )
}
