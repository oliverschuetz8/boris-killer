'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, CheckCircle2, XCircle,
  Trash2, Loader2, FileText, User, Calendar, Briefcase, Upload,
} from 'lucide-react'
import { updateInvoiceStatus, deleteInvoice, type Invoice } from '@/lib/services/invoices'
import { pushInvoiceToXero } from '@/lib/services/xero'

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

export default function InvoiceDetailView({ invoice }: { invoice: Invoice }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function handleStatus(status: Invoice['status']) {
    setBusy(status)
    try {
      await updateInvoiceStatus(invoice.id, status)
      router.refresh()
    } catch {
      alert(`Failed to update status`)
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setBusy('delete')
    try {
      await deleteInvoice(invoice.id)
      router.push('/invoices')
    } catch {
      alert('Failed to delete invoice')
      setBusy(null)
    }
  }

  async function handlePushToXero() {
    setBusy('xero')
    try {
      await pushInvoiceToXero(invoice.id)
      alert('Invoice pushed to Xero as draft.')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to push to Xero')
    } finally {
      setBusy(null)
    }
  }

  const lineItems = invoice.invoice_line_items || []

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-50 pt-6">
        <div className="w-full px-6">
          <div className="bg-white rounded-xl border border-slate-200 px-6 pt-5 pb-5">

            {/* Back + breadcrumb */}
            <div className="flex items-center gap-2 mb-4">
              <Link href="/invoices"
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              </Link>
              <Link href="/invoices" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                Invoices
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-slate-500">{invoice.invoice_number}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[invoice.status]}`}>
                    {invoice.status}
                  </span>
                  <span className="text-2xl font-bold text-slate-900">{currency(invoice.total)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {invoice.status === 'draft' && (
                  <button onClick={() => handleStatus('sent')} disabled={busy !== null}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {busy === 'sent' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Mark Sent
                  </button>
                )}
                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                  <button onClick={() => handleStatus('paid')} disabled={busy !== null}
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                    {busy === 'paid' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Mark Paid
                  </button>
                )}
                {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                  <button onClick={() => handleStatus('cancelled')} disabled={busy !== null}
                    className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                    {busy === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Cancel
                  </button>
                )}
                {invoice.status === 'draft' && (
                  <button onClick={handleDelete} disabled={busy !== null}
                    className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                    {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Line Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-800">Line Items</h2>
              </div>

              {lineItems.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-sm text-slate-500">No line items</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-5 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="text-right px-5 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="text-right px-5 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</th>
                      <th className="text-right px-5 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lineItems.map(item => (
                      <tr key={item.id}>
                        <td className="px-5 py-2.5">
                          <p className="text-slate-800">{item.description}</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider mt-0.5 ${
                            item.line_type === 'material'
                              ? 'bg-orange-50 text-orange-600'
                              : item.line_type === 'labour'
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-slate-50 text-slate-500'
                          }`}>
                            {item.line_type}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right text-slate-600">{Number(item.quantity)}</td>
                        <td className="px-5 py-2.5 text-right text-slate-600">{currency(item.unit_price)}</td>
                        <td className="px-5 py-2.5 text-right font-semibold text-slate-700">{currency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-sm text-slate-600">Subtotal</td>
                      <td className="px-5 py-2 text-right text-sm font-semibold text-slate-800">{currency(invoice.subtotal)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-sm text-slate-600">
                        GST ({Number(invoice.tax_rate)}%)
                      </td>
                      <td className="px-5 py-2 text-right text-sm font-semibold text-slate-800">{currency(invoice.tax_amount)}</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td colSpan={3} className="px-5 py-3 text-right text-sm font-bold text-slate-800">Total</td>
                      <td className="px-5 py-3 text-right text-lg font-bold text-green-700">{currency(invoice.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</p>
              </div>
              <p className="text-sm font-semibold text-slate-800">{invoice.customer?.name || '—'}</p>
              {invoice.customer?.email && <p className="text-xs text-slate-500 mt-0.5">{invoice.customer.email}</p>}
              {invoice.customer?.phone && <p className="text-xs text-slate-500">{invoice.customer.phone}</p>}
            </div>

            {invoice.job && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked Job</p>
                </div>
                <Link href={`/jobs/${invoice.job_id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                  {invoice.job.job_number}
                </Link>
                <p className="text-xs text-slate-500 mt-0.5">{invoice.job.title}</p>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dates</p>
              </div>
              <div className="space-y-2">
                {invoice.issued_date && (
                  <div>
                    <p className="text-xs text-slate-500">Issued</p>
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(invoice.issued_date).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        timeZone: 'Australia/Sydney',
                      })}
                    </p>
                  </div>
                )}
                {invoice.due_date && (
                  <div>
                    <p className="text-xs text-slate-500">Due</p>
                    <p className="text-sm font-medium text-slate-800">
                      {new Date(invoice.due_date).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        timeZone: 'Australia/Sydney',
                      })}
                    </p>
                  </div>
                )}
                {invoice.paid_date && (
                  <div>
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="text-sm font-medium text-green-700">
                      {new Date(invoice.paid_date).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        timeZone: 'Australia/Sydney',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Push to Xero */}
            {invoice.status !== 'cancelled' && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Xero</p>
                </div>
                <button
                  onClick={handlePushToXero}
                  disabled={busy !== null}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {busy === 'xero' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Push to Xero
                </button>
                <p className="text-xs text-slate-400 mt-2">Creates a draft invoice in your connected Xero account.</p>
              </div>
            )}

            {invoice.notes && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}