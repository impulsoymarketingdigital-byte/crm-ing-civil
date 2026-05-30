import { useState } from 'react'
import { api } from '../api/client'
import { Bot, Loader2, Sparkles, FileText, CheckCircle } from 'lucide-react'

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const DEMO_TEXT = `Proveedor: Suministros ABC S.A.S
NIT: 800.234.567-1
Factura No: F-2024-0123
Fecha: 2026-05-29
Descripcion: Materiales de oficina y papelería
Subtotal: $500.000
IVA 19%: $95.000
Total a pagar: $595.000`

export default function AiOcrPage() {
  const [ocrText, setOcrText] = useState(DEMO_TEXT)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pre-filled account IDs for demo tenant
  const EXPENSE_ID = '7ae03fb6-712c-48c7-aed3-6cc08b991fa1'
  const PAYABLE_ID = '2ae5db1f-ccf7-4405-a77f-03ad81450018'

  const process = async () => {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const { data } = await api.post('/ai/invoice-ocr', {
        ocrText,
        expenseAccountId: EXPENSE_ID,
        payableAccountId: PAYABLE_ID,
      })
      setResult(data)
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Error al procesar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center">
          <Bot size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">IA · OCR de Facturas</h1>
          <p className="text-gray-400 text-sm">Extrae datos de facturas de proveedor y genera asientos automáticamente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <FileText size={16} /> Texto de la Factura (OCR)
            </h2>
            <textarea
              rows={12}
              value={ocrText}
              onChange={e => setOcrText(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 font-mono text-sm focus:outline-none focus:border-violet-500 resize-none"
              placeholder="Pega aquí el texto extraído de la factura del proveedor..."
            />
            <button
              onClick={process}
              disabled={loading || !ocrText.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" /> Procesando con IA...</>
                : <><Sparkles size={18} /> Extraer y Generar Asiento</>}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
          )}
        </div>

        {/* Result */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Extracted data */}
              <div className="bg-gray-800 rounded-xl border border-emerald-700/50 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle size={16} /> Datos Extraídos por IA
                </h2>
                <div className="space-y-2">
                  {[
                    ['Proveedor', result.extractedData.supplier],
                    ['Factura N°', result.extractedData.invoiceNumber],
                    ['Fecha', result.extractedData.date],
                    ['Descripción', result.extractedData.description],
                    ['Subtotal', fmt(result.extractedData.subtotal)],
                    ['IVA', fmt(result.extractedData.taxAmount)],
                    ['TOTAL', fmt(result.extractedData.total)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-400">{k}</span>
                      <span className="text-white font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Journal entry draft */}
              <div className="bg-gray-800 rounded-xl border border-indigo-700/50 p-5 space-y-3">
                <h2 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                  <Bot size={16} /> Asiento Contable Generado
                </h2>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>Referencia: <span className="text-white">{result.journalEntryDraft.reference}</span></p>
                  <p>Estado: <span className="bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full">{result.journalEntryDraft.status}</span></p>
                </div>
                <div className="mt-3 space-y-2">
                  {result.journalEntryDraft.lines.map((l: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-gray-900 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-400 text-xs truncate max-w-[55%]">{l.description}</span>
                      <div className="flex gap-4 text-xs">
                        {Number(l.debit) > 0 && <span className="text-indigo-400">DB {fmt(Number(l.debit))}</span>}
                        {Number(l.credit) > 0 && <span className="text-emerald-400">CR {fmt(Number(l.credit))}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Tokens IA: {result.aiUsage.inputTokens} entrada + {result.aiUsage.outputTokens} salida
                </div>
              </div>
            </>
          ) : (
            <div className="bg-gray-800/50 rounded-xl border border-dashed border-gray-700 h-64 flex flex-col items-center justify-center text-gray-600 gap-3">
              <Bot size={40} />
              <p className="text-sm">El resultado aparecerá aquí</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
