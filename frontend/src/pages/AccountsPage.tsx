import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2 } from 'lucide-react'

const typeColors: Record<string, string> = {
  ASSET:     'bg-blue-900/40 text-blue-400',
  LIABILITY: 'bg-red-900/40 text-red-400',
  EQUITY:    'bg-purple-900/40 text-purple-400',
  REVENUE:   'bg-emerald-900/40 text-emerald-400',
  EXPENSE:   'bg-orange-900/40 text-orange-400',
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    api.get('/accounts').then(r => setAccounts(r.data)).finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(filter.toLowerCase()) ||
    a.code.includes(filter)
  )

  const byType = ['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'].map(type => ({
    type,
    count: accounts.filter(a => a.type === type).length,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Plan de Cuentas</h1>
        <p className="text-gray-400 text-sm mt-1">{accounts.length} cuentas registradas</p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {byType.map(({ type, count }) => count > 0 && (
          <div key={type} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${typeColors[type] ?? ''}`}>
            <span>{type}</span>
            <span className="bg-white/10 rounded-full w-5 h-5 flex items-center justify-center text-xs">{count}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm"
        placeholder="Buscar por código o nombre..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Código','Nombre','Tipo','Estado'].map(h => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(acc => (
                <tr key={acc.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-5 py-3 font-mono text-indigo-400 text-sm">{acc.code}</td>
                  <td className="px-5 py-3 text-white">{acc.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[acc.type] ?? ''}`}>
                      {acc.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${acc.isActive ? 'bg-emerald-900/40 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                      {acc.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
