import type { EmailBranding, RenderedEmail } from '../types'
import { wrapTemplate, detailsTable, escapeHtml, plainTextFooter } from './base'

export interface InvoiceOverdueData {
  invoice_id: string
  invoice_number: string
  customer_name: string | null
  total_amount: number
  due_date: string | null
  days_overdue: number
  app_url: string
  audience: 'internal' | 'customer'
}

function formatDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function renderInvoiceOverdueEmail(data: InvoiceOverdueData, branding: EmailBranding): RenderedEmail {
  const subject = data.audience === 'customer'
    ? `Friendly reminder: invoice ${data.invoice_number}`
    : `Invoice overdue — ${data.invoice_number} (${data.days_overdue} ${data.days_overdue === 1 ? 'day' : 'days'} late)`

  const invoiceUrl = `${data.app_url}/invoices/${data.invoice_id}`

  const dayLabel = `${data.days_overdue} ${data.days_overdue === 1 ? 'day' : 'days'}`

  const bodyHtml = data.audience === 'customer'
    ? `
      <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">
        ${escapeHtml(data.customer_name ? `Hi ${data.customer_name},` : 'Hi,')}
      </p>
      <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">
        Just a friendly reminder that invoice <strong>${escapeHtml(data.invoice_number)}</strong> is now overdue. If you've already arranged payment, please ignore this message.
      </p>
      ${detailsTable([
        { label: 'Invoice number', value: data.invoice_number },
        { label: 'Amount due', value: formatCurrency(data.total_amount) },
        { label: 'Due', value: formatDate(data.due_date) || '—' },
        { label: 'Overdue', value: dayLabel },
      ])}
      <p style="margin:16px 0 0;color:#334155;font-size:14px;line-height:1.6;">
        If you have any questions, just reply to this email.
      </p>
    `
    : detailsTable([
        { label: 'Invoice number', value: data.invoice_number },
        { label: 'Customer', value: data.customer_name || '—' },
        { label: 'Amount owing', value: formatCurrency(data.total_amount) },
        { label: 'Due date', value: formatDate(data.due_date) || '—' },
        { label: 'Overdue by', value: dayLabel },
      ])

  const html = wrapTemplate(branding, {
    preheader: `${data.invoice_number} is ${dayLabel} overdue`,
    heading: data.audience === 'customer'
      ? `Reminder: invoice ${data.invoice_number}`
      : 'Invoice overdue',
    intro: data.audience === 'internal'
      ? `${data.invoice_number} is ${dayLabel} past its due date.`
      : undefined,
    bodyHtml,
    ctaLabel: data.audience === 'internal' ? 'View invoice' : undefined,
    ctaUrl: data.audience === 'internal' ? invoiceUrl : undefined,
  })

  const text = data.audience === 'customer'
    ? [
        `Hi ${data.customer_name || ''}`.trim() + ',',
        '',
        `Just a friendly reminder that invoice ${data.invoice_number} is now overdue.`,
        '',
        `Amount due: ${formatCurrency(data.total_amount)}`,
        `Due: ${formatDate(data.due_date) || '—'}`,
        `Overdue: ${dayLabel}`,
        '',
        'Reply to this email with any questions.',
        plainTextFooter(branding),
      ].join('\n')
    : [
        'Invoice overdue',
        '',
        `Invoice number: ${data.invoice_number}`,
        `Customer: ${data.customer_name || '—'}`,
        `Amount owing: ${formatCurrency(data.total_amount)}`,
        `Due date: ${formatDate(data.due_date) || '—'}`,
        `Overdue by: ${dayLabel}`,
        '',
        `View: ${invoiceUrl}`,
        plainTextFooter(branding),
      ].join('\n')

  return { subject, html, text }
}
