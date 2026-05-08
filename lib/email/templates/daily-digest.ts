import type { EmailBranding, RenderedEmail } from '../types'
import { wrapTemplate, escapeHtml, plainTextFooter } from './base'

export interface DigestItem {
  type: 'job' | 'event'
  event_type?: string
  title: string
  start_time: string
  end_time?: string | null
  is_all_day?: boolean
  subtitle?: string | null
  status?: string | null
  url: string
}

export interface DailyDigestData {
  recipient_name: string
  date_label: string  // "Wednesday, 8 May"
  today_items: DigestItem[]
  tomorrow_count: number
  next_seven_days_count: number
  app_url: string
}

function formatTime(value: string, isAllDay?: boolean): string {
  if (isAllDay) return 'All day'
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function itemRow(item: DigestItem): string {
  const time = formatTime(item.start_time, item.is_all_day)
  const typeLabel = item.type === 'job' ? 'Job' : (item.event_type ?? 'Event')
  const subtitle = item.subtitle ? ` · ${escapeHtml(item.subtitle)}` : ''
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-family:Helvetica,Arial,sans-serif;">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(time)} · ${escapeHtml(typeLabel)}</div>
        <div style="font-size:14px;color:#0f172a;font-weight:600;margin-top:2px;">
          <a href="${escapeHtml(item.url)}" style="color:#0f172a;text-decoration:none;">${escapeHtml(item.title)}</a>
        </div>
        ${item.subtitle ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">${escapeHtml(item.subtitle)}</div>` : ''}
      </td>
    </tr>
  `
}

export function renderDailyDigestEmail(data: DailyDigestData, branding: EmailBranding): RenderedEmail {
  const subject = `Your day — ${data.date_label}`

  const itemsHtml = data.today_items.length === 0
    ? `<p style="font-size:14px;color:#64748b;font-style:italic;margin:16px 0;">Nothing scheduled today.</p>`
    : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-top:16px;">
         ${data.today_items.map(itemRow).join('')}
       </table>`

  const summaryHtml = `
    <div style="margin-top:24px;padding:12px 16px;background:#f8fafc;border-radius:6px;">
      <div style="font-size:12px;color:#64748b;">
        Tomorrow: <strong style="color:#0f172a;">${data.tomorrow_count === 0 ? 'Nothing scheduled' : data.tomorrow_count + ' item' + (data.tomorrow_count === 1 ? '' : 's')}</strong>
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">
        Next 7 days: <strong style="color:#0f172a;">${data.next_seven_days_count} item${data.next_seven_days_count === 1 ? '' : 's'}</strong>
      </div>
    </div>
  `

  const html = wrapTemplate(branding, {
    preheader: `${data.today_items.length} item${data.today_items.length === 1 ? '' : 's'} on your schedule today`,
    heading: `Good morning, ${escapeHtml(data.recipient_name.split(' ')[0] || data.recipient_name)}`,
    intro: `Here's your day — ${escapeHtml(data.date_label)}.`,
    bodyHtml: itemsHtml + summaryHtml,
    ctaLabel: 'Open schedule',
    ctaUrl: `${data.app_url}/schedule`,
  })

  const textLines: string[] = [
    `Your day — ${data.date_label}`,
    '',
  ]
  if (data.today_items.length === 0) {
    textLines.push('Nothing scheduled today.')
  } else {
    for (const item of data.today_items) {
      textLines.push(`• ${formatTime(item.start_time, item.is_all_day)} — ${item.title}${item.subtitle ? ` (${item.subtitle})` : ''}`)
    }
  }
  textLines.push('')
  textLines.push(`Tomorrow: ${data.tomorrow_count} items`)
  textLines.push(`Next 7 days: ${data.next_seven_days_count} items`)
  textLines.push('')
  textLines.push(`Open: ${data.app_url}/schedule`)
  textLines.push(plainTextFooter(branding))

  return { subject, html, text: textLines.join('\n') }
}
