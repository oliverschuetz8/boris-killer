import type { EmailBranding, RenderedEmail } from '../types'
import { wrapTemplate, detailsTable, plainTextFooter } from './base'

export interface JobCreatedData {
  job_id: string
  job_number: string
  title: string
  customer_name: string | null
  scheduled_start: string | null
  site_address: string | null
  app_url: string
}

function formatDate(value: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function renderJobCreatedEmail(data: JobCreatedData, branding: EmailBranding): RenderedEmail {
  const subject = `New job created — ${data.job_number} ${data.title}`
  const jobUrl = `${data.app_url}/jobs/${data.job_id}`

  const bodyHtml = detailsTable([
    { label: 'Job number', value: data.job_number },
    { label: 'Title', value: data.title },
    { label: 'Customer', value: data.customer_name || '—' },
    { label: 'Scheduled', value: formatDate(data.scheduled_start) || 'Not scheduled' },
    { label: 'Site address', value: data.site_address || '—' },
  ])

  const html = wrapTemplate(branding, {
    preheader: `${data.job_number} for ${data.customer_name || 'a customer'}`,
    heading: 'A new job has been created',
    intro: `${data.job_number} has been added to your jobs list.`,
    bodyHtml,
    ctaLabel: 'View job',
    ctaUrl: jobUrl,
  })

  const text = [
    'A new job has been created',
    '',
    `Job number: ${data.job_number}`,
    `Title: ${data.title}`,
    `Customer: ${data.customer_name || '—'}`,
    `Scheduled: ${formatDate(data.scheduled_start) || 'Not scheduled'}`,
    data.site_address ? `Site: ${data.site_address}` : null,
    '',
    `View: ${jobUrl}`,
    plainTextFooter(branding),
  ].filter(Boolean).join('\n')

  return { subject, html, text }
}
