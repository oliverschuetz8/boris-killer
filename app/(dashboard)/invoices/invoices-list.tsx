'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import type { Invoice } from '@/lib/services/invoices'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

function currency(amount: number) {
  return `A$${Number(amount).toFixed(2)}`
}

export default function InvoicesList({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = invoices.filter(inv => {
    const matchesSearch =
      !search ||
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.job?.title?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const totals = {
    draft: invoices.filter(i => i.status === 'draft').reduce((s, i) => s + Number(i.total), 0),
    sent: invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total), 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0),
  }

  return (
    <div className="w-full px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Invoices</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Draft', value: totals.draft, color: 'text-slate-600' },
          { label: 'Sent', value: totals.sent, color: 'text-blue-600' },
          { label: 'Overdue', value: totals.overdue, color: 'text-red-600' },
          { label: 'Paid', value: totals.paid, color: 'text-green-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <p className={`text-xl font-bold mt-1 ${card.color}`}>{currency(card.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">

        {/* Search — no icon, inline style forces padding past browser overrides */}
        <input
          type="text"
          placeholder="Search invoices..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '14px', textAlign: 'left' }}
          className="flex-1 max-w-sm pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />

        {/* Status filter — no chevron, inline style forces padding past browser overrides */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ paddingLeft: '2px', textAlign: 'left' }}
          className="pr-6 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>

      </div>

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
                Generate an invoice from a job&apos;s Cost tab.
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
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 font-medium hover:underline">
                        {inv.invoice_number}
                      </Link>
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
    </div>
  )
}
