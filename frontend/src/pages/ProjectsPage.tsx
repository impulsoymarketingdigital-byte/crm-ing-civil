import { useEffect, useState, useCallback } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, FolderOpen, X } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const statusColors: Record<string, string> = {
  PLANNING:  'bg-gray-700 text-gray-300',
  ACTIVE:    'bg-emerald-900/40 text-emerald-400',
  ON_HOLD:   'bg-yellow-900/40 text-yellow-400',
  COMPLETED: 'bg-blue-900/40 text-blue-400',
  CANCELLED: 'bg-red-900/40 text-red-400',
}

const statusBadge = (s: string) => (
  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[s] ?? 'bg-gray-700 text-gray-300'}`}>{s}</span>
)

const EMPTY_FORM = {
  code: '', name: '', clientName: '', location: '',
  contractValue: '', adminPct: '', riskPct: '', profitPct: '',
}

type AiuResult = {
  adminAmount: number; riskAmount: number; profitAmount: number
  aiuAmount: number; totalValue: number
} | null

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [aiu, setAiu] = useState<AiuResult>(null)
  const [aiuLoading, setAiuLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = () => api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  // Debounced AIU calculation
  useEffect(() => {
    const { contractValue, adminPct, riskPct, profitPct } = form
    if (!contractValue || !adminPct || !riskPct || !profitPct) { setAiu(null); return }
    const t = setTimeout(async () => {
      setAiuLoading(true)
      try {
        const r = await api.post('/projects/aiu/calculate', {
          contractValue: Number(contractValue),
          adminPct: Number(adminPct),
          riskPct: Number(riskPct),
          profitPct: Number(profitPct),
        })
        setAiu(r.data)
      } catch { setAiu(null) } finally { setAiuLoading(false) }
    }, 500)
    return () => clearTimeout(t)
  }, [form.contractValue, form.adminPct, form.riskPct, form.profitPct])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/projects', {
        ...form,
        contractValue: Number(form.contractValue),
        adminPct: Number(form.adminPct),
        riskPct: Number(form.riskPct),
        profitPct: Number(form.profitPct),
      })
      setShowModal(false)
      setForm({ ...EMPTY_FORM })
      setAiu(null)
      load()
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error al crear proyecto')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proyectos</h1>
          <p className="text-gray-400 text-sm mt-1">{projects.length} proyectos registrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Nuevo Proyecto
        </button>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <FolderOpen size={40} className="mb-3 opacity-40" />
            <p>Sin proyectos. Crea el primero.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Código','Nombre','Cliente','Estado','Valor Contrato','Valor Total (AIU)','Inicio'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-300">{p.clientName}</td>
                  <td className="px-4 py-3">{statusBadge(p.status)}</td>
                  <td className="px-4 py-3 text-gray-300">{fmt(Number(p.contractValue))}</td>
                  <td className="px-4 py-3 text-white font-semibold">{p.totalValue ? fmt(Number(p.totalValue)) : '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {p.startDate ? new Date(p.startDate).toLocaleDateString('es-CO') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Nuevo Proyecto</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {[
                { name: 'code', label: 'Código', placeholder: 'OBR-001' },
                { name: 'name', label: 'Nombre del Proyecto', placeholder: 'Construcción vía...' },
                { name: 'clientName', label: 'Cliente', placeholder: 'Nombre entidad/cliente' },
                { name: 'location', label: 'Ubicación', placeholder: 'Ciudad, Departamento' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                  <input
                    name={f.name}
                    value={(form as any)[f.name]}
                    onChange={handleChange}
                    placeholder={f.placeholder}
                    required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor del Contrato (COP)</label>
                <input
                  name="contractValue"
                  type="number"
                  value={form.contractValue}
                  onChange={handleChange}
                  placeholder="1000000000"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'adminPct', label: 'Admin (%)' },
                  { name: 'riskPct', label: 'Riesgo (%)' },
                  { name: 'profitPct', label: 'Utilidad (%)' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                    <input
                      name={f.name}
                      type="number"
                      step="0.1"
                      value={(form as any)[f.name]}
                      onChange={handleChange}
                      placeholder="5"
                      required
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              {/* AIU Preview */}
              {(aiuLoading || aiu) && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Cálculo AIU</p>
                  {aiuLoading ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm"><Loader2 size={14} className="animate-spin" /> Calculando...</div>
                  ) : aiu && (
                    <>
                      {[
                        { label: 'Administración', val: aiu.adminAmount },
                        { label: 'Imprevistos', val: aiu.riskAmount },
                        { label: 'Utilidad', val: aiu.profitAmount },
                        { label: 'AIU Total', val: aiu.aiuAmount },
                      ].map(r => (
                        <div key={r.label} className="flex justify-between text-sm">
                          <span className="text-gray-400">{r.label}</span>
                          <span className="text-gray-200">{fmt(r.val)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-2 mt-2">
                        <span className="text-white">Valor Total</span>
                        <span className="text-indigo-400">{fmt(aiu.totalValue)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
