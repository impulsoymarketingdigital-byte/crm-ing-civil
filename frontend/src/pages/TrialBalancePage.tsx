import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)

export default function TrialBalancePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (from) params.set('dateFrom', from)
    if (to)   params.set('dateTo', to)
    api.get(`/ledger/trial-balance?${params}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const lines = data?.lines ?? []
  const totals = data?.totals

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Balance de Comprobación</h1>
        <p className="text-gray-400 text-sm mt-1">Solo incluye asientos en estado POSTED</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Desde</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Hasta</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
        </div>
        <button onClick={load}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          Aplicar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
      ) : (
        <>
          {/* Balance status */}
          {totals && (
            <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border ${
              totals.isBalanced
                ? 'bg-emerald-900/20 border-emerald-700'
                : 'bg-red-900/20 border-red-700'
            }`}>
              {totals.isBalanced
                ? <CheckCircle size={22} className="text-emerald-400" />
                : <XCircle size={22} className="text-red-400" />}
              <div>
                <p className={`font-semibold ${totals.isBalanced ? 'text-emerald-300' : 'text-red-300'}`}>
                  {totals.isBalanced ? 'Contabilidad balanceada ✓' : 'Contabilidad desbalanceada ✗'}
                </p>
                <p className="text-sm text-gray-400">
                  Total Débito: <span className="text-white">{fmt(Number(totals.totalDebit))}</span>
                  {' · '}
                  Total Crédito: <span className="text-white">{fmt(Number(totals.totalCredit))}</span>
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          {lines.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Visualización por Cuenta</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={lines}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="accountCode" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                  <Bar dataKey="totalDebit"  name="Débito"  fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="totalCredit" name="Crédito" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['Código','Cuenta','Tipo','Balance Normal','Débito','Crédito','Saldo'].map(h => (
                    <th key={h} className="px-5 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l: any) => (
                  <tr key={l.accountId} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-5 py-3 font-mono text-indigo-400 text-xs">{l.accountCode}</td>
                    <td className="px-5 py-3 text-white">{l.accountName}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{l.accountType}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${l.normalBalance === 'DEBIT' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-emerald-900/40 text-emerald-400'}`}>
                        {l.normalBalance}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-indigo-300">{fmt(Number(l.totalDebit))}</td>
                    <td className="px-5 py-3 text-emerald-300">{fmt(Number(l.totalCredit))}</td>
                    <td className="px-5 py-3 text-white font-semibold">{fmt(Number(l.balance))}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr className="border-t-2 border-gray-600 bg-gray-750">
                    <td colSpan={4} className="px-5 py-3 text-gray-300 font-semibold text-sm">TOTALES</td>
                    <td className="px-5 py-3 text-indigo-300 font-bold">{fmt(Number(totals.totalDebit))}</td>
                    <td className="px-5 py-3 text-emerald-300 font-bold">{fmt(Number(totals.totalCredit))}</td>
                    <td className="px-5 py-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
            {lines.length === 0 && (
              <p className="text-gray-500 text-center py-12">Sin asientos POSTED. Emite una factura primero.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
