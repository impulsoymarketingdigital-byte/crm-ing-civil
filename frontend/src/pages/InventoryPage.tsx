import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, ArrowDownCircle, ArrowUpCircle, TrendingUp } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [valuation, setValuation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ type: 'entry' | 'exit'; itemId: string; sku: string } | null>(null)
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () =>
    Promise.all([
      api.get('/inventory').then(r => setItems(r.data)),
      api.get('/inventory/stock/valuation').then(r => setValuation(r.data)),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!modal || !qty) return
    setSaving(true)
    try {
      if (modal.type === 'entry') {
        await api.post(`/inventory/${modal.itemId}/stock/entry`, { quantity: Number(qty), unitCost: Number(cost) })
      } else {
        await api.post(`/inventory/${modal.itemId}/stock/exit`, { quantity: Number(qty) })
      }
      setModal(null); setQty(''); setCost('')
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} productos activos</p>
        </div>
        {valuation && (
          <div className="bg-indigo-900/30 border border-indigo-700 rounded-xl px-5 py-3 flex items-center gap-3">
            <TrendingUp size={20} className="text-indigo-400" />
            <div>
              <p className="text-xs text-indigo-400">Valor total inventario</p>
              <p className="text-lg font-bold text-white">{fmt(Number(valuation.totals.totalInventoryValue))}</p>
            </div>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['SKU','Nombre','Tipo','Stock','WAC','Valor','Reorden','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{item.sku}</td>
                  <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{item.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${Number(item.quantityOnHand) <= Number(item.reorderPoint) ? 'text-red-400' : 'text-white'}`}>
                      {Number(item.quantityOnHand).toFixed(0)} {item.unitOfMeasure}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{fmt(Number(item.costPrice))}</td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold">
                    {fmt(Number(item.quantityOnHand) * Number(item.costPrice))}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{Number(item.reorderPoint).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => { setModal({ type: 'entry', itemId: item.id, sku: item.sku }); setCost(item.costPrice) }}
                        className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-300 text-xs px-2.5 py-1.5 rounded-lg">
                        <ArrowDownCircle size={12} /> Entrada
                      </button>
                      <button onClick={() => setModal({ type: 'exit', itemId: item.id, sku: item.sku })}
                        className="flex items-center gap-1 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xs px-2.5 py-1.5 rounded-lg">
                        <ArrowUpCircle size={12} /> Salida
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-600 space-y-4">
            <h2 className="text-lg font-bold text-white">
              {modal.type === 'entry' ? 'Entrada de Stock' : 'Salida de Stock'} — {modal.sku}
            </h2>
            <div>
              <label className="block text-sm text-gray-300 mb-1.5">Cantidad</label>
              <input type="number" min="0.0001" step="0.0001" value={qty} onChange={e => setQty(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm" />
            </div>
            {modal.type === 'entry' && (
              <div>
                <label className="block text-sm text-gray-300 mb-1.5">Costo unitario (recalcula WAC)</label>
                <input type="number" min="0" value={cost} onChange={e => setCost(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm" />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2.5 text-sm">Cancelar</button>
              <button onClick={submit} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
