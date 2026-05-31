import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, CheckCircle, DollarSign } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function LiquidationPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [liquidation, setLiquidation] = useState<any>(null)
  const [statement, setStatement] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState({ observations: '' })
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data))
  }, [])

  const loadLiquidation = (projectId: string) => {
    if (!projectId) return
    setLoading(true)
    setLiquidation(null)
    setStatement(null)
    setShowCreateForm(false)
    api.get(`/liquidations/project/${projectId}`)
      .then(r => {
        const liq = Array.isArray(r.data) ? r.data[0] : r.data
        if (liq) {
          setLiquidation(liq)
          return api.get(`/liquidations/${liq.id}/statement`).then(s => setStatement(s.data))
        } else {
          setShowCreateForm(true)
        }
      })
      .catch(() => setShowCreateForm(true))
      .finally(() => setLoading(false))
  }

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(e.target.value)
    loadLiquidation(e.target.value)
  }

  const createLiquidation = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/liquidations', { projectId: selectedProject, ...form })
      setShowCreateForm(false)
      loadLiquidation(selectedProject)
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setSaving(false) }
  }

  const finalize = async () => {
    if (!liquidation) return
    setFinalizing(true)
    try {
      await api.patch(`/liquidations/${liquidation.id}/finalize`)
      loadLiquidation(selectedProject)
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setFinalizing(false) }
  }

  const stmt = statement ?? {}
  const certificates: any[] = stmt.certificates ?? []
  const deductions: any[] = stmt.deductions ?? []
  const contractValue = Number(stmt.contractValue ?? liquidation?.contractValue ?? 0)
  const additionsValue = Number(stmt.additionsValue ?? liquidation?.additionsValue ?? 0)
  const totalContractValue = contractValue + additionsValue
  const totalExecuted = Number(stmt.totalExecuted ?? 0)
  const totalRetained = Number(stmt.totalRetained ?? 0)
  const totalDeductions = Number(stmt.totalDeductions ?? 0)
  const netBalance = totalExecuted - totalRetained - totalDeductions

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Liquidación de Contrato</h1>
        <p className="text-gray-400 text-sm mt-1">Estado financiero final del proyecto</p>
      </div>

      {/* Project selector */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <label className="block text-xs text-gray-400 mb-1">Proyecto</label>
        <select value={selectedProject} onChange={handleProjectChange}
          className="w-full max-w-sm bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
          <option value="">— Selecciona un proyecto —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
      )}

      {/* Create form */}
      {!loading && showCreateForm && selectedProject && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-md">
          <h2 className="text-white font-semibold mb-4">Crear Liquidación</h2>
          <p className="text-gray-400 text-sm mb-5">No existe liquidación para este proyecto. Crea una para registrar el estado financiero final.</p>
          <form onSubmit={createLiquidation} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Observaciones</label>
              <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                rows={3} placeholder="Observaciones de la liquidación..."
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none" />
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Crear Liquidación
            </button>
          </form>
        </div>
      )}

      {/* Liquidation detail */}
      {!loading && liquidation && (
        <div className="space-y-5">
          {/* Header card */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg">Liquidación · {liquidation.project?.name ?? liquidation.projectId}</h2>
                <p className="text-gray-400 text-sm">
                  Estado: <span className={`font-medium ${liquidation.status === 'FINAL' ? 'text-blue-400' : 'text-yellow-400'}`}>{liquidation.status}</span>
                  {liquidation.finalizedAt && ` · Finalizada: ${new Date(liquidation.finalizedAt).toLocaleDateString('es-CO')}`}
                </p>
              </div>
              {liquidation.status !== 'FINAL' && (
                <button onClick={finalize} disabled={finalizing}
                  className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                  {finalizing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Finalizar
                </button>
              )}
            </div>

            {/* Contract values */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Valor Contrato Original', value: contractValue, color: 'text-gray-200' },
                { label: 'Adiciones / Modificaciones', value: additionsValue, color: 'text-yellow-400' },
                { label: 'Valor Total del Contrato', value: totalContractValue, color: 'text-indigo-400' },
              ].map(c => (
                <div key={c.label} className="bg-gray-900/60 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                  <p className={`text-lg font-bold ${c.color}`}>{fmt(c.value)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Certificates */}
          {certificates.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300">Actas de Avance</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                    {['N° Acta','Fecha','Bruto','Retención','Neto'].map(h => (
                      <th key={h} className="px-5 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((c: any, i: number) => (
                    <tr key={c.id ?? i} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-5 py-3 text-indigo-400 font-semibold">{c.number}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{c.date ? new Date(c.date).toLocaleDateString('es-CO') : '—'}</td>
                      <td className="px-5 py-3 text-gray-200">{fmt(Number(c.grossAmount ?? 0))}</td>
                      <td className="px-5 py-3 text-red-400">{fmt(Number(c.retentionAmount ?? 0))}</td>
                      <td className="px-5 py-3 text-white font-medium">{fmt(Number(c.netAmount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Deductions */}
          {deductions.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300">Deducciones</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                    {['Tipo','Descripción','Monto'].map(h => (
                      <th key={h} className="px-5 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deductions.map((d: any, i: number) => (
                    <tr key={d.id ?? i} className="border-t border-gray-700 hover:bg-gray-750">
                      <td className="px-5 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/40 text-red-400">{d.type}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-300">{d.description}</td>
                      <td className="px-5 py-3 text-red-400 font-medium">{fmt(Number(d.amount ?? 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Final balance card */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-4">Estado Financiero Final</p>
            <div className="space-y-2 max-w-sm">
              {[
                { label: 'Total Ejecutado (Actas)', val: totalExecuted, cls: 'text-emerald-400' },
                { label: '− Retenciones', val: -totalRetained, cls: 'text-red-400' },
                { label: '− Deducciones', val: -totalDeductions, cls: 'text-red-400' },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{r.label}</span>
                  <span className={r.cls}>{fmt(Math.abs(r.val))}</span>
                </div>
              ))}
              <div className="flex justify-between text-base font-bold border-t-2 border-gray-600 pt-3 mt-3">
                <span className="text-white">Saldo Neto a Favor</span>
                <span className={netBalance >= 0 ? 'text-indigo-400' : 'text-red-400'}>{fmt(netBalance)}</span>
              </div>
            </div>
            {liquidation.observations && (
              <div className="mt-5 bg-gray-900/60 rounded-lg p-3 border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Observaciones</p>
                <p className="text-sm text-gray-300">{liquidation.observations}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
