import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, ArrowDownCircle, ArrowUpCircle, TrendingUp, Plus, Package, History } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const TYPES = ['PRODUCT', 'SERVICE', 'RAW_MATERIAL', 'FINISHED_GOOD']
const UNITS = ['UN', 'KG', 'M', 'M2', 'M3', 'LT', 'GL', 'HR', 'JOR', 'TON', 'ML', 'CM', 'BOL', 'CAJ']

const typeBadge = (t: string) => {
  const map: Record<string, string> = {
    PRODUCT:       'bg-indigo-900/40 text-indigo-300',
    SERVICE:       'bg-purple-900/40 text-purple-300',
    RAW_MATERIAL:  'bg-amber-900/40 text-amber-300',
    FINISHED_GOOD: 'bg-emerald-900/40 text-emerald-300',
  }
  const labels: Record<string, string> = {
    PRODUCT: 'Producto', SERVICE: 'Servicio',
    RAW_MATERIAL: 'Materia Prima', FINISHED_GOOD: 'Prod. Terminado',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[t] ?? 'bg-gray-700 text-gray-300'}`}>
      {labels[t] ?? t}
    </span>
  )
}

type StockModal = { type: 'entry' | 'exit'; itemId: string; sku: string; costPrice: string }
type TxModal   = { itemId: string; sku: string }

export default function InventoryPage() {
  const [items,     setItems]     = useState<any[]>([])
  const [valuation, setValuation] = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')

  // Modals
  const [newModal,   setNewModal]   = useState(false)
  const [stockModal, setStockModal] = useState<StockModal | null>(null)
  const [txModal,    setTxModal]    = useState<TxModal | null>(null)
  const [txList,     setTxList]     = useState<any[]>([])

  // New item form
  const [form, setForm] = useState({
    sku: '', name: '', description: '', type: 'PRODUCT', unitOfMeasure: 'UN',
    costPrice: '', sellingPrice: '', reorderPoint: '0',
  })

  // Stock movement form
  const [qty,  setQty]  = useState('')
  const [cost, setCost] = useState('')
  const [ref,  setRef]  = useState('')

  const [saving, setSaving] = useState(false)

  const load = () =>
    Promise.all([
      api.get('/inventory').then(r => setItems(r.data)),
      api.get('/inventory/stock/valuation').then(r => setValuation(r.data)),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const filtered = items.filter(i =>
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  // ── Create new inventory item ─────────────────────────────────────────────
  const createItem = async () => {
    if (!form.sku || !form.name) return alert('SKU y nombre son obligatorios')
    setSaving(true)
    try {
      await api.post('/inventory', {
        sku: form.sku,
        name: form.name,
        description: form.description || undefined,
        type: form.type,
        unitOfMeasure: form.unitOfMeasure,
        costPrice:    Number(form.costPrice)    || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        reorderPoint: Number(form.reorderPoint) || 0,
      })
      setNewModal(false)
      setForm({ sku: '', name: '', description: '', type: 'PRODUCT', unitOfMeasure: 'UN', costPrice: '', sellingPrice: '', reorderPoint: '0' })
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  // ── Stock movement ─────────────────────────────────────────────────────────
  const submitStock = async () => {
    if (!stockModal || !qty) return
    setSaving(true)
    try {
      if (stockModal.type === 'entry') {
        await api.post(`/inventory/${stockModal.itemId}/stock/entry`, {
          quantity: Number(qty), unitCost: Number(cost), reference: ref || undefined,
        })
      } else {
        await api.post(`/inventory/${stockModal.itemId}/stock/exit`, {
          quantity: Number(qty), reference: ref || undefined,
        })
      }
      setStockModal(null); setQty(''); setCost(''); setRef('')
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error')
    } finally {
      setSaving(false)
    }
  }

  // ── View transactions ──────────────────────────────────────────────────────
  const viewTx = async (item: any) => {
    setTxModal({ itemId: item.id, sku: item.sku })
    const r = await api.get(`/inventory/${item.id}/stock/transactions`)
    setTxList(r.data)
  }

  const inp = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500'
  const lbl = 'block text-xs text-gray-400 mb-1'

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventario</h1>
          <p className="text-gray-400 text-sm mt-1">{items.length} ítems registrados</p>
        </div>
        <div className="flex items-center gap-3">
          {valuation && (
            <div className="bg-indigo-900/30 border border-indigo-700 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-400" />
              <div>
                <p className="text-xs text-indigo-400">Valor total</p>
                <p className="text-base font-bold text-white">{fmt(Number(valuation.totals?.totalInventoryValue ?? 0))}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setNewModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Plus size={16} /> Nuevo Ítem
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Buscar por SKU o nombre…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
      />

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">Sin ítems de inventario</p>
            <p className="text-gray-500 text-sm mt-1">Haz clic en "Nuevo Ítem" para agregar el primer producto</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['SKU', 'Nombre', 'Tipo', 'Unidad', 'Stock', 'P.Costo (WAC)', 'P.Venta', 'Valor Stock', 'P.Reorden', 'Acciones'].map(h => (
                  <th key={h} className="px-3 py-3 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const low = Number(item.quantityOnHand) <= Number(item.reorderPoint)
                return (
                  <tr key={item.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-3 py-3 text-indigo-400 font-mono text-xs">{item.sku}</td>
                    <td className="px-3 py-3 text-white font-medium max-w-[180px]">
                      {item.name}
                      {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                    </td>
                    <td className="px-3 py-3">{typeBadge(item.type)}</td>
                    <td className="px-3 py-3 text-gray-400 text-xs">{item.unitOfMeasure}</td>
                    <td className="px-3 py-3">
                      <span className={`font-bold text-sm ${low ? 'text-red-400' : 'text-white'}`}>
                        {Number(item.quantityOnHand).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                      </span>
                      {low && <span className="ml-1 text-xs text-red-500">⚠ bajo</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-300">{fmt(Number(item.costPrice))}</td>
                    <td className="px-3 py-3 text-gray-300">{fmt(Number(item.sellingPrice))}</td>
                    <td className="px-3 py-3 text-emerald-400 font-semibold">
                      {fmt(Number(item.quantityOnHand) * Number(item.costPrice))}
                    </td>
                    <td className="px-3 py-3 text-gray-400 text-xs">
                      {Number(item.reorderPoint).toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          onClick={() => { setStockModal({ type: 'entry', itemId: item.id, sku: item.sku, costPrice: item.costPrice }); setCost(item.costPrice) }}
                          className="flex items-center gap-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-xs px-2 py-1.5 rounded-lg whitespace-nowrap"
                        >
                          <ArrowDownCircle size={11} /> Entrada
                        </button>
                        <button
                          onClick={() => setStockModal({ type: 'exit', itemId: item.id, sku: item.sku, costPrice: item.costPrice })}
                          className="flex items-center gap-1 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xs px-2 py-1.5 rounded-lg whitespace-nowrap"
                        >
                          <ArrowUpCircle size={11} /> Salida
                        </button>
                        <button
                          onClick={() => viewTx(item)}
                          className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs px-2 py-1.5 rounded-lg"
                        >
                          <History size={11} /> Movimientos
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ MODAL: Nuevo Ítem ══════════════════════════════════════════════ */}
      {newModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg border border-gray-600 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package size={20} className="text-indigo-400" /> Nuevo Ítem de Inventario
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>SKU / Código *</label>
                <input className={inp} placeholder="MAT-001" value={form.sku}
                  onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>Tipo *</label>
                <select className={inp} value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="PRODUCT">Producto</option>
                  <option value="SERVICE">Servicio</option>
                  <option value="RAW_MATERIAL">Materia Prima</option>
                  <option value="FINISHED_GOOD">Producto Terminado</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Nombre / Descripción *</label>
                <input className={inp} placeholder="Cemento Portland 50kg" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Descripción detallada</label>
                <input className={inp} placeholder="Especificaciones adicionales…" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Unidad de medida</label>
                <select className={inp} value={form.unitOfMeasure}
                  onChange={e => setForm(f => ({ ...f, unitOfMeasure: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Punto de reorden</label>
                <input className={inp} type="number" min="0" placeholder="0" value={form.reorderPoint}
                  onChange={e => setForm(f => ({ ...f, reorderPoint: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Precio de costo (COP)</label>
                <input className={inp} type="number" min="0" placeholder="0" value={form.costPrice}
                  onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Precio de venta (COP)</label>
                <input className={inp} type="number" min="0" placeholder="0" value={form.sellingPrice}
                  onChange={e => setForm(f => ({ ...f, sellingPrice: e.target.value }))} />
              </div>
            </div>

            <p className="text-xs text-gray-500">* El stock inicial se ingresa después con "Entrada de Stock"</p>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setNewModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2.5 text-sm">
                Cancelar
              </button>
              <button onClick={createItem} disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Crear Ítem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Entrada / Salida de Stock ══════════════════════════════ */}
      {stockModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-600 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {stockModal.type === 'entry'
                ? <><ArrowDownCircle size={20} className="text-emerald-400" /> Entrada de Stock</>
                : <><ArrowUpCircle  size={20} className="text-red-400"     /> Salida de Stock</>
              }
            </h2>
            <p className="text-sm text-gray-400">Ítem: <span className="text-white font-medium">{stockModal.sku}</span></p>

            <div>
              <label className={lbl}>Cantidad *</label>
              <input type="number" min="0.0001" step="0.0001" value={qty}
                onChange={e => setQty(e.target.value)} className={inp}
                placeholder="0" autoFocus />
            </div>

            {stockModal.type === 'entry' && (
              <div>
                <label className={lbl}>Costo unitario * (recalcula WAC automáticamente)</label>
                <input type="number" min="0" value={cost}
                  onChange={e => setCost(e.target.value)} className={inp}
                  placeholder="0" />
              </div>
            )}

            <div>
              <label className={lbl}>Referencia / Nota (opcional)</label>
              <input type="text" value={ref} onChange={e => setRef(e.target.value)} className={inp}
                placeholder="Ej: OC-2025-001, Orden de salida…" />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => { setStockModal(null); setQty(''); setCost(''); setRef('') }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2.5 text-sm">
                Cancelar
              </button>
              <button onClick={submitStock} disabled={saving}
                className={`flex-1 ${stockModal.type === 'entry' ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-red-800 hover:bg-red-700'} disabled:opacity-60 text-white rounded-lg py-2.5 text-sm flex items-center justify-center gap-2`}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {stockModal.type === 'entry' ? 'Registrar Entrada' : 'Registrar Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Historial de Movimientos ════════════════════════════════ */}
      {txModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-2xl border border-gray-600 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History size={20} className="text-indigo-400" /> Movimientos — {txModal.sku}
              </h2>
              <button onClick={() => { setTxModal(null); setTxList([]) }}
                className="text-gray-400 hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1">
              {txList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Sin movimientos registrados</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                      {['Tipo', 'Cant.', 'Costo unit.', 'Total', 'Stock ant.', 'WAC ant.', 'Stock nuevo', 'WAC nuevo', 'Fecha'].map(h => (
                        <th key={h} className="px-3 py-2 text-left whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txList.map((tx: any) => (
                      <tr key={tx.id} className="border-t border-gray-700 hover:bg-gray-750">
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tx.type === 'ENTRY' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                            {tx.type === 'ENTRY' ? '↓ Entrada' : '↑ Salida'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white">{Number(tx.quantity).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-gray-300">{fmt(Number(tx.unitCost))}</td>
                        <td className="px-3 py-2 text-gray-300">{fmt(Number(tx.totalCost))}</td>
                        <td className="px-3 py-2 text-gray-400">{Number(tx.quantityBefore).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-gray-400">{fmt(Number(tx.wacBefore))}</td>
                        <td className="px-3 py-2 text-white font-medium">{Number(tx.quantityAfter).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2 text-indigo-300">{fmt(Number(tx.wacAfter))}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{new Date(tx.createdAt).toLocaleDateString('es-CO')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
