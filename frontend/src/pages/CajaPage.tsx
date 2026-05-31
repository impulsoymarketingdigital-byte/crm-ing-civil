import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, ArrowLeft, RefreshCw } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const CATEGORIES = ['TRANSPORT', 'SUPPLIES', 'FOOD', 'OTHER']

// ─── Transactions for a selected fund ────────────────────────────────────────
function FundTransactions({ fund, onBack }: { fund: any; onBack: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reimbursing, setReimbursing] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', category: 'OTHER', receiptNumber: '', date: new Date().toISOString().slice(0, 10) })

  const load = () => {
    setLoading(true)
    api.get(`/petty-cash/funds/${fund.id}/transactions`).then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [fund.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload: any = { ...form, amount: Number(form.amount) }
      if (!payload.receiptNumber) delete payload.receiptNumber
      await api.post(`/petty-cash/funds/${fund.id}/transactions`, payload)
      setShowModal(false); load()
    } catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al registrar gasto') }
    finally { setSaving(false) }
  }

  const reimburse = async () => {
    if (!confirm('¿Confirmar reembolso de caja menor? Se creará un asiento contable.')) return
    setReimbursing(true)
    try { await api.post(`/petty-cash/funds/${fund.id}/reimburse`); load(); alert('Reembolso registrado exitosamente') }
    catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al reembolsar') }
    finally { setReimbursing(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ArrowLeft size={16} /> Volver a fondos
        </button>
        <div className="flex gap-2">
          <button onClick={reimburse} disabled={reimbursing} className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {reimbursing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Reembolsar Caja
          </button>
          <button onClick={() => { setForm({ description: '', amount: '', category: 'OTHER', receiptNumber: '', date: new Date().toISOString().slice(0,10) }); setShowModal(true) }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> Registrar Gasto
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-white font-semibold">{fund.name}</h3>
        <div className="flex gap-6 mt-2 text-sm">
          <span className="text-gray-400">Saldo inicial: <span className="text-white">{fmt(Number(fund.initialBalance))}</span></span>
          <span className="text-gray-400">Saldo actual: <span className="text-emerald-400 font-semibold">{fmt(Number(fund.currentBalance ?? fund.initialBalance))}</span></span>
          <span className="text-gray-400">Responsable: <span className="text-white">{fund.responsible}</span></span>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          : rows.length === 0 ? <p className="text-gray-500 text-center py-16">Sin movimientos en este fondo.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Fecha','Descripción','Categoría','Monto','Comprobante'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.date ? new Date(r.date).toLocaleDateString('es-CO') : '—'}</td>
                    <td className="px-4 py-3 text-white">{r.description}</td>
                    <td className="px-4 py-3 text-gray-300">{r.category}</td>
                    <td className="px-4 py-3 text-red-400 font-semibold">-{fmt(Number(r.amount))}</td>
                    <td className="px-4 py-3 text-gray-400">{r.receiptNumber ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Registrar Gasto de Caja Menor</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Descripción</label>
                <input type="text" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Monto</label>
                  <input type="number" required min="1" step="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Categoría</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Fecha</label>
                  <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">N° Comprobante (opcional)</label>
                  <input type="text" value={form.receiptNumber} onChange={e => setForm(f => ({ ...f, receiptNumber: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Funds list ───────────────────────────────────────────────────────────────
export default function CajaPage() {
  const [funds, setFunds] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [form, setForm] = useState({ projectId: '', name: '', initialBalance: '', responsible: '', accountId: '' })

  const load = () => { setLoading(true); api.get('/petty-cash/funds').then(r => setFunds(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openModal = async () => {
    setForm({ projectId: '', name: '', initialBalance: '', responsible: '', accountId: '' })
    setShowModal(true)
    try {
      const [pRes, aRes] = await Promise.all([api.get('/projects'), api.get('/accounts')])
      setProjects(pRes.data?.data ?? pRes.data ?? [])
      const all: any[] = aRes.data?.data ?? aRes.data ?? []
      setAccounts(all.filter((a: any) => String(a.code ?? '').startsWith('1105')))
    } catch {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const payload: any = { ...form, initialBalance: Number(form.initialBalance) }
      if (!payload.projectId) delete payload.projectId
      await api.post('/petty-cash/funds', payload)
      setShowModal(false); load()
    } catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al crear fondo') }
    finally { setSaving(false) }
  }

  if (selected) return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Caja Menor</h1>
        <p className="text-gray-400 text-sm mt-1">Movimientos del fondo seleccionado</p>
      </div>
      <FundTransactions fund={selected} onBack={() => setSelected(null)} />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Caja Menor</h1>
          <p className="text-gray-400 text-sm mt-1">Fondos de caja menor y sus movimientos</p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nuevo Fondo
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          : funds.length === 0 ? <p className="text-gray-500 text-center py-16">Sin fondos de caja menor. Crea el primero con el botón de arriba.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Proyecto','Nombre','Saldo Inicial','Saldo Actual','Responsable','Estado',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {funds.map((f: any) => (
                  <tr key={f.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-gray-400">{f.project?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-white font-medium">{f.name}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(Number(f.initialBalance))}</td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">{fmt(Number(f.currentBalance ?? f.initialBalance))}</td>
                    <td className="px-4 py-3 text-gray-300">{f.responsible}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${f.status === 'ACTIVE' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>{f.status ?? 'ACTIVE'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(f)} className="text-indigo-400 hover:text-indigo-300 text-xs underline transition-colors">Ver movimientos</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Nuevo Fondo de Caja Menor</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Proyecto (opcional)</label>
                <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Sin proyecto</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Nombre del Fondo</label>
                <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="Caja Menor Obra Norte" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Saldo Inicial</label>
                <input type="number" required min="0" step="1" value={form.initialBalance} onChange={e => setForm(f => ({ ...f, initialBalance: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Responsable</label>
                <input type="text" required value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Cuenta Contable (1105)</label>
                <select required value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Seleccionar cuenta...</option>
                  {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear Fondo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
