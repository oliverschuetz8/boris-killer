'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Package, Clock, DollarSign, User, FileText, Loader2, TrendingUp, Receipt,
} from 'lucide-react'
import { getJobCostBreakdown, type JobCostBreakdown } from '@/lib/services/job-cost'
import {
  createInvoiceFromJob,
  getInvoicedTotalForJob,
  getInvoicesForJob,
  type Invoice,
} from '@/lib/services/invoices'
import PartialInvoiceForm from '../../invoices/partial-invoice-form'

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

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export default function JobCostTab({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [data, setData] = useState<JobCostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [invoiced, setInvoiced] = useState<{ invoiced: number; invoiceCount: number }>({ invoiced: 0, invoiceCount: 0 })
  const [priorInvoices, setPriorInvoices] = useState<Invoice[]>([])
  const [partialOpen, setPartialOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      getJobCostBreakdown(jobId),
      getInvoicedTotalForJob(jobId),
      getInvoicesForJob(jobId),
    ])
      .then(([breakdown, total, invs]) => {
        if (cancelled) return
        setData(breakdown)
        setInvoiced(total)
        setPriorInvoices(invs)
        setLoading(false)
      })
      .catch(() => !cancelled && setLoading(false))

    return () => { cancelled = true }
  }, [jobId])

  async function handleGenerateFullInvoice() {
    if (invoiced.invoiceCount > 0) {
      const ok = confirm(
        `This job already has ${invoiced.invoiceCount} invoice(s) totalling ${currency(invoiced.invoiced)}.\n\n` +
        `A full-job invoice will include all materials and labour again — this may result in double-billing.\n\n` +
        `Continue?`
      )
      if (!ok) return
    }
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

  function handlePartialCreated(invoiceId: string) {
    setPartialOpen(false)
    router.push(`/invoices/${invoiceId}`)
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

  const hasData = data.materialSellTotal > 0 || data.totalMinutes > 0
  const totalJobValue = data.grandTotal
  const remaining = Math.max(0, totalJobValue - invoiced.invoiced)
  const progressPct = totalJobValue > 0
    ? Math.min(100, Math.round((invoiced.invoiced / totalJobValue) * 100))
    : 0

  return (
    <div className="space-y-6 mt-4">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials (Sell)</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{currency(data.materialSellTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.materials.length} item{data.materials.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials (Cost)</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{currency(data.materialBuyTotal)}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.materialMargin > 0 ? `${data.materialMargin.toFixed(1)}% margin` : 'No cost data'}
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

      {/* Invoicing Progress Panel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Invoicing Progress</h3>
        </div>
        <div className="px-6 py-4">
          {totalJobValue === 0 && invoiced.invoiceCount === 0 ? (
            <p className="text-sm text-slate-500">
              No costs logged yet — invoicing progress will appear once materials or labour are recorded.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">{currency(invoiced.invoiced)}</span> invoiced
                  {invoiced.invoiceCount > 0 && (
                    <span className="text-slate-500"> across {invoiced.invoiceCount} invoice{invoiced.invoiceCount !== 1 ? 's' : ''}</span>
                  )}
                </p>
                <p className="text-sm text-slate-700">
                  <span className="font-semibold text-green-700">{currency(remaining)}</span>
                  <span className="text-slate-500"> remaining</span>
                </p>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {progressPct}% of {currency(totalJobValue)} job value (ex-GST)
              </p>

              {priorInvoices.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Prior invoices</p>
                  {priorInvoices.map(inv => (
                    <Link
                      key={inv.id}
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-medium text-blue-600">{inv.invoice_number}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                          {inv.status}
                        </span>
                        {inv.scope_label && (
                          <span className="text-xs text-slate-500 truncate">
                            {inv.is_partial ? '· Progress: ' : '· '}{inv.scope_label}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-slate-700 flex-shrink-0">{currency(inv.total)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
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
                      {entry.hours
                        ? `${entry.hours}h × ${currency(entry.hourly_rate)}/hr`
                        : 'No hours'}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {entry.hours ? currency(entry.cost) : '—'}
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
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Buy Cost</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sell Price</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total (Sell)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.materials.map(mat => (
                <tr key={mat.id}>
                  <td className="px-6 py-3 text-slate-800">{mat.material_name}</td>
                  <td className="px-6 py-3 text-right text-slate-600">
                    {mat.quantity}{mat.unit ? ` ${mat.unit}` : ''}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500">
                    {mat.buy_cost > 0 ? currency(mat.buy_cost) : '—'}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-600">{currency(mat.sell_price)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-700">{currency(mat.total_sell)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={2} className="px-6 py-3 text-sm font-semibold text-slate-600 text-right">
                  Materials Total
                </td>
                <td className="px-6 py-3 text-right text-sm text-slate-500">
                  {data.materialBuyTotal > 0 ? currency(data.materialBuyTotal) : '—'}
                </td>
                <td className="px-6 py-3"></td>
                <td className="px-6 py-3 text-right text-sm font-bold text-slate-800">
                  {currency(data.materialSellTotal)}
                </td>
              </tr>
              {data.materialMargin > 0 && (
                <tr className="bg-green-50 border-t border-green-100">
                  <td colSpan={4} className="px-6 py-2 text-xs font-medium text-green-700 text-right">
                    Margin
                  </td>
                  <td className="px-6 py-2 text-right text-xs font-bold text-green-700">
                    {data.materialMargin.toFixed(1)}% ({currency(data.materialSellTotal - data.materialBuyTotal)})
                  </td>
                </tr>
              )}
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

      {/* Invoice action buttons */}
      <div className="flex justify-end gap-2 pb-2">
        <button
          onClick={() => setPartialOpen(true)}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          New Partial Invoice
        </button>
        <button
          onClick={handleGenerateFullInvoice}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {generating
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <FileText className="w-4 h-4" />
          }
          {generating ? 'Generating…' : 'Generate Full Invoice'}
        </button>
      </div>

      {/* Partial Invoice Modal */}
      {partialOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setPartialOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">New Partial Invoice</h2>
                <p className="text-xs text-slate-500">Bill a portion of this job&apos;s work</p>
              </div>
              <button
                onClick={() => setPartialOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-medium px-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <PartialInvoiceForm
                jobId={jobId}
                onCreated={handlePartialCreated}
                onCancel={() => setPartialOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
