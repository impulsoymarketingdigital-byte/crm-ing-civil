import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { FileText, Package, BarChart3, TrendingUp, Loader2 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [trialBalance, setTrialBalance] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/invoices').then(r => setInvoices(r.data)),
      api.get('/inventory').then(r => setInventory(r.data)),
      api.get('/ledger/trial-balance').then(r => setTrialBalance(r.data)),
    ]).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-indigo-400" />
    </div>
  )

  const issued = invoices.filter(i => i.status === 'ISSUED').length
  const draft  = invoices.filter(i => i.status === 'DRAFT').length
  const totalInvoiced = invoices.filter(i => i.status === 'ISSUED').reduce((s, i) => s + Number(i.total), 0)
  const inventoryValue = inventory.reduce((s, i) => s + Number(i.quantityOnHand) * Number(i.costPrice), 0)

  // Invoice status pie
  const pieData = [
    { name: 'Emitidas', value: issued },
    { name: 'Borrador', value: draft },
  ].filter(d => d.value > 0)

  // Account type bar for trial balance
  const tbLines = trialBalance?.lines ?? []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">Resumen de tu empresa</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Facturado', value: fmt(totalInvoiced), sub: `${issued} facturas emitidas`, icon: FileText, color: 'indigo' },
          { label: 'Facturas Draft', value: draft.toString(), sub: 'pendientes de emitir', icon: TrendingUp, color: 'yellow' },
          { label: 'Productos', value: inventory.length.toString(), sub: 'ítems activos', icon: Package, color: 'emerald' },
          { label: 'Valor Inventario', value: fmt(inventoryValue), sub: 'costo promedio ponderado', icon: BarChart3, color: 'violet' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-400">{label}</span>
              <div className={`w-9 h-9 rounded-lg bg-${color}-600/20 flex items-center justify-center`}>
                <Icon size={18} className={`text-${color}-400`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trial balance area chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Balance de Comprobación</h2>
          {tbLines.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin asientos contables aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={tbLines}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="accountCode" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Area type="monotone" dataKey="totalDebit"  name="Débito"  stroke="#6366f1" fill="#6366f120" strokeWidth={2} />
                <Area type="monotone" dataKey="totalCredit" name="Crédito" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Invoice pie */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Estado Facturas</h2>
          {pieData.length === 0 ? (
            <p className="text-gray-500 text-sm">Sin facturas aún</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-300">Últimas Facturas</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase">
              <th className="px-5 py-3 text-left">Número</th>
              <th className="px-5 py-3 text-left">Cliente</th>
              <th className="px-5 py-3 text-left">Total</th>
              <th className="px-5 py-3 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {invoices.slice(0, 5).map(inv => (
              <tr key={inv.id} className="border-t border-gray-700 hover:bg-gray-750">
                <td className="px-5 py-3 text-white font-medium">{inv.number}</td>
                <td className="px-5 py-3 text-gray-400">{inv.customer?.name ?? '—'}</td>
                <td className="px-5 py-3 text-white">{fmt(Number(inv.total))}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    inv.status === 'ISSUED' ? 'bg-emerald-900/40 text-emerald-400' :
                    inv.status === 'PAID'   ? 'bg-blue-900/40 text-blue-400' :
                                              'bg-yellow-900/40 text-yellow-400'
                  }`}>{inv.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">Sin facturas registradas</p>
        )}
      </div>
    </div>
  )
}
