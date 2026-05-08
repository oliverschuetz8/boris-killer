import type { EmailBranding, RenderedEmail } from '../types'
import { wrapTemplate, escapeHtml, plainTextFooter, detailsTable } from './base'

export interface EventReminderData {
  event_id: string
  event_type_label: string
  title: string
  start_time: string
  end_time: string | null
  location: string | null
  video_link: string | null
  description: string | null
  customer_name: string | null
  minutes_before: number
  app_url: string
}

function formatTime(value: string): string {
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function minutesLabel(mins: number): string {
  if (mins === 0) return 'now'
  if (mins < 60) return `in ${mins} minutes`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `in ${days} day${days === 1 ? '' : 's'}`
}

export function renderEventReminderEmail(data: EventReminderData, branding: EmailBranding): RenderedEmail {
  const eventUrl = `${data.app_url}/schedule`
  const subject = `Reminder: ${data.title} ${minutesLabel(data.minutes_before)}`

  const rows: { label: string; value: string }[] = [
    { label: 'Type', value: data.event_type_label },
    { label: 'When', value: formatTime(data.start_time) + (data.end_time ? ` – ${formatTime(data.end_time).split(', ').slice(-1)[0]}` : '') },
  ]
  if (data.location) rows.push({ label: 'Location', value: data.location })
  if (data.video_link) rows.push({ label: 'Video link', value: data.video_link })
  if (data.customer_name) rows.push({ label: 'Customer', value: data.customer_name })

  let bodyHtml = detailsTable(rows)
  if (data.description) {
    bodyHtml += `<div style="margin-top:16px;padding:12px;background:#f8fafc;border-left:3px solid #cbd5e1;font-size:13px;color:#475569;line-height:1.5;">${escapeHtml(data.description)}</div>`
  }

  const html = wrapTemplate(branding, {
    preheader: `Starts ${minutesLabel(data.minutes_before)}`,
    heading: data.title,
    intro: `This ${data.event_type_label.toLowerCase()} starts ${minutesLabel(data.minutes_before)}.`,
    bodyHtml,
    ctaLabel: 'Open schedule',
    ctaUrl: eventUrl,
  })

  const textLines = [
    `${data.title}`,
    `Starts ${minutesLabel(data.minutes_before)}`,
    '',
    `When: ${formatTime(data.start_time)}`,
    data.location ? `Location: ${data.location}` : null,
    data.video_link ? `Video: ${data.video_link}` : null,
    data.customer_name ? `Customer: ${data.customer_name}` : null,
    data.description ? `\n${data.description}` : null,
    '',
    `Open: ${eventUrl}`,
    plainTextFooter(branding),
  ].filter(Boolean) as string[]

  return { subject, html, text: textLines.join('\n') }
}
