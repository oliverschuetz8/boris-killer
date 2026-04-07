'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Clock, DollarSign, User, FileText, Loader2 } from 'lucide-react'
import { getJobCostBreakdown, type JobCostBreakdown } from '@/lib/services/job-cost'
import { createInvoiceFromJob } from '@/lib/services/invoices'

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function currency(amount: number) {
  return `A$${Number(amount).toFixed(2)}`
}

export default function JobCostTab({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [data, setData] = useState<JobCostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  useEffect(() => {
    getJobCostBreakdown(jobId).then(d => {
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [jobId])

  async function handleGenerateInvoice() {
    setGenerating(true)
    setGenError(null)
    try {
      const invoiceId = await createInvoiceFromJob(jobId)
      if (!invoiceId) throw new Error('No invoice ID returned')
      router.push(`/invoices/${invoiceId}`)
    } catch (err: any) {
      setGenError(err?.message || 'Failed to generate invoice')
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data) return (
    <div className="mt-4 bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
      <p className="text-sm text-slate-500">Could not load cost data.</p>
    </div>
  )

  const hasData = data.materialTotal > 0 || data.totalMinutes > 0

  return (
    <div className="space-y-6 mt-4">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{currency(data.materialTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.materials.length} item{data.materials.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Labour</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{currency(data.labourTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.totalMinutes > 0 ? formatMinutes(data.totalMinutes) : 'Connect Xero to pull hours'}
          </p>
        </div>

        <div className="bg-white rounded-xl border-2 border-green-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Total</p>
          </div>
          <p className="text-2xl font-bold text-green-800">{currency(data.grandTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">excl. GST</p>
        </div>
      </div>

      {/* Labour Breakdown */}
      {data.labour.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Labour Breakdown</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {data.labour.map(entry => (
              <div key={entry.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{entry.full_name}</p>
                    <p className="text-xs text-slate-500">
                      {entry.trade && `${entry.trade} · `}
                      {entry.duration_minutes
                        ? `${formatMinutes(entry.duration_minutes)} × ${currency(entry.hourly_rate)}/hr`
                        : 'In progress'}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {entry.duration_minutes ? currency(entry.cost) : '—'}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-50">
              <p className="text-sm font-semibold text-slate-600">Labour Total</p>
              <p className="text-sm font-bold text-slate-800">{currency(data.labourTotal)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Materials Breakdown */}
      {data.materials.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Materials Breakdown</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.materials.map(mat => (
                <tr key={mat.id}>
                  <td className="px-6 py-3 text-slate-800">{mat.material_name}</td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {mat.quantity}{mat.unit ? ` ${mat.unit}` : ''}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">{currency(mat.unit_price)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-700">{currency(mat.total_cost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={3} className="px-6 py-3 text-sm font-semibold text-slate-600 text-right">
                  Materials Total
                </td>
                <td className="px-6 py-3 text-right text-sm font-bold text-slate-800">
                  {currency(data.materialTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
          <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No cost data yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Costs appear once materials are logged on this job.
          </p>
        </div>
      )}

      {/* Error */}
      {genError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {genError}
        </div>
      )}

      {/* Generate Invoice Button */}
      <div className="flex justify-end pb-2">
        <button
          onClick={handleGenerateInvoice}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {generating
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <FileText className="w-4 h-4" />
          }
          {generating ? 'Generating…' : 'Generate Invoice'}
        </button>
      </div>

    </div>
  )
}