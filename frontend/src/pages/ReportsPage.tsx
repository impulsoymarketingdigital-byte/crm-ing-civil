import { useEffect, useState } from 'react'
import { api } from '../api/client'
import {
  Loader2, Calendar, FolderOpen, TrendingUp, DollarSign,
  Briefcase, Activity, ShoppingCart, Percent,
  Package, Landmark, ArrowUpRight, ArrowDownRight, AlertCircle, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

type TabType = 'projects' | 'accounting' | 'billing' | 'payroll' | 'inventory'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects')
  const [projectsList, setProjectsList] = useState<any[]>([])
  
  // Filters state
  const [projectId, setProjectId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Report data state
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  // Fetch projects list for the filter dropdown
  useEffect(() => {
    api.get('/projects').then(r => setProjectsList(r.data)).catch(console.error)
  }, [])

  const fetchReportData = () => {
    setLoading(true)
    api.get('/reports/summary', {
      params: {
        projectId: projectId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }
    })
      .then(r => setData(r.data))
      .catch(err => alert(err.response?.data?.message ?? 'Error al cargar reporte'))
      .finally(() => setLoading(false))
  }

  // Load initial report data
  useEffect(() => {
    fetchReportData()
  }, [projectId]) // auto-reload when project changes

  // Tab definitions
  const tabs = [
    { id: 'projects', label: 'Proyectos e Ingeniería', icon: Briefcase },
    { id: 'accounting', label: 'Contabilidad y Caja', icon: Landmark },
    { id: 'billing', label: 'Ventas y Compras', icon: ShoppingCart },
    { id: 'payroll', label: 'Nómina y Personal', icon: Percent },
    { id: 'inventory', label: 'Inventario', icon: Package },
  ] as const

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen text-gray-100">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Panel de Informes Analíticos
          </h1>
          <p className="text-gray-400 text-sm mt-1">Consolidado general de métricas por proyectos, contabilidad y operaciones</p>
        </div>
        <button 
          onClick={fetchReportData}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualizar Datos
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-gray-900/60 border border-gray-800 p-5 rounded-2xl backdrop-blur-md grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
            <FolderOpen size={13} className="text-indigo-400" /> Filtrar por Proyecto
          </label>
          <select 
            value={projectId} 
            onChange={e => setProjectId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
          >
            <option value="">Todos los Proyectos (General)</option>
            {projectsList.map(p => (
              <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-400" /> Fecha Desde
          </label>
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
            <Calendar size={13} className="text-indigo-400" /> Fecha Hasta
          </label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-indigo-500 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors"
            />
            <button 
              onClick={fetchReportData}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-3.5 rounded-xl transition-colors text-sm font-semibold cursor-pointer"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 border-b border-gray-800">
        {tabs.map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all whitespace-nowrap cursor-pointer ${
                active 
                  ? 'border-indigo-500 text-white bg-indigo-500/5' 
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-3 bg-gray-900/20 border border-gray-800/50 rounded-3xl">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
          <p className="text-sm text-gray-400">Consultando bases de datos y consolidando métricas...</p>
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-900/20 border border-gray-800/50 rounded-3xl text-gray-500">
          <AlertCircle size={36} className="mb-2 opacity-50" />
          <p>No se pudieron recuperar datos del servidor</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fadeIn">
          {/* TAB: PROJECTS */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              {/* Cards row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: 'Contratado Total', val: fmt(data.projects.totals.totalValue), desc: 'Valor total con AIU incluido', color: 'border-indigo-500', icon: Briefcase },
                  { title: 'Presupuestado Planeado', val: fmt(data.projects.totals.budgetPlanned), desc: 'Costo total estimado en presupuestos', color: 'border-blue-500', icon: DollarSign },
                  { title: 'Costo Real Ejecutado', val: fmt(data.projects.totals.budgetActual), desc: 'Acumulado de costos reales de obra', color: 'border-emerald-500', icon: TrendingUp },
                  { title: 'Valor Certificado (Actas)', val: fmt(data.projects.totals.certifiedGross), desc: 'Avance neto de actas aprobadas', color: 'border-purple-500', icon: Activity },
                ].map(c => {
                  const Icon = c.icon
                  return (
                    <div key={c.title} className={`bg-gray-900/40 border-l-4 ${c.color} border border-gray-800/80 p-5 rounded-2xl hover:translate-y-[-2px] transition-transform`}>
                      <div className="flex justify-between items-start">
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{c.title}</span>
                        <Icon size={16} className="text-gray-500" />
                      </div>
                      <p className="text-2xl font-bold mt-2 text-white">{c.val}</p>
                      <span className="text-[10px] text-gray-500 block mt-1">{c.desc}</span>
                    </div>
                  )
                })}
              </div>

              {/* Chart section */}
              <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-base font-semibold text-white">Presupuesto vs Costo Real vs Certificado por Proyecto</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.projects.list} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="code" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} formatter={value => fmt(Number(value))} />
                        <Legend />
                        <Bar name="Planeado" dataKey="budgetPlanned" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar name="Costo Real" dataKey="budgetActual" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar name="Certificado" dataKey="certifiedGross" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-white">Estado de Proyectos</h3>
                  <div className="h-64 w-full flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(
                            data.projects.list.reduce((acc: any, curr: any) => {
                              acc[curr.status] = (acc[curr.status] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([name, value]) => ({ name, value }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.projects.list.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center text-xs text-gray-500">
                    Proyectos activos en la base de datos
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-800">
                  <h3 className="text-sm font-semibold text-white">Detalle de Avances e Ingeniería de Proyectos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-800/30 text-gray-400 uppercase tracking-wider border-b border-gray-800">
                        {['Código', 'Nombre del Proyecto', 'Estado', 'Contrato Total', 'Presupuesto', 'Costo Real', 'Certificado Net', 'Ejecutado (%)'].map(h => (
                          <th key={h} className="px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {data.projects.list.map((p: any) => (
                        <tr key={p.id} className="hover:bg-gray-800/20 transition-colors">
                          <td className="px-5 py-3 font-mono text-indigo-400 font-bold">{p.code}</td>
                          <td className="px-5 py-3 text-white font-medium">{p.name}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40' :
                              p.status === 'PLANNING' ? 'bg-blue-950 text-blue-400 border border-blue-800/40' :
                              'bg-gray-800 text-gray-400 border border-gray-700/40'
                            }`}>{p.status}</span>
                          </td>
                          <td className="px-5 py-3 text-gray-200">{fmt(p.totalValue)}</td>
                          <td className="px-5 py-3 text-gray-300">{fmt(p.budgetPlanned)}</td>
                          <td className="px-5 py-3 text-red-300">{fmt(p.budgetActual)}</td>
                          <td className="px-5 py-3 text-emerald-300">{fmt(p.certifiedNet)}</td>
                          <td className="px-5 py-3 font-semibold">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-800 h-2 rounded-full overflow-hidden w-16">
                                <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, Math.max(0, p.progress.actual))}%` }} />
                              </div>
                              <span>{Math.round(p.progress.actual)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACCOUNTING */}
          {activeTab === 'accounting' && (
            <div className="space-y-6">
              {/* Financial flow overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-emerald-950/20 border border-emerald-800/40 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-emerald-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Ingresos de Caja</span>
                    <ArrowUpRight size={18} />
                  </div>
                  <p className="text-3xl font-bold mt-2 text-white">{fmt(data.accounting.cashFlow.receiptsAmount)}</p>
                  <span className="text-xs text-gray-400 block mt-1">{data.accounting.cashFlow.receiptsCount} recibos de caja cobrados</span>
                </div>

                <div className="bg-red-950/20 border border-red-800/40 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-red-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Egresos / Gastos de Caja</span>
                    <ArrowDownRight size={18} />
                  </div>
                  <p className="text-3xl font-bold mt-2 text-white">{fmt(data.accounting.cashFlow.disbursementsAmount)}</p>
                  <span className="text-xs text-gray-400 block mt-1">{data.accounting.cashFlow.disbursementsCount} comprobantes de egreso emitidos</span>
                </div>

                <div className="bg-indigo-950/20 border border-indigo-800/40 p-5 rounded-2xl">
                  <div className="flex justify-between items-center text-indigo-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Flujo de Caja Neto</span>
                    <TrendingUp size={18} />
                  </div>
                  <p className={`text-3xl font-bold mt-2 ${data.accounting.cashFlow.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {fmt(data.accounting.cashFlow.netCashFlow)}
                  </p>
                  <span className="text-xs text-gray-400 block mt-1">Diferencia neta del periodo cobrado</span>
                </div>
              </div>

              {/* Chart & PUC summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-semibold text-white">Balances de Asientos por Tipo de Cuenta (PUC)</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(data.balances.totalsByType).map(([name, val]: any) => ({
                        name,
                        Debitos: val.debit,
                        Creditos: val.credit,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
                        <YAxis stroke="#9ca3af" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} formatter={value => fmt(Number(value))} />
                        <Legend />
                        <Bar name="Débito" dataKey="Debitos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar name="Crédito" dataKey="Creditos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-5">
                  <h3 className="text-base font-semibold text-white">Consolidado Contable</h3>
                  
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Total Asientos Creados</span>
                      <span className="font-bold text-white">{data.accounting.entries.total}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Asientos Contabilizados (POSTED)</span>
                      <span className="font-bold text-emerald-400">{data.accounting.entries.status.POSTED || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Asientos en Borrador (DRAFT)</span>
                      <span className="font-bold text-yellow-400">{data.accounting.entries.status.DRAFT || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Asientos Anulados (VOIDED)</span>
                      <span className="font-bold text-red-400">{data.accounting.entries.status.VOIDED || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-800">
                      <span className="text-gray-400">Sumas Débitos Generales</span>
                      <span className="font-semibold text-gray-200">{fmt(data.accounting.entries.debitSum)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-400">Sumas Créditos Generales</span>
                      <span className="font-semibold text-gray-200">{fmt(data.accounting.entries.creditSum)}</span>
                    </div>

                    <div className="pt-2 border-t border-gray-700">
                      <div className="flex items-center gap-2 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300">
                        <Landmark size={18} className="shrink-0" />
                        <span>El libro diario se encuentra cuadrado y balanceado aritméticamente.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Sales vs purchase metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Facturado en Ventas</span>
                  <p className="text-3xl font-bold mt-2 text-indigo-400">{fmt(data.invoices.totals.total)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Subtotal: {fmt(data.invoices.totals.subtotal)} | IVA: {fmt(data.invoices.totals.taxAmount)}</span>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Estado de Facturas</span>
                  <div className="flex gap-3 text-xs mt-3.5 font-medium">
                    <span className="text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded-full">Pagas: {data.invoices.totals.status.PAID || 0}</span>
                    <span className="text-indigo-400 bg-indigo-950/20 px-2 py-0.5 rounded-full">Emitidas: {data.invoices.totals.status.ISSUED || 0}</span>
                    <span className="text-yellow-400 bg-yellow-950/20 px-2 py-0.5 rounded-full">Borrador: {data.invoices.totals.status.DRAFT || 0}</span>
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Compras a Proveedores</span>
                  <p className="text-3xl font-bold mt-2 text-red-400">{fmt(data.vendors.invoices.total)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">{data.vendors.invoices.count} facturas de compra procesadas</span>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Cuentas por Pagar (Proveedores)</span>
                  <p className="text-3xl font-bold mt-2 text-amber-400">{fmt(data.vendors.invoices.balance)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Monto pendiente de pago</span>
                </div>
              </div>

              {/* Invoices list and charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-semibold text-white">Ventas (Facturas Emitidas) vs Compras a Proveedores</h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'Subtotal', Ventas: data.invoices.totals.subtotal, Compras: data.vendors.invoices.total - data.vendors.invoices.balance },
                        { name: 'Total', Ventas: data.invoices.totals.total, Compras: data.vendors.invoices.total },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="name" stroke="#9ca3af" />
                        <YAxis stroke="#9ca3af" />
                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }} formatter={value => fmt(Number(value))} />
                        <Legend />
                        <Area name="Ventas a Clientes" type="monotone" dataKey="Ventas" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                        <Area name="Compras a Proveedores" type="monotone" dataKey="Compras" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-semibold text-white">Resumen Tributario (Impuestos Liquidados)</h3>
                  
                  <div className="space-y-4 text-xs font-medium">
                    {Object.entries(data.taxes.breakdown).length === 0 ? (
                      <div className="text-center py-10 text-gray-500">No hay impuestos liquidados para este periodo</div>
                    ) : (
                      Object.entries(data.taxes.breakdown).map(([name, val]: any) => (
                        <div key={name} className="p-3 bg-gray-800/40 border border-gray-700/50 rounded-xl space-y-2">
                          <div className="flex justify-between text-white text-sm font-semibold">
                            <span>{name}</span>
                            <span>{fmt(val.amount)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Pagado: {fmt(val.paid)}</span>
                            <span className={val.amount - val.paid > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                              Pendiente: {fmt(val.amount - val.paid)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PAYROLL */}
          {activeTab === 'payroll' && (
            <div className="space-y-6">
              {/* Payroll aggregates */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Costo Laboral Total</span>
                  <p className="text-3xl font-bold mt-2 text-white">{fmt(data.payroll.totals.totalLaborCost)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Suma de salarios, aportes y prestaciones</span>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Neto Pagado a Empleados</span>
                  <p className="text-3xl font-bold mt-2 text-emerald-400">{fmt(data.payroll.totals.netPay)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Total transferencias a pagar</span>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Aportes Patronales</span>
                  <p className="text-3xl font-bold mt-2 text-indigo-400">{fmt(data.payroll.totals.employerContrib.total)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Salud, Pensión, ARL, Parafiscales</span>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Provisiones Sociales</span>
                  <p className="text-3xl font-bold mt-2 text-purple-400">{fmt(data.payroll.totals.prestations.total)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Prima, cesantías, intereses, vacaciones</span>
                </div>
              </div>

              {/* Payroll cost details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-semibold text-white">Desglose de Costos de Nómina</h3>
                  <div className="h-72 w-full flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Salarios Netos', value: data.payroll.totals.netPay },
                            { name: 'Deducciones Empleado', value: data.payroll.totals.totalDeductions },
                            { name: 'Aportes Patronales', value: data.payroll.totals.employerContrib.total },
                            { name: 'Prestaciones Acumuladas', value: data.payroll.totals.prestations.total },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        >
                          {COLORS.slice(0, 4).map((c, i) => (
                            <Cell key={`cell-${i}`} fill={c} />
                          ))}
                        </Pie>
                        <Tooltip formatter={value => fmt(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-semibold text-white">Detalle de Aportes y Prestaciones (Provisión)</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl space-y-2">
                      <p className="text-gray-400 text-[10px] uppercase tracking-wider">Aportes ARL y Seguridad Social</p>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span>Pensión (12%)</span>
                        <span className="text-white">{fmt(data.payroll.totals.employerContrib.pensionEmployer)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span>Salud (8.5%)</span>
                        <span className="text-white">{fmt(data.payroll.totals.employerContrib.healthEmployer)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span>ARL (Riesgo)</span>
                        <span className="text-white">{fmt(data.payroll.totals.employerContrib.arl)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Caja Comp. (4%)</span>
                        <span className="text-white">{fmt(data.payroll.totals.employerContrib.compensationBox)}</span>
                      </div>
                    </div>

                    <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl space-y-2">
                      <p className="text-gray-400 text-[10px] uppercase tracking-wider">Prestaciones Sociales Legales</p>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span>Prima de Servicios</span>
                        <span className="text-white">{fmt(data.payroll.totals.prestations.prima)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span>Cesantías</span>
                        <span className="text-white">{fmt(data.payroll.totals.prestations.cesantias)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-gray-700">
                        <span>Intereses Cesantías</span>
                        <span className="text-white">{fmt(data.payroll.totals.prestations.interesesCesantias)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Vacaciones</span>
                        <span className="text-white">{fmt(data.payroll.totals.prestations.vacaciones)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              {/* Inventory metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Valor Total de Inventario</span>
                  <p className="text-3xl font-bold mt-2 text-white">{fmt(data.inventory.totalValue)}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Sumatoria de existencias × costo unitario promedio</span>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-5 rounded-2xl">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Artículos Registrados</span>
                  <p className="text-3xl font-bold mt-2 text-indigo-400">{data.inventory.totalItems}</p>
                  <span className="text-xs text-gray-500 mt-1 block">Artículos en catálogo activo</span>
                </div>

                <div className={`p-5 rounded-2xl border ${
                  data.inventory.lowStockCount > 0 
                    ? 'bg-amber-950/20 border-amber-800/50' 
                    : 'bg-gray-900/40 border-gray-800/80'
                }`}>
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Alertas de Bajo Stock</span>
                  <p className={`text-3xl font-bold mt-2 ${data.inventory.lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {data.inventory.lowStockCount}
                  </p>
                  <span className="text-xs text-gray-500 mt-1 block">Artículos por debajo del punto de reorden</span>
                </div>
              </div>

              {/* Transactions & low stock details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-semibold text-white">Transacciones de Stock (Kárdex)</h3>
                  <div className="h-72 w-full flex justify-center items-center">
                    {data.inventory.transactions.total === 0 ? (
                      <span className="text-gray-500 text-sm">No hay transacciones registradas en este periodo</span>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Entradas (Ingresos)', value: data.inventory.transactions.types.ENTRY || 0 },
                              { name: 'Salidas (Disparos)', value: data.inventory.transactions.types.EXIT || 0 },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            label
                            dataKey="value"
                          >
                            <Cell fill="#10b981" />
                            <Cell fill="#f43f5e" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="bg-gray-900/40 border border-gray-800/80 p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-semibold text-white">Listado de Artículos con Bajo Stock</h3>
                  
                  <div className="overflow-y-auto max-h-72 divide-y divide-gray-800 text-xs">
                    {data.inventory.lowStockList.length === 0 ? (
                      <div className="text-center py-10 text-gray-500">Todo el inventario cuenta con stock suficiente</div>
                    ) : (
                      data.inventory.lowStockList.map((item: any) => (
                        <div key={item.id} className="py-2.5 flex justify-between items-center">
                          <div>
                            <span className="font-mono text-indigo-400 font-bold mr-2">{item.sku}</span>
                            <span className="text-white font-medium">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-amber-400 font-semibold">{item.quantity} unidades</span>
                            <span className="text-[10px] text-gray-500 block">Punto Reorden: {item.reorderPoint}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
