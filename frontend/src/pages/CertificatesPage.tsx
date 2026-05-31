import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, CheckCircle, DollarSign, XCircle, ClipboardList } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-yellow-900/40 text-yellow-400',
  APPROVED: 'bg-emerald-900/40 text-emerald-400',
  PAID:     'bg-blue-900/40 text-blue-400',
  VOIDED:   'bg-red-900/40 text-red-400',
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function CertificatesPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState('')
  const [certificates, setCertificates] = useState<any[]>([])
  const [progress, setProgress] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ number: '', periodStart: '', periodEnd: '', projectId: '' })
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data))
  }, [])

  const loadCertificates = (projectId: string) => {
    setLoading(true)
    const query = projectId ? `?projectId=${projectId}` : ''
    Promise.all([
      api.get(`/certificates${query}`),
      projectId ? api.get(`/certificates/progress/${projectId}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]).then(([certs, prog]) => {
      setCertificates(certs.data)
      setProgress(Array.isArray(prog.data) ? prog.data : [])
    }).finally(() => setLoading(false))
  }

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProject(e.target.value)
    loadCertificates(e.target.value)
  }

  const submitCertificate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/certificates', { ...form, projectId: form.projectId || selectedProject })
      setShowModal(false)
      setForm({ number: '', periodStart: '', periodEnd: '', projectId: '' })
      loadCertificates(selectedProject)
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setSaving(false) }
  }

  const doAction = async (id: string, action: 'approve' | 'pay' | 'void') => {
    setActionLoading(`${id}-${action}`)
    try {
      await api.patch(`/certificates/${id}/${action}`)
      loadCertificates(selectedProject)
    } catch (err: any) { alert(err.response?.data?.message ?? 'Error') } finally { setActionLoading(null) }
  }

  const chartData = progress.map((p: any) => ({
    name: p.projectName ?? p.project ?? 'Proyecto',
    pct: Number(p.executedPct ?? p.percentage ?? 0),
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Actas de Avance</h1>
          <p className="text-gray-400 text-sm mt-1">Certificados de obra ejecutada</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} /> Nueva Acta
        </button>
      </div>

      {/* Project filter */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <label className="block text-xs text-gray-400 mb-1">Filtrar por Proyecto</label>
        <select value={selectedProject} onChange={handleProjectChange}
          className="w-full max-w-sm bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
          <option value="">— Todos los proyectos —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
        </select>
      </div>

      {/* Progress chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">% Ejecutado por Proyecto</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                labelStyle={{ color: '#f3f4f6' }}
                formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Ejecutado']}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Certificates table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : certificates.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-500">
            <ClipboardList size={40} className="mb-3 opacity-40" />
            <p>Sin actas registradas{selectedProject ? ' para este proyecto' : ''}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['N° Acta','Fecha','Estado','Bruto','Retención','Neto','Acum. %','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {certificates.map(cert => (
                <tr key={cert.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-indigo-400 font-semibold">{cert.number}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {cert.date ? new Date(cert.date).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cert.status] ?? 'bg-gray-700 text-gray-400'}`}>
                      {cert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{fmt(Number(cert.grossAmount ?? 0))}</td>
                  <td className="px-4 py-3 text-red-400">{fmt(Number(cert.retentionAmount ?? 0))}</td>
                  <td className="px-4 py-3 text-white font-semibold">{fmt(Number(cert.netAmount ?? 0))}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(Number(cert.cumulativePct ?? 0), 100)}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{Number(cert.cumulativePct ?? 0).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {cert.status === 'DRAFT' && (
                        <button onClick={() => doAction(cert.id, 'approve')} disabled={!!actionLoading}
                          className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs px-2 py-1.5 rounded-lg transition-colors">
                          {actionLoading === `${cert.id}-approve` ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Aprobar
                        </button>
                      )}
                      {cert.status === 'APPROVED' && (
                        <button onClick={() => doAction(cert.id, 'pay')} disabled={!!actionLoading}
                          className="flex items-center gap-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-xs px-2 py-1.5 rounded-lg transition-colors">
                          {actionLoading === `${cert.id}-pay` ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />} Pagar
                        </button>
                      )}
                      {(cert.status === 'DRAFT' || cert.status === 'APPROVED') && (
                        <button onClick={() => doAction(cert.id, 'void')} disabled={!!actionLoading}
                          className="flex items-center gap-1 bg-red-900/60 hover:bg-red-700 disabled:opacity-60 text-red-300 text-xs px-2 py-1.5 rounded-lg transition-colors">
                          {actionLoading === `${cert.id}-void` ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} Anular
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

      {/* New Certificate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-white font-semibold">Nueva Acta de Avance</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={submitCertificate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Proyecto</label>
                <select value={form.projectId || selectedProject}
                  onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="">— Selecciona —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Número de Acta</label>
                <input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))}
                  placeholder="ACTA-001" required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Período Inicio</label>
                  <input type="date" value={form.periodStart} onChange={e => setForm(f => ({ ...f, periodStart: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Período Fin</label>
                  <input type="date" value={form.periodEnd} onChange={e => setForm(f => ({ ...f, periodEnd: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-lg">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2">
                  {saving && <Loader2 size={13} className="animate-spin" />} Crear Acta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
