import { useState } from 'react'
import { api } from '../api/client'
import { Loader2, Search } from 'lucide-react'

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)

export default function SecopPage() {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [searched, setSearched] = useState(false)
  const [totalPages, setTotalPages] = useState(1)

  const search = async (p = 1) => {
    if (!keyword.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const r = await api.get('/secop/search', { params: { keyword: keyword.trim(), page: p } })
      const data = r.data
      setResults(Array.isArray(data) ? data : (data.results ?? data.items ?? []))
      setTotalPages(data.totalPages ?? data.pages ?? 1)
      setPage(p)
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Error al buscar en SECOP')
      setResults([])
    } finally { setLoading(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    search(1)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">SECOP II — Búsqueda de Procesos</h1>
        <p className="text-gray-400 text-sm mt-1">Consulta procesos de contratación pública</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="Ej: construcción vía, interventoría, pavimentación..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !keyword.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Buscar
        </button>
      </form>

      {/* Results */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : !searched ? (
          <div className="flex flex-col items-center py-16 text-gray-500">
            <Search size={40} className="mb-3 opacity-30" />
            <p>Ingresa una palabra clave para buscar procesos en SECOP</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-500">
            <Search size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No se encontraron procesos</p>
            <p className="text-sm mt-1">Intenta con otra palabra clave</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                  {['N° Proceso','Entidad','Descripción','Valor','Estado','Fecha'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((item: any, i: number) => (
                  <tr key={item.id ?? item.numero ?? i} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-indigo-400 font-mono text-xs whitespace-nowrap">
                      {item.numero ?? item.processNumber ?? item.referenceNumber ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[180px]">
                      <p className="truncate">{item.entidad ?? item.entity ?? item.buyerName ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-200 max-w-[280px]">
                      <p className="line-clamp-2 text-xs leading-relaxed">{item.descripcion ?? item.description ?? item.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                      {item.valor != null || item.value != null || item.amount != null
                        ? fmt(Number(item.valor ?? item.value ?? item.amount ?? 0))
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-400">
                        {item.estado ?? item.status ?? item.phase ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {(item.fecha ?? item.date ?? item.publishDate)
                        ? new Date(item.fecha ?? item.date ?? item.publishDate).toLocaleDateString('es-CO')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-700">
                <p className="text-xs text-gray-500">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => search(page - 1)}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg transition-colors"
                  >
                    ← Anterior
                  </button>
                  <button
                    onClick={() => search(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white rounded-lg transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
