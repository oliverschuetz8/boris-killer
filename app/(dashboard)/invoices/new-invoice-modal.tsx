'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { X, Search, ArrowLeft, Loader2, FileText, Briefcase, AlertTriangle } from 'lucide-react'
import type { JobWithInvoiceTotals } from '@/lib/services/invoices'
import { createInvoiceFromJob } from '@/lib/services/invoices'
import { friendlyError } from '@/lib/errors'
import PartialInvoiceForm from './partial-invoice-form'

function currency(n: number) {
  return `A$${Number(n).toFixed(2)}`
}

interface NewInvoiceModalProps {
  jobs: JobWithInvoiceTotals[]
  onClose: () => void
  initialJobId?: string
}

export default function NewInvoiceModal({ jobs, onClose, initialJobId }: NewInvoiceModalProps) {
  const router = useRouter()

  const initialJob = initialJobId ? jobs.find(j => j.id === initialJobId) ?? null : null
  const [stage, setStage] = useState<'job' | 'scope'>(initialJob ? 'scope' : 'job')
  const [scopeMode, setScopeMode] = useState<'full' | 'partial'>('full')
  const [selectedJob, setSelectedJob] = useState<JobWithInvoiceTotals | null>(initialJob)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return jobs
    const s = search.toLowerCase()
    return jobs.filter(j =>
      j.job_number.toLowerCase().includes(s) ||
      j.title.toLowerCase().includes(s) ||
      (j.customer_name?.toLowerCase().includes(s) ?? false)
    )
  }, [jobs, search])

  function pickJob(job: JobWithInvoiceTotals) {
    setSelectedJob(job)
    setStage('scope')
    setScopeMode('full')
    setError(null)
  }

  function backToJobPicker() {
    if (initialJobId) {
      onClose()
      return
    }
    setStage('job')
    setSelectedJob(null)
    setError(null)
  }

  async function handleCreateFull() {
    if (!selectedJob) return
    if (selectedJob.invoice_count > 0) {
      const ok = confirm(
        `This job already has ${selectedJob.invoice_count} invoice(s) totalling ${currency(selectedJob.invoiced_amount)}.\n\n` +
        `A full-job invoice will include all materials and labour again — this may result in double-billing.\n\n` +
        `Continue?`
      )
      if (!ok) return
    }
    setSubmitting(true)
    setError(null)
    try {
      const id = await createInvoiceFromJob(selectedJob.id)
      if (!id) throw new Error('No invoice ID returned')
      onClose()
      router.push(`/invoices/${id}`)
    } catch (err) {
      setError(friendlyError(err, "We couldn't create that invoice. Check the line items and totals, then try again."))
      setSubmitting(false)
    }
  }

  function handlePartialCreated(invoiceId: string) {
    onClose()
    router.push(`/invoices/${invoiceId}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {stage === 'scope' && (
              <button
                onClick={backToJobPicker}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                title={initialJobId ? 'Close' : 'Back'}
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-900">New Invoice</h2>
              <p className="text-xs text-slate-500">
                {stage === 'job'
                  ? 'Step 1 of 2 — Pick a job'
                  : initialJobId
                  ? 'Pick scope'
                  : 'Step 2 of 2 — Pick scope'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {stage === 'job' ? (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by job number, title, or customer…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Job list */}
              {filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {jobs.length === 0 ? 'No jobs to invoice yet.' : 'No jobs match your search.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(j => (
                    <button
                      key={j.id}
                      onClick={() => pickJob(j)}
                      className="w-full text-left bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900">{j.job_number}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-100 text-slate-600 capitalize">
                              {j.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 mt-0.5 truncate">{j.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{j.customer_name || 'No customer'}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-slate-900">{currency(j.total_job_value)}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {j.invoice_count > 0
                              ? `${currency(j.invoiced_amount)} invoiced (${j.invoice_count})`
                              : 'No invoices yet'}
                          </p>
                          <p className="text-[11px] text-green-700 mt-0.5">{currency(j.remaining)} remaining</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            selectedJob && (
              <>
                {/* Selected job summary */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3 mb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected job</p>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                        {selectedJob.job_number} · {selectedJob.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{selectedJob.customer_name || 'No customer'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">{currency(selectedJob.total_job_value)} total</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {currency(selectedJob.invoiced_amount)} invoiced ({selectedJob.invoice_count})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scope tabs */}
                <div className="flex bg-slate-100 rounded-lg p-1 mb-5">
                  <button
                    onClick={() => setScopeMode('full')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      scopeMode === 'full'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Full job
                  </button>
                  <button
                    onClick={() => setScopeMode('partial')}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      scopeMode === 'partial'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Partial / progress
                  </button>
                </div>

                {scopeMode === 'full' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Auto-pulls all materials and labour logged on this job into a single invoice.
                    </p>

                    {selectedJob.invoice_count > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800">Heads up</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              This job already has {selectedJob.invoice_count} invoice(s) totalling{' '}
                              {currency(selectedJob.invoiced_amount)}. A full-job invoice will include all materials and
                              labour again, which may double-bill the customer. You&apos;ll be asked to confirm before
                              continuing.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={handleCreateFull}
                        disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                        {submitting ? 'Creating…' : 'Create full-job invoice'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <PartialInvoiceForm
                    jobId={selectedJob.id}
                    jobLabel={`${selectedJob.job_number} — ${selectedJob.title}`}
                    onCreated={handlePartialCreated}
                  />
                )}
              </>
            )
          )}
        </div>
      </div>
    </div>
  )
}
