import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Loader2, Plus, Send, Eye, X, Trash2 } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const statusBadge = (s: string) => {
  const cls: Record<string, string> = {
    DRAFT:  'bg-yellow-900/40 text-yellow-400',
    ISSUED: 'bg-emerald-900/40 text-emerald-400',
    PAID:   'bg-blue-900/40 text-blue-400',
    VOIDED: 'bg-red-900/40 text-red-400',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] ?? ''}`}>{s}</span>
}

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  inventoryItemId?: string
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])

  // Form state
  const [number, setNumber] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [taxRate, setTaxRate] = useState(0.19)
  const [lines, setLines] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0 }])

  // Account IDs - pre-filled for the demo tenant
  const AR_ID  = '9ec05585-2317-4869-920c-e50075a9bdc8'
  const REV_ID = 'bdc0907b-61ef-4f93-b00a-18563d947481'
  const TAX_ID = '1aa42608-f722-46dc-b0ff-c3457739a573'

  const load = () => {
    setLoading(true)
    api.get('/invoices').then(r => setInvoices(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = async () => {
    setShowModal(true)
    setNumber('')
    setCustomerId('')
    setTaxRate(0.19)
    setLines([{ description: '', quantity: 1, unitPrice: 0 }])
    try {
      const [custRes, invRes] = await Promise.all([
        api.get('/customers'),
        api.get('/inventory'),
      ])
      setCustomers(custRes.data?.data ?? custRes.data ?? [])
      setInventory(invRes.data?.data ?? invRes.data ?? [])
    } catch {}
  }

  const addLine = () => setLines(l => [...l, { description: '', quantity: 1, unitPrice: 0 }])
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))
  const updateLine = (i: number, field: keyof LineItem, value: string | number) => {
    setLines(l => l.map((line, idx) => idx === i ? { ...line, [field]: value } : line))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload: any = {
        customerId,
        number,
        taxRate,
        lines: lines.map(l => ({
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          ...(l.inventoryItemId ? { inventoryItemId: l.inventoryItemId } : {}),
        })),
      }
      await api.post('/invoices', payload)
      setShowModal(false)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error al crear factura')
    } finally {
      setSaving(false)
    }
  }

  const issueInvoice = async (id: string) => {
    setIssuing(id)
    try {
      await api.post(`/invoices/${id}/issue`, {
        arAccountId: AR_ID,
        revenueAccountId: REV_ID,
        taxAccountId: TAX_ID,
      })
      load()
      alert('Factura emitida exitosamente')
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error al emitir')
    } finally {
      setIssuing(null)
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + Number(l.quantity) * Number(l.unitPrice), 0)
  const tax = subtotal * taxRate
  const total = subtotal + tax

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturas de Venta</h1>
          <p className="text-gray-400 text-sm mt-1">{invoices.length} facturas registradas</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Nueva Factura
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-16">Sin facturas. Crea la primera con el botón "Nueva Factura".</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Número','Cliente','Subtotal','IVA','Total','Estado','Fecha','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{inv.number}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{fmt(Number(inv.subtotal))}</td>
                  <td className="px-4 py-3 text-gray-400">{fmt(Number(inv.taxAmount))}</td>
                  <td className="px-4 py-3 text-white font-semibold">{fmt(Number(inv.total))}</td>
                  <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {inv.status === 'DRAFT' && (
                        <button
                          onClick={() => issueInvoice(inv.id)}
                          disabled={issuing === inv.id}
                          className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {issuing === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Emitir
                        </button>
                      )}
                      {inv.journalEntryId && (
                        <button
                          onClick={() => navigate('/journal-entries')}
                          className="flex items-center gap-1 bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-400 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <Eye size={12} /> Ver Asiento
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">Nueva Factura de Venta</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Número de Factura</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={e => setNumber(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="FV-001"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Tarifa IVA</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    required
                    value={taxRate}
                    onChange={e => setTaxRate(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-1">Cliente</label>
                <select
                  required
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Seleccionar cliente...</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-400 text-sm">Ítems de Factura</label>
                  <button type="button" onClick={addLine} className="text-indigo-400 hover:text-indigo-300 text-xs flex items-center gap-1">
                    <Plus size={12} /> Agregar ítem
                  </button>
                </div>
                <div className="space-y-2">
                  {lines.map((line, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1">
                          <input
                            type="text"
                            required
                            placeholder="Descripción"
                            value={line.description}
                            onChange={e => updateLine(i, 'description', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="w-20">
                          <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            placeholder="Cant."
                            value={line.quantity}
                            onChange={e => updateLine(i, 'quantity', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="w-28">
                          <input
                            type="number"
                            required
                            min="0"
                            step="1"
                            placeholder="P. Unit"
                            value={line.unitPrice}
                            onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300 mt-2">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div>
                        <select
                          value={line.inventoryItemId ?? ''}
                          onChange={e => updateLine(i, 'inventoryItemId', e.target.value || '')}
                          className="w-full bg-gray-700 border border-gray-600 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                        >
                          <option value="">Sin ítem de inventario (opcional)</option>
                          {inventory.map((item: any) => (
                            <option key={item.id} value={item.id}>{item.name} — {item.sku ?? ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals preview */}
              <div className="bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                <div className="flex justify-between text-gray-400"><span>IVA ({(taxRate * 100).toFixed(0)}%)</span><span>{fmt(tax)}</span></div>
                <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-1 mt-1"><span>Total</span><span>{fmt(total)}</span></div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Crear Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
