'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import type { Invoice, JobWithInvoiceTotals } from '@/lib/services/invoices'
import NewInvoiceModal from './new-invoice-modal'
import SearchFilter, { type FilterDef } from '@/components/ui/search-filter'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

const STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const

function currency(amount: number) {
  return `A$${Number(amount).toFixed(2)}`
}

function formatStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ---------------------------------------------------------------------------
// Issued-period buckets (AU financial year = Jul 1 – Jun 30)
// All comparisons done as YYYY-MM-DD strings against the `issued_date` column,
// which is a Postgres `date` (no time component) — lexicographic compare is
// correct for date ranges.
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { value: 'this_month',     label: 'This month' },
  { value: 'last_month',     label: 'Last month' },
  { value: 'this_quarter',   label: 'This quarter' },
  { value: 'this_fy',        label: 'This FY (Jul–Jun)' },
  { value: 'past_12_months', label: 'Past 12 months' },
] as const

function sydneyToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function getPeriodRange(bucket: string): { start: string; end: string } | null {
  const today = sydneyToday()
  const [y, m, d] = today.split('-').map(Number)

  switch (bucket) {
    case 'this_month': {
      const lastDay = new Date(y, m, 0).getDate()
      return { start: `${y}-${pad(m)}-01`, end: `${y}-${pad(m)}-${pad(lastDay)}` }
    }
    case 'last_month': {
      const lm = m === 1 ? 12 : m - 1
      const ly = m === 1 ? y - 1 : y
      const lastDay = new Date(ly, lm, 0).getDate()
      return { start: `${ly}-${pad(lm)}-01`, end: `${ly}-${pad(lm)}-${pad(lastDay)}` }
    }
    case 'this_quarter': {
      const qStart = m <= 3 ? 1 : m <= 6 ? 4 : m <= 9 ? 7 : 10
      const qEnd   = qStart + 2
      const lastDay = new Date(y, qEnd, 0).getDate()
      return { start: `${y}-${pad(qStart)}-01`, end: `${y}-${pad(qEnd)}-${pad(lastDay)}` }
    }
    case 'this_fy': {
      // AU FY runs Jul 1 → Jun 30. Months 7–12 start this year's FY; 1–6 are still last year's.
      const fyStart = m >= 7 ? y : y - 1
      return { start: `${fyStart}-07-01`, end: `${fyStart + 1}-06-30` }
    }
    case 'past_12_months': {
      return { start: `${y - 1}-${pad(m)}-${pad(d)}`, end: today }
    }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InvoicesListProps {
  invoices: Invoice[]
  jobs: JobWithInvoiceTotals[]
}

export default function InvoicesList({ invoices, jobs }: InvoicesListProps) {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    status: '',
    customer: '',
    job: '',
    scope: '',
    period: '',
  })
  const [modalOpen, setModalOpen] = useState(false)

  // -------------------------------------------------------------------------
  // Dynamic filter options — built from already-loaded invoice data so the
  // dropdown only shows customers/jobs that actually have invoices.
  // -------------------------------------------------------------------------

  const customerOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const inv of invoices) {
      if (inv.customer_id && inv.customer?.name && !seen.has(inv.customer_id)) {
        seen.set(inv.customer_id, inv.customer.name)
      }
    }
    return [...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [invoices])

  const jobOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const inv of invoices) {
      if (inv.job_id && inv.job && !seen.has(inv.job_id)) {
        seen.set(inv.job_id, `${inv.job.job_number} — ${inv.job.title}`)
      }
    }
    return [...seen.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [invoices])

  const filterDefs: FilterDef[] = useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: '', label: 'All statuses' },
        ...STATUSES.map(s => ({ value: s, label: formatStatus(s) })),
      ],
    },
    {
      key: 'customer',
      label: 'Customer',
      options: [
        { value: '', label: 'All customers' },
        ...customerOptions,
      ],
    },
    {
      key: 'job',
      label: 'Job',
      options: [
        { value: '', label: 'All jobs' },
        ...jobOptions,
      ],
    },
    {
      key: 'scope',
      label: 'Scope',
      options: [
        { value: '', label: 'All scopes' },
        { value: 'full',     label: 'Full invoice' },
        { value: 'progress', label: 'Progress (partial)' },
      ],
    },
    {
      key: 'period',
      label: 'Issued period',
      options: [
        { value: '', label: 'All periods' },
        ...PERIOD_OPTIONS.map(p => ({ value: p.value, label: p.label })),
      ],
    },
  ], [customerOptions, jobOptions])

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filtered = invoices.filter(inv => {
    if (activeFilters.status && inv.status !== activeFilters.status) return false
    if (activeFilters.customer && inv.customer_id !== activeFilters.customer) return false
    if (activeFilters.job && inv.job_id !== activeFilters.job) return false

    if (activeFilters.scope) {
      const isPartial = !!inv.is_partial
      if (activeFilters.scope === 'full' && isPartial) return false
      if (activeFilters.scope === 'progress' && !isPartial) return false
    }

    if (activeFilters.period) {
      const range = getPeriodRange(activeFilters.period)
      if (range) {
        if (!inv.issued_date) return false
        if (inv.issued_date < range.start || inv.issued_date > range.end) return false
      }
    }

    if (search) {
      const q = search.toLowerCase()
      const matches =
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.customer?.name || '').toLowerCase().includes(q) ||
        (inv.job?.title || '').toLowerCase().includes(q) ||
        (inv.job?.job_number || '').toLowerCase().includes(q)
      if (!matches) return false
    }

    return true
  })

  // -------------------------------------------------------------------------
  // Summary card totals — always reflect the full invoice set (not filtered),
  // so the cards stay a stable "health of business" view.
  // -------------------------------------------------------------------------

  const totals = {
    draft:   invoices.filter(i => i.status === 'draft').reduce((s, i) => s + Number(i.total), 0),
    sent:    invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total), 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0),
    paid:    invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0),
  }

  return (
    <div className="w-full px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New invoice
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Draft',   value: totals.draft,   color: 'text-slate-600' },
          { label: 'Sent',    value: totals.sent,    color: 'text-blue-600' },
          { label: 'Overdue', value: totals.overdue, color: 'text-red-600' },
          { label: 'Paid',    value: totals.paid,    color: 'text-green-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>{currency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Search + filters (shared SearchFilter component) */}
      <SearchFilter
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by invoice #, customer, or job…"
        filters={filterDefs}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => setActiveFilters(prev => ({ ...prev, [key]: value }))}
      />

      {/* Result count */}
      <p className="text-xs text-slate-500 mt-3 mb-4">
        {filtered.length} of {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {invoices.length === 0 ? 'No invoices yet.' : 'No invoices match your filters.'}
            </p>
            {invoices.length === 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Click &ldquo;New invoice&rdquo; above to create one.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Job</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issued</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 font-medium hover:underline">
                          {inv.invoice_number}
                        </Link>
                        {inv.is_partial && inv.scope_label && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-purple-50 text-purple-700">
                            Progress: {inv.scope_label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-800">
                      {inv.customer?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {inv.job ? (
                        <Link href={`/jobs/${inv.job_id}`} className="hover:text-blue-600 transition-colors">
                          {inv.job.job_number}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-800">
                      {currency(inv.total)}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {inv.issued_date
                        ? new Date(inv.issued_date).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            timeZone: 'Australia/Sydney',
                          })
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {inv.due_date
                        ? new Date(inv.due_date).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            timeZone: 'Australia/Sydney',
                          })
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <NewInvoiceModal jobs={jobs} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
