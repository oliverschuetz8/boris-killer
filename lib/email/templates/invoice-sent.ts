import type { EmailBranding, RenderedEmail } from '../types'
import { wrapTemplate, detailsTable, escapeHtml, plainTextFooter } from './base'

export interface InvoiceSentData {
  invoice_id: string
  invoice_number: string
  customer_name: string | null
  job_number: string | null
  total_amount: number
  issued_date: string | null
  due_date: string | null
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

export function renderInvoiceSentEmail(data: InvoiceSentData, branding: EmailBranding): RenderedEmail {
  const subject = `Invoice ${data.invoice_number} from ${branding.name}`
  const greeting = data.customer_name ? `Hi ${data.customer_name},` : 'Hi,'

  const bodyHtml = `
    <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">
      Please find your invoice details below.${data.due_date ? ` Payment is due by <strong>${escapeHtml(formatDate(data.due_date))}</strong>.` : ''}
    </p>
    ${detailsTable([
      { label: 'Invoice number', value: data.invoice_number },
      { label: 'Job', value: data.job_number || '—' },
      { label: 'Issued', value: formatDate(data.issued_date) || '—' },
      { label: 'Due', value: formatDate(data.due_date) || '—' },
      { label: 'Amount due', value: formatCurrency(data.total_amount) },
    ])}
    <p style="margin:16px 0 0;color:#334155;font-size:14px;line-height:1.6;">
      If you have any questions about this invoice, just reply to this email and we'll get back to you.
    </p>
    <p style="margin:8px 0 0;color:#334155;font-size:14px;line-height:1.6;">Thanks for your business.</p>
  `

  const html = wrapTemplate(branding, {
    preheader: `Invoice ${data.invoice_number} — ${formatCurrency(data.total_amount)}`,
    heading: `Invoice ${data.invoice_number}`,
    bodyHtml,
  })

  const text = [
    greeting,
    '',
    `Please find your invoice details below.${data.due_date ? ` Payment is due by ${formatDate(data.due_date)}.` : ''}`,
    '',
    `Invoice number: ${data.invoice_number}`,
    `Job: ${data.job_number || '—'}`,
    `Issued: ${formatDate(data.issued_date) || '—'}`,
    `Due: ${formatDate(data.due_date) || '—'}`,
    `Amount due: ${formatCurrency(data.total_amount)}`,
    '',
    'Reply to this email with any questions.',
    'Thanks for your business.',
    plainTextFooter(branding),
  ].join('\n')

  return { subject, html, text }
}
