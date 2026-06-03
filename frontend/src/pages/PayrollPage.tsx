import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, X, Users, Calendar, CheckCircle, DollarSign } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const EMPTY_EMP = {
  code: '',
  firstName: '',
  lastName: '',
  document: '',
  position: '',
  baseSalary: '',
  riskLevel: 'I',
  startDate: new Date().toISOString().split('T')[0],
  bankAccount: '',
  bankAccountType: 'Savings',
  bankName: 'Bancolombia',
}

export default function PayrollPage() {
  const [tab, setTab] = useState<'employees' | 'periods'>('employees')
  const [employees, setEmployees] = useState<any[]>([])
  const [loadingEmp, setLoadingEmp] = useState(true)
  const [showEmpModal, setShowEmpModal] = useState(false)
  const [empForm, setEmpForm] = useState({ ...EMPTY_EMP })
  const [savingEmp, setSavingEmp] = useState(false)

  // Periods tab state
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [fortnight, setFortnight] = useState<1 | 2>(1)
  const [periods, setPeriods] = useState<any[]>([])
  const [loadingPeriods, setLoadingPeriods] = useState(false)
  const [generatingPeriod, setGeneratingPeriod] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadEmployees = () =>
    api.get('/payroll/employees').then(r => setEmployees(r.data)).finally(() => setLoadingEmp(false))

  const loadPeriods = () => {
    setLoadingPeriods(true)
    api.get('/payroll/periods').then(r => setPeriods(r.data)).finally(() => setLoadingPeriods(false))
  }

  useEffect(() => { loadEmployees() }, [])
  useEffect(() => { if (tab === 'periods') { loadPeriods() } }, [tab, year, month])

  const handleEmpChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEmpForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const submitEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEmp(true)
    try {
      await api.post('/payroll/employees', { ...empForm, baseSalary: Number(empForm.baseSalary) })
      setShowEmpModal(false)
      setEmpForm({ ...EMPTY_EMP })
      loadEmployees()
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Error al crear empleado')
    } finally { setSavingEmp(false) }
  }

  const generatePeriod = async () => {
    setGeneratingPeriod(true)
    try {
      await api.post('/payroll/periods', { year, month, fortnight })
      loadPeriods()
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Error al generar período')
    } finally { setGeneratingPeriod(false) }
  }

  const periodAction = async (periodId: string, action: 'approve' | 'pay') => {
    setActionLoading(`${periodId}-${action}`)
    try {
      await api.patch(`/payroll/periods/${periodId}/${action}`)
      loadPeriods()
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Error')
    } finally { setActionLoading(null) }
  }

  const downloadBancolombiaFile = async () => {
    try {
      const response = await api.get(`/payroll/bancolombia`, {
        params: { year, month, fortnight },
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/plain;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `bancolombia_nomina_${year}_${month}_f${fortnight}.txt`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Error al descargar el archivo plano. Asegúrese de que existan periodos creados y aprobados.')
    }
  }

  const totals = periods.reduce((acc, p) => ({
    totalEarned: acc.totalEarned + Number(p.totalEarned ?? 0),
    totalDeductions: acc.totalDeductions + Number(p.totalDeductions ?? 0),
    netPay: acc.netPay + Number(p.netPay ?? 0),
    totalLaborCost: acc.totalLaborCost + Number(p.totalLaborCost ?? 0),
  }), { totalEarned: 0, totalDeductions: 0, netPay: 0, totalLaborCost: 0 })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nómina</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión de empleados y períodos de pago</p>
        </div>
        {tab === 'employees' && (
          <button
            onClick={() => setShowEmpModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} /> Nuevo Empleado
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 p-1 rounded-lg w-fit border border-gray-700">
        {([['employees', 'Empleados', Users], ['periods', 'Períodos de Nómina', Calendar]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Employees Tab */}
      {tab === 'employees' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {loadingEmp ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-gray-500"><Users size={36} className="mb-3 opacity-40" /><p>Sin empleados registrados</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Código','Nombre','Cargo','Salario Base','Nivel Riesgo','Estado'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{emp.code}</td>
                    <td className="px-4 py-3 text-white font-medium">{emp.firstName} {emp.lastName}</td>
                    <td className="px-4 py-3 text-gray-300">{emp.position}</td>
                    <td className="px-4 py-3 text-gray-200">{fmt(Number(emp.baseSalary))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        emp.riskLevel === 'V' || emp.riskLevel === 'IV' ? 'bg-red-900/40 text-red-400' :
                        emp.riskLevel === 'III' || emp.riskLevel === 'II' ? 'bg-yellow-900/40 text-yellow-400' :
                        'bg-emerald-900/40 text-emerald-400'
                      }`}>{emp.riskLevel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${emp.isActive ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                        {emp.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Periods Tab */}
      {tab === 'periods' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Año</label>
              <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Mes</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Quincena</label>
              <select value={fortnight} onChange={e => setFortnight(Number(e.target.value) as 1 | 2)}
                className="bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                <option value={1}>1ª Quincena (1-15)</option>
                <option value={2}>2ª Quincena (16-30)</option>
              </select>
            </div>
            <button
              onClick={generatePeriod}
              disabled={generatingPeriod}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {generatingPeriod ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />} Generar Período
            </button>
            <button
              onClick={downloadBancolombiaFile}
              disabled={periods.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Descargar Plano Bancolombia
            </button>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {loadingPeriods ? (
              <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
            ) : periods.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-gray-500"><Calendar size={36} className="mb-3 opacity-40" /><p>Sin períodos generados</p></div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                      {['Empleado','Salario Base','Devengado','Deducciones','Neto','Costo Total','Estado','Acciones'].map(h => (
                        <th key={h} className="px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map(p => (
                      <tr key={p.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{p.employee?.firstName} {p.employee?.lastName}</td>
                        <td className="px-4 py-3 text-gray-300">{fmt(Number(p.baseSalary ?? 0))}</td>
                        <td className="px-4 py-3 text-emerald-400">{fmt(Number(p.totalEarned ?? 0))}</td>
                        <td className="px-4 py-3 text-red-400">{fmt(Number(p.totalDeductions ?? 0))}</td>
                        <td className="px-4 py-3 text-white font-semibold">{fmt(Number(p.netPay ?? 0))}</td>
                        <td className="px-4 py-3 text-gray-300">{fmt(Number(p.totalLaborCost ?? 0))}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.status === 'PAID' ? 'bg-blue-900/40 text-blue-400' :
                            p.status === 'APPROVED' ? 'bg-emerald-900/40 text-emerald-400' :
                            'bg-yellow-900/40 text-yellow-400'
                          }`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {p.status === 'DRAFT' && (
                              <button
                                onClick={() => periodAction(p.id, 'approve')}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                {actionLoading === `${p.id}-approve` ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />} Aprobar
                              </button>
                            )}
                            {p.status === 'APPROVED' && (
                              <button
                                onClick={() => periodAction(p.id, 'pay')}
                                disabled={!!actionLoading}
                                className="flex items-center gap-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-60 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                {actionLoading === `${p.id}-pay` ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />} Pagar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-600 bg-gray-900/60">
                      <td className="px-4 py-3 text-gray-400 font-semibold text-xs uppercase">Totales</td>
                      <td className="px-4 py-3 text-gray-300 font-semibold"></td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold">{fmt(totals.totalEarned)}</td>
                      <td className="px-4 py-3 text-red-400 font-semibold">{fmt(totals.totalDeductions)}</td>
                      <td className="px-4 py-3 text-white font-bold">{fmt(totals.netPay)}</td>
                      <td className="px-4 py-3 text-gray-300 font-semibold">{fmt(totals.totalLaborCost)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* New Employee Modal */}
      {showEmpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
              <h2 className="text-white font-semibold">Nuevo Empleado</h2>
              <button onClick={() => setShowEmpModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={submitEmployee} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Código</label>
                  <input name="code" value={empForm.code} onChange={handleEmpChange}
                    placeholder="EMP-001" required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cédula / Documento</label>
                  <input name="document" value={empForm.document} onChange={handleEmpChange}
                    placeholder="12345678" required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nombre</label>
                  <input name="firstName" value={empForm.firstName} onChange={handleEmpChange}
                    placeholder="Juan" required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Apellido</label>
                  <input name="lastName" value={empForm.lastName} onChange={handleEmpChange}
                    placeholder="Pérez" required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cargo</label>
                  <input name="position" value={empForm.position} onChange={handleEmpChange}
                    placeholder="Ingeniero Civil" required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Salario Base (COP)</label>
                  <input name="baseSalary" type="number" value={empForm.baseSalary} onChange={handleEmpChange}
                    placeholder="2000000" required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Fecha de Contratación</label>
                  <input name="startDate" type="date" value={empForm.startDate} onChange={handleEmpChange} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nivel de Riesgo (ARL)</label>
                  <select name="riskLevel" value={empForm.riskLevel} onChange={handleEmpChange}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                    <option value="I">Bajo (I - 0.522%)</option>
                    <option value="II">Medio (II - 1.044%)</option>
                    <option value="III">Medio-Alto (III - 2.436%)</option>
                    <option value="IV">Alto (IV - 4.350%)</option>
                    <option value="V">Máximo (V - 6.960%)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Detalles de Transferencia Bancolombia</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Nº Cuenta Bancaria</label>
                    <input name="bankAccount" value={empForm.bankAccount} onChange={handleEmpChange}
                      placeholder="12345678901"
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tipo Cuenta</label>
                    <select name="bankAccountType" value={empForm.bankAccountType} onChange={handleEmpChange}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500">
                      <option value="Savings">Ahorros</option>
                      <option value="Checking">Corriente</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-gray-400 mb-1">Nombre del Banco</label>
                  <input name="bankName" value={empForm.bankName} onChange={handleEmpChange}
                    placeholder="Bancolombia"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="flex gap-3 pt-3 sticky bottom-0 bg-gray-900 pb-1 border-t border-gray-800 mt-2">
                <button type="button" onClick={() => setShowEmpModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={savingEmp} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                  {savingEmp && <Loader2 size={14} className="animate-spin" />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
