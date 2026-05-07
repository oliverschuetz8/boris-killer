import type { EmailBranding, RenderedEmail } from '../types'
import { wrapTemplate, detailsTable, plainTextFooter } from './base'

export interface InvoicePaidData {
  invoice_id: string
  invoice_number: string
  customer_name: string | null
  total_amount: number
  paid_at: string | null
  app_url: string
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

export function renderInvoicePaidEmail(data: InvoicePaidData, branding: EmailBranding): RenderedEmail {
  const subject = `Invoice paid — ${data.invoice_number} (${formatCurrency(data.total_amount)})`
  const invoiceUrl = `${data.app_url}/invoices/${data.invoice_id}`

  const bodyHtml = detailsTable([
    { label: 'Invoice number', value: data.invoice_number },
    { label: 'Customer', value: data.customer_name || '—' },
    { label: 'Amount', value: formatCurrency(data.total_amount) },
    { label: 'Marked paid', value: formatDate(data.paid_at) || '—' },
  ])

  const html = wrapTemplate(branding, {
    preheader: `${data.invoice_number} marked as paid`,
    heading: 'An invoice has been paid',
    intro: `Nice — ${data.invoice_number} has just been marked as paid.`,
    bodyHtml,
    ctaLabel: 'View invoice',
    ctaUrl: invoiceUrl,
  })

  const text = [
    'An invoice has been paid',
    '',
    `Invoice number: ${data.invoice_number}`,
    `Customer: ${data.customer_name || '—'}`,
    `Amount: ${formatCurrency(data.total_amount)}`,
    `Marked paid: ${formatDate(data.paid_at) || '—'}`,
    '',
    `View: ${invoiceUrl}`,
    plainTextFooter(branding),
  ].join('\n')

  return { subject, html, text }
}
