import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, ChevronDown, ChevronRight, FileText, CheckCircle } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const pct = (n: number) => `${Number(n).toFixed(1)}%`

export default function BudgetPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [budgets, setBudgets] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<any>(null)
  const [budgetDetail, setBudgetDetail] = useState<any>(null)
  const [vsActual, setVsActual] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set())
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm] = useState({ name: '', version: '1', projectId: '' })
  const [saving, setSaving] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data))
  }, [])

  const loadBudgets = (projectId: string) => {
    if (!projectId) return
    setLoading(true)
    api.get(`/budgets?projectId=${projectId}`).then(r => setBudgets(r.data)).finally(() => setLoading(false))
  }

  const loadBudgetDetail = (budget: any) => {
    setSelectedBudget(budget)
    setLoadingDetail(true)
    Promise.all([
      api.get(`/budgets/${budget.id}`),
      api.get(`/budgets/${budget.id}/vs-actual`).catch(() => ({ data: [] })),
    ]).then(([detail, vs]) => {
      setBudgetDetail(detail.data)
      setVsActual(Array.isArray(vs.data) ? vs.data : [])
    }).finally(() => setLoadingDetail(false))
  }

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(e.target.value)
    setBudgets([])
    setSelectedBudget(null)
    setBudgetDetail(null)
    loadBudgets(e.target.value)
  }

  const toggleChapter = (id: string) =>
    setExpandedChapters(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const submitNewBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/budgets', { ...newForm, version: Number(newForm.version), projectId: newForm.projectId || selectedProject })
      setShowNewModal(false)
      setNewForm({ name: '', version: '1', projectId: '' })
      loadBudgets(selectedProject)
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setSaving(false) }
  }

  const approveBudget = async (id: string) => {
    setApprovingId(id)
    try {
      await api.patch(`/budgets/${id}/approve`)
      loadBudgets(selectedProject)
      if (selectedBudget?.id === id) loadBudgetDetail({ id })
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setApprovingId(null) }
  }

  const chapters = budgetDetail?.chapters ?? []
  const directCost = Number(budgetDetail?.directCost ?? 0)
  const aiuAmount = Number(budgetDetail?.aiuAmount ?? 0)
  const totalBudget = Number(budgetDetail?.totalBudget ?? 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Presupuestos</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de presupuestos por proyecto</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Nuevo Presupuesto
        </button>
      </div>

      {/* Project selector */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Proyecto</label>
          <select value={selectedProject} onChange={handleProjectChange}
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
            <option value="">— Selecciona un proyecto —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Budget list */}
      {selectedProject && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          ) : budgets.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-500"><FileText size={36} className="mb-3 opacity-40" /><p>Sin presupuestos para este proyecto</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Nombre','Versión','Estado','Costo Directo','AIU','Total',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {budgets.map(b => (
                  <tr key={b.id} className={`border-t border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${selectedBudget?.id === b.id ? 'bg-indigo-900/20' : ''}`}
                    onClick={() => loadBudgetDetail(b)}>
                    <td className="px-4 py-3 text-white font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-gray-400">v{b.version}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        b.status === 'APPROVED' ? 'bg-emerald-900/40 text-emerald-400' :
                        b.status === 'DRAFT' ? 'bg-yellow-900/40 text-yellow-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{fmt(Number(b.directCost ?? 0))}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(Number(b.aiuAmount ?? 0))}</td>
                    <td className="px-4 py-3 text-white font-semibold">{fmt(Number(b.totalBudget ?? 0))}</td>
                    <td className="px-4 py-3">
                      {b.status === 'DRAFT' && (
                        <button
                          onClick={e => { e.stopPropagation(); approveBudget(b.id) }}
                          disabled={approvingId === b.id}
                          className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {approvingId === b.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Aprobar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Budget detail */}
      {selectedBudget && (
        <div className="space-y-4">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          ) : budgetDetail && (
            <>
              {/* Chapters */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-700">
                  <h2 className="text-sm font-semibold text-gray-300">Detalle por Capítulos</h2>
                </div>
                {chapters.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">Sin capítulos en este presupuesto</p>
                ) : chapters.map((ch: any) => (
                  <div key={ch.id} className="border-t border-gray-700">
                    <div
                      className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-750 transition-colors"
                      onClick={() => toggleChapter(ch.id)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedChapters.has(ch.id) ? <ChevronDown size={14} className="text-indigo-400" /> : <ChevronRight size={14} className="text-gray-500" />}
                        <span className="text-white font-medium text-sm">{ch.code} — {ch.name}</span>
                      </div>
                      <span className="text-emerald-400 font-semibold text-sm">{fmt(Number(ch.totalCost ?? 0))}</span>
                    </div>
                    {expandedChapters.has(ch.id) && (
                      <div className="border-t border-gray-700/60">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase bg-gray-900/40">
                              {['Código','Descripción','Unidad','Cantidad','Costo Unit.','Total'].map(h => (
                                <th key={h} className="px-5 py-2 text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(ch.lines ?? []).map((line: any) => (
                              <tr key={line.id} className="border-t border-gray-700/40 hover:bg-gray-750">
                                <td className="px-5 py-2 text-indigo-400 font-mono text-xs">{line.code}</td>
                                <td className="px-5 py-2 text-gray-200">{line.description}</td>
                                <td className="px-5 py-2 text-gray-400">{line.unit}</td>
                                <td className="px-5 py-2 text-gray-300">{line.quantity}</td>
                                <td className="px-5 py-2 text-gray-300">{fmt(Number(line.unitCost ?? 0))}</td>
                                <td className="px-5 py-2 text-white font-medium">{fmt(Number(line.totalCost ?? 0))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* AIU Footer */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
                <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Desglose AIU</p>
                <div className="space-y-2">
                  {[
                    { label: 'Costo Directo', val: directCost, style: 'text-gray-200' },
                    { label: `Administración (${pct(budgetDetail.adminPct ?? 0)})`, val: Number(budgetDetail.adminAmount ?? 0), style: 'text-gray-300' },
                    { label: `Imprevistos (${pct(budgetDetail.riskPct ?? 0)})`, val: Number(budgetDetail.riskAmount ?? 0), style: 'text-gray-300' },
                    { label: `Utilidad (${pct(budgetDetail.profitPct ?? 0)})`, val: Number(budgetDetail.profitAmount ?? 0), style: 'text-gray-300' },
                    { label: 'AIU Total', val: aiuAmount, style: 'text-yellow-400' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-sm">
                      <span className="text-gray-400">{r.label}</span>
                      <span className={r.style}>{fmt(r.val)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-700 pt-3 mt-2">
                    <span className="text-white">TOTAL PRESUPUESTO</span>
                    <span className="text-indigo-400 text-base">{fmt(totalBudget)}</span>
                  </div>
                </div>
              </div>

              {/* Budget vs Actual */}
              {vsActual.length > 0 && (
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-300">Presupuesto vs Real</h2>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                        {['Capítulo','Presupuestado','Ejecutado','% Ejecutado'].map(h => (
                          <th key={h} className="px-5 py-3 text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vsActual.map((row: any, i: number) => {
                        const executedPct = row.budgeted > 0 ? (row.actual / row.budgeted) * 100 : 0
                        return (
                          <tr key={i} className="border-t border-gray-700 hover:bg-gray-750">
                            <td className="px-5 py-3 text-gray-200">{row.chapterName ?? row.chapter}</td>
                            <td className="px-5 py-3 text-gray-300">{fmt(Number(row.budgeted ?? 0))}</td>
                            <td className="px-5 py-3 text-white">{fmt(Number(row.actual ?? 0))}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${executedPct > 100 ? 'bg-red-500' : executedPct > 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${Math.min(executedPct, 100)}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${executedPct > 100 ? 'text-red-400' : 'text-gray-300'}`}>{pct(executedPct)}</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* New Budget Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Nuevo Presupuesto</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={submitNewBudget} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Proyecto</label>
                <select value={newForm.projectId || selectedProject}
                  onChange={e => setNewForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">— Selecciona —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Presupuesto Inicial" required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Versión</label>
                <input type="number" value={newForm.version} onChange={e => setNewForm(f => ({ ...f, version: e.target.value }))}
                  placeholder="1" required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2">
                  {saving && <Loader2 size={13} className="animate-spin" />} Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
