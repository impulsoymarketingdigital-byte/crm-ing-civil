import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Loader2, Plus, Send, Eye } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const statusBadge = (s: string) => {
  const cls: Record<string, string> = {
    DRAFT:  'bg-yellow-900/40 text-yellow-400',
    ISSUED: 'bg-emerald-900/40 text-emerald-400',
    PAID:   'bg-blue-900/40 text-blue-400',
    VOIDED: 'bg-red-900/40 text-red-400',
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[s] ?? ''}`}>{s}</span>
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState<string | null>(null)

  // Account IDs - pre-filled for the demo tenant
  const AR_ID  = '9ec05585-2317-4869-920c-e50075a9bdc8'
  const REV_ID = 'bdc0907b-61ef-4f93-b00a-18563d947481'
  const TAX_ID = '1aa42608-f722-46dc-b0ff-c3457739a573'

  const load = () => api.get('/invoices').then(r => setInvoices(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const issueInvoice = async (id: string) => {
    setIssuing(id)
    try {
      await api.post(`/invoices/${id}/issue`, {
        arAccountId: AR_ID,
        revenueAccountId: REV_ID,
        taxAccountId: TAX_ID,
      })
      load()
      alert('Factura emitida exitosamente')
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Error al emitir')
    } finally {
      setIssuing(null)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Facturas</h1>
          <p className="text-gray-400 text-sm mt-1">{invoices.length} facturas registradas</p>
        </div>
        <a href="/invoices/new" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} /> Nueva Factura
        </a>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-indigo-400" /></div>
        ) : invoices.length === 0 ? (
          <p className="text-gray-500 text-center py-16">Sin facturas. Crea una desde el test.http</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-700">
                {['Número','Cliente','Subtotal','IVA','Total','Estado','Fecha','Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-t border-gray-700 hover:bg-gray-750 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{inv.number}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{fmt(Number(inv.subtotal))}</td>
                  <td className="px-4 py-3 text-gray-400">{fmt(Number(inv.taxAmount))}</td>
                  <td className="px-4 py-3 text-white font-semibold">{fmt(Number(inv.total))}</td>
                  <td className="px-4 py-3">{statusBadge(inv.status)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('es-CO') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {inv.status === 'DRAFT' && (
                        <button
                          onClick={() => issueInvoice(inv.id)}
                          disabled={issuing === inv.id}
                          className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          {issuing === inv.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Emitir
                        </button>
                      )}
                      {inv.journalEntryId && (
                        <span className="flex items-center gap-1 bg-indigo-900/40 text-indigo-400 text-xs px-2.5 py-1.5 rounded-lg">
                          <Eye size={12} /> Asiento
                        </span>
                      )}
                    </div>
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
