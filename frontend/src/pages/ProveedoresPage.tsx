import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, Trash2, DollarSign } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const statusBadge = (s: string) => {
  const cls: Record<string, string> = {
    PENDING: 'bg-yellow-900/40 text-yellow-400',
    PARTIAL: 'bg-orange-900/40 text-orange-400',
    PAID:    'bg-emerald-900/40 text-emerald-400',
    VOID:    'bg-red-900/40 text-red-400',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] ?? 'bg-gray-700 text-gray-400'}`}>{s}</span>
}

// ─── Vendors ─────────────────────────────────────────────────────────────────
function VendorsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', taxId: '', email: '', phone: '', address: '', contactName: '' })

  const load = () => { setLoading(true); api.get('/payables/vendors').then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openModal = () => {
    setForm({ code: '', name: '', taxId: '', email: '', phone: '', address: '', contactName: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/payables/vendors', form); setShowModal(false); load() }
    catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al crear proveedor') }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nuevo Proveedor
        </button>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          : rows.length === 0 ? <p className="text-gray-500 text-center py-16">Sin proveedores registrados.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Código','Nombre','NIT','Email','Teléfono','Activo'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{r.code}</td>
                    <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-gray-300">{r.taxId ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.email ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{r.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.active !== false ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'}`}>
                        {r.active !== false ? 'Sí' : 'No'}
                      </span>
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
              <h2 className="text-lg font-bold text-white">Nuevo Proveedor</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[['code','Código','PRV-001'],['name','Nombre completo',''],['taxId','NIT',''],['email','Email',''],['phone','Teléfono',''],['contactName','Nombre contacto','']].map(([field, label, ph]) => (
                  <div key={field}>
                    <label className="block text-gray-400 text-sm mb-1">{label}</label>
                    <input type="text" required={field === 'code' || field === 'name'} value={(form as any)[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={ph} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Dirección</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
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

// ─── Purchase Invoices ────────────────────────────────────────────────────────
interface PurchaseLine { description: string; quantity: number; unitCost: number; accountId: string }

function PurchaseInvoicesTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [vendors, setVendors] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [form, setForm] = useState({ vendorId: '', number: '', issueDate: '', dueDate: '', retentionPct: 0.025 })
  const [lines, setLines] = useState<PurchaseLine[]>([{ description: '', quantity: 1, unitCost: 0, accountId: '' }])
  // pay modal
  const [payTarget, setPayTarget] = useState<any>(null)
  const [payForm, setPayForm] = useState({ cashAccountId: '', amount: '' })

  const load = () => { setLoading(true); api.get('/payables/invoices').then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openModal = async () => {
    setForm({ vendorId: '', number: '', issueDate: new Date().toISOString().slice(0,10), dueDate: '', retentionPct: 0.025 })
    setLines([{ description: '', quantity: 1, unitCost: 0, accountId: '' }])
    setShowModal(true)
    try {
      const [vRes, aRes] = await Promise.all([api.get('/payables/vendors'), api.get('/accounts')])
      setVendors(vRes.data?.data ?? vRes.data ?? [])
      const all: any[] = aRes.data?.data ?? aRes.data ?? []
      setAccounts(all.filter((a: any) => String(a.code ?? '').match(/^[56]/)))
    } catch {}
  }

  const addLine = () => setLines(l => [...l, { description: '', quantity: 1, unitCost: 0, accountId: '' }])
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof PurchaseLine, value: any) => setLines(l => l.map((ln, idx) => idx === i ? { ...ln, [field]: value } : ln))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/payables/invoices', {
        ...form,
        retentionPct: Number(form.retentionPct),
        lines: lines.map(l => ({ ...l, quantity: Number(l.quantity), unitCost: Number(l.unitCost) })),
      })
      setShowModal(false); load()
    } catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al crear factura de proveedor') }
    finally { setSaving(false) }
  }

  const openPay = async (inv: any) => {
    setPayTarget(inv)
    setPayForm({ cashAccountId: '', amount: String(inv.total ?? '') })
    try {
      const aRes = await api.get('/accounts')
      const all: any[] = aRes.data?.data ?? aRes.data ?? []
      setAccounts(all.filter((a: any) => String(a.code ?? '').startsWith('11')))
    } catch {}
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault(); setPaying(payTarget.id)
    try {
      await api.post(`/payables/invoices/${payTarget.id}/pay`, { cashAccountId: payForm.cashAccountId, amount: Number(payForm.amount) })
      setPayTarget(null); load()
    } catch (ex: any) { alert(ex.response?.data?.message ?? 'Error al registrar pago') }
    finally { setPaying(null) }
  }

  const cashAccounts11 = accounts.filter((a: any) => String(a.code ?? '').startsWith('11'))

  return (
    <>
      <div className="flex justify-end mb-4">
        <button onClick={openModal} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nueva Factura Proveedor
        </button>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          : rows.length === 0 ? <p className="text-gray-500 text-center py-16">Sin facturas de proveedores.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Número','Proveedor','Subtotal','Retención','Total','Estado','Vencimiento',''].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{r.number}</td>
                    <td className="px-4 py-3 text-gray-300">{r.vendor?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(Number(r.subtotal ?? 0))}</td>
                    <td className="px-4 py-3 text-orange-400">{fmt(Number(r.retentionAmount ?? 0))}</td>
                    <td className="px-4 py-3 text-white font-semibold">{fmt(Number(r.total ?? 0))}</td>
                    <td className="px-4 py-3">{statusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{r.dueDate ? new Date(r.dueDate).toLocaleDateString('es-CO') : '—'}</td>
                    <td className="px-4 py-3">
                      {['PENDING','PARTIAL'].includes(r.status) && (
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
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Nueva Factura de Proveedor</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Proveedor</label>
                  <select required value={form.vendorId} onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="">Seleccionar...</option>
                    {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Número</label>
                  <input type="text" required value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Fecha Emisión</label>
                  <input type="date" required value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Fecha Vencimiento</label>
                  <input type="date" required value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Retención (ej. 0.025)</label>
                  <input type="number" step="0.001" min="0" max="1" value={form.retentionPct} onChange={e => setForm(f => ({ ...f, retentionPct: Number(e.target.value) }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-sm">Líneas de Factura</label>
                  <button type="button" onClick={addLine} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1"><Plus size={12} /> Agregar</button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <input type="text" required placeholder="Descripción" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                        <input type="number" required min="0.01" step="0.01" placeholder="Cant." value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className="w-20 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                        <input type="number" required min="0" step="1" placeholder="Costo" value={line.unitCost} onChange={e => updateLine(i, 'unitCost', e.target.value)} className="w-28 bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                        {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>}
                      </div>
                      <select required value={line.accountId} onChange={e => updateLine(i, 'accountId', e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                        <option value="">Cuenta de gasto/costo (5x/6x)...</option>
                        {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
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
              <h2 className="text-lg font-bold text-white">Pagar Factura {payTarget.number}</h2>
              <button onClick={() => setPayTarget(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handlePay} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Cuenta de Pago (Caja/Bancos)</label>
                <select required value={payForm.cashAccountId} onChange={e => setPayForm(f => ({ ...f, cashAccountId: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">Seleccionar...</option>
                  {cashAccounts11.map((a: any) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Monto a Pagar</label>
                <input type="number" required min="1" step="1" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
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

// ─── Payments ─────────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/payables/payments').then(r => setRows(r.data?.data ?? r.data ?? [])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        : rows.length === 0 ? <p className="text-gray-500 text-center py-16">Sin pagos a proveedores registrados.</p>
        : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Fecha','Proveedor','Factura','Monto','Cuenta'].map(h => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.date ? new Date(r.date).toLocaleDateString('es-CO') : '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{r.vendor?.name ?? r.invoice?.vendor?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{r.invoice?.number ?? '—'}</td>
                  <td className="px-4 py-3 text-white font-semibold">{fmt(Number(r.amount))}</td>
                  <td className="px-4 py-3 text-gray-400">{r.cashAccount?.code} {r.cashAccount?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProveedoresPage() {
  const [tab, setTab] = useState<'vendors' | 'invoices' | 'payments'>('vendors')

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Proveedores</h1>
        <p className="text-gray-400 text-sm mt-1">Gestión de proveedores, facturas de compra y pagos</p>
      </div>

      <div className="flex gap-1 bg-gray-800 p-1 rounded-xl w-fit">
        {([['vendors','Proveedores'],['invoices','Facturas de Compra'],['payments','Pagos']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'vendors' && <VendorsTab />}
      {tab === 'invoices' && <PurchaseInvoicesTab />}
      {tab === 'payments' && <PaymentsTab />}
    </div>
  )
}
