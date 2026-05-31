import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, ChevronDown, ChevronRight, Calculator } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const TYPE_COLORS: Record<string, string> = {
  MATERIAL:  'bg-blue-900/40 text-blue-400',
  LABOR:     'bg-emerald-900/40 text-emerald-400',
  EQUIPMENT: 'bg-violet-900/40 text-violet-400',
}

export default function ApuPage() {
  const [chapters, setChapters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [itemDetail, setItemDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Chapter modal
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [chapterForm, setChapterForm] = useState({ code: '', name: '' })
  const [savingChapter, setSavingChapter] = useState(false)

  // Item modal
  const [showItemModal, setShowItemModal] = useState(false)
  const [itemChapterId, setItemChapterId] = useState('')
  const [itemForm, setItemForm] = useState({ code: '', name: '', unit: '', laborFactor: '1' })
  const [savingItem, setSavingItem] = useState(false)

  // Input form (inline)
  const [inputForm, setInputForm] = useState({ type: 'MATERIAL', description: '', unit: '', quantity: '', unitCost: '' })
  const [savingInput, setSavingInput] = useState(false)

  const loadChapters = () => {
    setLoading(true)
    api.get('/apu/chapters').then(r => setChapters(r.data)).finally(() => setLoading(false))
  }

  const loadItemDetail = (item: any) => {
    setSelectedItem(item)
    setLoadingDetail(true)
    api.get(`/apu/chapters/${item.chapterId}`).then(r => {
      const found = r.data?.items?.find((i: any) => i.id === item.id)
      setItemDetail(found ?? item)
    }).catch(() => setItemDetail(item)).finally(() => setLoadingDetail(false))
  }

  useEffect(() => { loadChapters() }, [])

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const submitChapter = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingChapter(true)
    try {
      await api.post('/apu/chapters', chapterForm)
      setShowChapterModal(false)
      setChapterForm({ code: '', name: '' })
      loadChapters()
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setSavingChapter(false) }
  }

  const submitItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingItem(true)
    try {
      await api.post('/apu/items', { ...itemForm, chapterId: itemChapterId, laborFactor: Number(itemForm.laborFactor) })
      setShowItemModal(false)
      setItemForm({ code: '', name: '', unit: '', laborFactor: '1' })
      loadChapters()
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setSavingItem(false) }
  }

  const submitInput = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    setSavingInput(true)
    try {
      await api.post(`/apu/items/${selectedItem.id}/inputs`, {
        ...inputForm,
        quantity: Number(inputForm.quantity),
        unitCost: Number(inputForm.unitCost),
      })
      setInputForm({ type: 'MATERIAL', description: '', unit: '', quantity: '', unitCost: '' })
      loadItemDetail(selectedItem)
      loadChapters()
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setSavingInput(false) }
  }

  const inputs: any[] = itemDetail?.inputs ?? []
  const materialCost = inputs.filter(i => i.type === 'MATERIAL').reduce((s, i) => s + Number(i.totalCost ?? 0), 0)
  const laborCost = inputs.filter(i => i.type === 'LABOR').reduce((s, i) => s + Number(i.totalCost ?? 0), 0) * Number(itemDetail?.laborFactor ?? 1)
  const equipmentCost = inputs.filter(i => i.type === 'EQUIPMENT').reduce((s, i) => s + Number(i.totalCost ?? 0), 0)
  const totalUnitCost = materialCost + laborCost + equipmentCost

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">APU — Análisis de Precios Unitarios</h1>
          <p className="text-gray-400 text-sm mt-1">{chapters.length} capítulos registrados</p>
        </div>
        <button
          onClick={() => setShowChapterModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Nuevo Capítulo
        </button>
      </div>

      <div className="flex gap-6 min-h-[60vh]">
        {/* Left panel — chapters */}
        <div className="w-80 flex-shrink-0 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          ) : chapters.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-500">
              <Calculator size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Sin capítulos APU</p>
            </div>
          ) : chapters.map(ch => (
            <div key={ch.id} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => toggleExpand(ch.id)}
              >
                <div className="flex items-center gap-2">
                  {expanded.has(ch.id) ? <ChevronDown size={15} className="text-indigo-400" /> : <ChevronRight size={15} className="text-gray-500" />}
                  <span className="text-xs text-indigo-400 font-mono">{ch.code}</span>
                  <span className="text-sm text-white font-medium">{ch.name}</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setItemChapterId(ch.id); setShowItemModal(true) }}
                  className="text-gray-400 hover:text-indigo-400 transition-colors"
                  title="Agregar ítem"
                >
                  <Plus size={15} />
                </button>
              </div>
              {expanded.has(ch.id) && (
                <div className="border-t border-gray-700">
                  {(ch.items ?? []).length === 0 ? (
                    <p className="px-4 py-3 text-gray-500 text-xs">Sin ítems en este capítulo</p>
                  ) : (ch.items ?? []).map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => loadItemDetail({ ...item, chapterId: ch.id })}
                      className={`px-4 py-2.5 cursor-pointer border-t border-gray-700 hover:bg-gray-700 transition-colors ${selectedItem?.id === item.id ? 'bg-indigo-900/30 border-l-2 border-l-indigo-500' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-indigo-400 font-mono">{item.code}</p>
                          <p className="text-sm text-white">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.unit}</p>
                        </div>
                        <p className="text-xs text-emerald-400 font-semibold mt-1">{fmt(Number(item.totalUnitCost ?? 0))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right panel — item detail */}
        <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {!selectedItem ? (
            <div className="flex flex-col items-center justify-center h-full py-24 text-gray-500">
              <Calculator size={44} className="mb-3 opacity-30" />
              <p>Selecciona un ítem para ver el detalle</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          ) : (
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs text-indigo-400 font-mono">{itemDetail?.code}</p>
                <h2 className="text-white text-lg font-semibold">{itemDetail?.name}</h2>
                <p className="text-gray-400 text-sm">Unidad: {itemDetail?.unit} · Factor mano de obra: {itemDetail?.laborFactor ?? 1}</p>
              </div>

              {/* Inputs table */}
              <div className="rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-700 bg-gray-900/40">
                      {['Tipo','Descripción','Unidad','Cantidad','Costo Unit.','Total'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inputs.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">Sin insumos. Agrega el primero abajo.</td></tr>
                    ) : inputs.map((inp: any) => (
                      <tr key={inp.id} className="border-t border-gray-700 hover:bg-gray-750">
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[inp.type] ?? ''}`}>{inp.type}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-200">{inp.description}</td>
                        <td className="px-3 py-2.5 text-gray-400">{inp.unit}</td>
                        <td className="px-3 py-2.5 text-gray-300">{inp.quantity}</td>
                        <td className="px-3 py-2.5 text-gray-300">{fmt(Number(inp.unitCost))}</td>
                        <td className="px-3 py-2.5 text-white font-medium">{fmt(Number(inp.totalCost ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add input form */}
              <form onSubmit={submitInput} className="bg-gray-900/60 rounded-lg border border-gray-700 p-4 space-y-3">
                <p className="text-xs text-gray-400 font-semibold uppercase">Agregar Insumo</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                    <select value={inputForm.type} onChange={e => setInputForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="MATERIAL">Material</option>
                      <option value="LABOR">Mano de Obra</option>
                      <option value="EQUIPMENT">Equipo</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                    <input value={inputForm.description} onChange={e => setInputForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Ej: Cemento Portland" required
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Unidad</label>
                    <input value={inputForm.unit} onChange={e => setInputForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder="kg" required
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Cantidad</label>
                    <input type="number" step="any" value={inputForm.quantity} onChange={e => setInputForm(f => ({ ...f, quantity: e.target.value }))}
                      placeholder="1.5" required
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Costo Unitario</label>
                    <input type="number" step="any" value={inputForm.unitCost} onChange={e => setInputForm(f => ({ ...f, unitCost: e.target.value }))}
                      placeholder="50000" required
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <button type="submit" disabled={savingInput} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {savingInput ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Agregar Insumo
                </button>
              </form>

              {/* Cost summary */}
              <div className="bg-gray-900/60 rounded-lg border border-gray-700 p-4">
                <p className="text-xs text-gray-400 font-semibold uppercase mb-3">Resumen de Costos</p>
                {[
                  { label: 'Materiales', val: materialCost, color: 'text-blue-400' },
                  { label: `Mano de Obra (×${itemDetail?.laborFactor ?? 1})`, val: laborCost, color: 'text-emerald-400' },
                  { label: 'Equipos', val: equipmentCost, color: 'text-violet-400' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-sm py-1">
                    <span className="text-gray-400">{r.label}</span>
                    <span className={r.color}>{fmt(r.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2 mt-2">
                  <span className="text-white">Costo Total Unitario</span>
                  <span className="text-indigo-400">{fmt(totalUnitCost)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chapter Modal */}
      {showChapterModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Nuevo Capítulo APU</h2>
              <button onClick={() => setShowChapterModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={submitChapter} className="px-6 py-5 space-y-4">
              {[{ name: 'code', label: 'Código', placeholder: 'CAP-01' }, { name: 'name', label: 'Nombre', placeholder: 'Cimentación' }].map(f => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input name={f.name} value={(chapterForm as any)[f.name]}
                    onChange={e => setChapterForm(c => ({ ...c, [e.target.name]: e.target.value }))}
                    placeholder={f.placeholder} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowChapterModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-lg">Cancelar</button>
                <button type="submit" disabled={savingChapter} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2">
                  {savingChapter && <Loader2 size={13} className="animate-spin" />} Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Nuevo Ítem APU</h2>
              <button onClick={() => setShowItemModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={submitItem} className="px-6 py-5 space-y-4">
              {[
                { name: 'code', label: 'Código', placeholder: 'APU-001' },
                { name: 'name', label: 'Descripción', placeholder: 'Excavación manual' },
                { name: 'unit', label: 'Unidad', placeholder: 'm³' },
                { name: 'laborFactor', label: 'Factor M.O.', placeholder: '1' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input name={f.name} value={(itemForm as any)[f.name]}
                    onChange={e => setItemForm(i => ({ ...i, [e.target.name]: e.target.value }))}
                    placeholder={f.placeholder} required type={f.name === 'laborFactor' ? 'number' : 'text'}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowItemModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-lg">Cancelar</button>
                <button type="submit" disabled={savingItem} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2">
                  {savingItem && <Loader2 size={13} className="animate-spin" />} Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
