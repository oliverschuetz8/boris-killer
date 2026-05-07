'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Calendar, Download, Info } from 'lucide-react'
import {
  createInvoiceFromJob,
  getPartialInvoiceContext,
  getJobBillablesForPeriod,
  type PartialInvoiceContext,
} from '@/lib/services/invoices'

interface LineRow {
  id: string
  description: string
  quantity: string
  unit_price: string
}

function currency(amount: number) {
  return `A$${Number(amount).toFixed(2)}`
}

function formatDate(d: string | null | undefined) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function newRow(): LineRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: '',
    quantity: '1',
    unit_price: '',
  }
}

function isRowDirty(r: LineRow): boolean {
  // Treat default-blank-with-qty=1 as not-dirty
  if (r.description.trim().length > 0) return true
  if (r.unit_price.trim().length > 0) return true
  if (r.quantity.trim() !== '' && r.quantity.trim() !== '1') return true
  return false
}

export interface PartialInvoiceFormProps {
  jobId: string
  jobLabel?: string
  onCreated: (invoiceId: string) => void
  onCancel?: () => void
  taxRate?: number
}

export default function PartialInvoiceForm({
  jobId,
  jobLabel,
  onCreated,
  onCancel,
  taxRate = 10,
}: PartialInvoiceFormProps) {
  const [scopeLabel, setScopeLabel] = useState('')
  const [rows, setRows] = useState<LineRow[]>([newRow()])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [context, setContext] = useState<PartialInvoiceContext | null>(null)
  const [contextLoading, setContextLoading] = useState(true)
  const [pulling, setPulling] = useState(false)
  const [pullSummary, setPullSummary] = useState<string | null>(null)

  // Load smart-default context on mount
  useEffect(() => {
    let cancelled = false
    getPartialInvoiceContext(jobId)
      .then(ctx => {
        if (cancelled) return
        setContext(ctx)
        setPeriodStart(ctx.suggestedStart)
        setPeriodEnd(ctx.suggestedEnd)
        setContextLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        const today = new Date().toISOString().split('T')[0]
        setPeriodStart(today)
        setPeriodEnd(today)
        setContextLoading(false)
      })
    return () => { cancelled = true }
  }, [jobId])

  function updateRow(id: string, patch: Partial<LineRow>) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows(rs => [...rs, newRow()])
  }

  function removeRow(id: string) {
    setRows(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs))
  }

  async function handlePull() {
    if (!periodStart || !periodEnd) {
      setError('Pick a start and end date first.')
      return
    }
    if (periodStart > periodEnd) {
      setError('Start date must be on or before end date.')
      return
    }

    const hasUserContent = rows.some(isRowDirty)
    if (hasUserContent) {
      const ok = confirm(
        'This will replace your current line items with what was logged in the selected period. Continue?'
      )
      if (!ok) return
    }

    setPulling(true)
    setError(null)
    setPullSummary(null)
    try {
      const billables = await getJobBillablesForPeriod(jobId, periodStart, periodEnd)
      if (billables.length === 0) {
        setRows([newRow()])
        setPullSummary(
          `No materials or labour found between ${formatDate(periodStart)} and ${formatDate(periodEnd)}.`
        )
      } else {
        const pulledRows: LineRow[] = billables.map(b => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          description: b.description,
          quantity: String(b.quantity),
          unit_price: String(b.unit_price),
        }))
        setRows(pulledRows)
        const matCount = billables.filter(b => b.source === 'material').length
        const labCount = billables.filter(b => b.source === 'labour').length
        setPullSummary(
          `Pulled ${matCount} material${matCount !== 1 ? 's' : ''} and ${labCount} labour entr${labCount !== 1 ? 'ies' : 'y'} from ${formatDate(periodStart)} to ${formatDate(periodEnd)}.`
        )
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to pull billables for this period')
    } finally {
      setPulling(false)
    }
  }

  // Live totals
  const lineAmounts = rows.map(r => {
    const qty = Number(r.quantity || 0)
    const price = Number(r.unit_price || 0)
    return Math.round(qty * price * 100) / 100
  })
  const subtotal = Math.round(lineAmounts.reduce((s, a) => s + a, 0) * 100) / 100
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100
  const total = Math.round((subtotal + taxAmount) * 100) / 100

  // Validation
  const validRows = rows.filter(r => {
    const qty = Number(r.quantity || 0)
    const price = Number(r.unit_price || 0)
    return r.description.trim().length > 0 && qty > 0 && price >= 0
  })
  const canSubmit = scopeLabel.trim().length > 0 && validRows.length > 0 && !submitting && !pulling

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const customLineItems = validRows.map(r => ({
        description: r.description.trim(),
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
      }))
      const invoiceId = await createInvoiceFromJob(jobId, {
        isPartial: true,
        scopeLabel: scopeLabel.trim(),
        customLineItems,
        taxRate,
        periodStartDate: periodStart || null,
        periodEndDate: periodEnd || null,
      })
      if (!invoiceId) throw new Error('No invoice ID returned')
      onCreated(invoiceId)
    } catch (err: any) {
      setError(err?.message || 'Failed to create partial invoice')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">

      {jobLabel && (
        <div className="text-xs font-medium text-slate-500">
          For job: <span className="text-slate-700">{jobLabel}</span>
        </div>
      )}

      {/* Scope label */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          Scope label <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={scopeLabel}
          onChange={e => setScopeLabel(e.target.value)}
          placeholder='e.g. "First month" or "Progress to 30 April"'
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <p className="text-xs text-slate-400 mt-1">
          Helps you and the customer track which portion of the job this invoice covers.
        </p>
      </div>

      {/* Period + pull */}
      <div className="bg-blue-50/40 rounded-lg border border-blue-100 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-600" />
          <p className="text-sm font-semibold text-slate-800">Bill for a specific period</p>
        </div>

        {context && (context.jobStart || context.jobEnd) && (
          <div className="bg-white rounded-md border border-slate-200 px-3 py-2 mb-3">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Job timeline</p>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[10px] text-slate-400">
                  {context.jobStartedActual ? 'Started' : 'Scheduled start'}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {context.jobStart ? formatDate(context.jobStart) : '—'}
                </p>
              </div>
              <div className="text-slate-300">→</div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400">
                  {context.jobEndedActual ? 'Completed' : 'Scheduled end'}
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {context.jobEnd ? formatDate(context.jobEnd) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}

        {context && context.lastPeriodEnd && (
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mb-3">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>
              Last invoice for this job covered up to {formatDate(context.lastPeriodEnd)}.
              Suggested start: {formatDate(context.suggestedStart)}.
            </span>
          </div>
        )}
        {context && !context.lastPeriodEnd && context.jobStart && (
          <div className="flex items-start gap-1.5 text-[11px] text-slate-500 mb-3">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>Job started {formatDate(context.jobStart)} — set as suggested start.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Bill from
            </label>
            <input
              type="date"
              value={periodStart}
              onChange={e => setPeriodStart(e.target.value)}
              disabled={contextLoading}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Bill to
            </label>
            <input
              type="date"
              value={periodEnd}
              onChange={e => setPeriodEnd(e.target.value)}
              disabled={contextLoading}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handlePull}
            disabled={contextLoading || pulling || submitting}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {pulling ? 'Pulling…' : 'Pull billables'}
          </button>
        </div>

        {pullSummary && (
          <p className="text-xs text-blue-700 mt-3">{pullSummary}</p>
        )}
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Line items <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add line
          </button>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
            <div className="col-span-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Description</div>
            <div className="col-span-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Qty</div>
            <div className="col-span-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Unit price</div>
            <div className="col-span-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <div key={row.id} className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center">
                <div className="col-span-6">
                  <input
                    type="text"
                    value={row.description}
                    onChange={e => updateRow(row.id, { description: e.target.value })}
                    placeholder="e.g. Sealing penetrations Level 3"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={row.quantity}
                    onChange={e => updateRow(row.id, { quantity: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm text-right border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={row.unit_price}
                    onChange={e => updateRow(row.id, { unit_price: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-2.5 py-1.5 text-sm text-right border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="col-span-1 text-right text-sm font-semibold text-slate-700">
                  {currency(lineAmounts[idx] || 0)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400"
                    title={rows.length === 1 ? 'At least one line required' : 'Remove line'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Totals */}
      <div className="bg-slate-50 rounded-lg border border-slate-200 px-5 py-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Subtotal (ex-GST)</span>
            <span className="font-semibold text-slate-800">{currency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">GST ({taxRate}%)</span>
            <span className="font-semibold text-slate-800">{currency(taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-800">Total</span>
            <span className="text-lg font-bold text-green-700">{currency(total)}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating…
            </>
          ) : (
            'Create partial invoice'
          )}
        </button>
      </div>

    </div>
  )
}
