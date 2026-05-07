import type { EmailBranding, RenderedEmail } from '../types'
import { wrapTemplate, detailsTable, plainTextFooter } from './base'

export interface JobCompletedData {
  job_id: string
  job_number: string
  title: string
  customer_name: string | null
  completed_by_name: string | null
  completed_at: string | null
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

export function renderJobCompletedEmail(data: JobCompletedData, branding: EmailBranding): RenderedEmail {
  const subject = `Job completed — ${data.job_number} ${data.title}`
  const jobUrl = `${data.app_url}/jobs/${data.job_id}`

  const bodyHtml = detailsTable([
    { label: 'Job number', value: data.job_number },
    { label: 'Title', value: data.title },
    { label: 'Customer', value: data.customer_name || '—' },
    { label: 'Completed by', value: data.completed_by_name || '—' },
    { label: 'Completed at', value: formatDate(data.completed_at) },
  ])

  const html = wrapTemplate(branding, {
    preheader: `${data.job_number} marked as completed`,
    heading: 'A job has been completed',
    intro: `${data.job_number} is ready for review. You can run the report or generate an invoice from the job page.`,
    bodyHtml,
    ctaLabel: 'Review job',
    ctaUrl: jobUrl,
  })

  const text = [
    'A job has been completed',
    '',
    `Job number: ${data.job_number}`,
    `Title: ${data.title}`,
    `Customer: ${data.customer_name || '—'}`,
    `Completed by: ${data.completed_by_name || '—'}`,
    `Completed at: ${formatDate(data.completed_at)}`,
    '',
    `Review: ${jobUrl}`,
    plainTextFooter(branding),
  ].filter(Boolean).join('\n')

  return { subject, html, text }
}
