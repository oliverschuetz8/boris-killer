import { createAdminClient } from '@/lib/supabase/admin'

const FEED_LOOKBACK_DAYS = 90
const FEED_LOOKAHEAD_DAYS = 365

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function formatIcsDate(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  const ss = String(d.getUTCSeconds()).padStart(2, '0')
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`
}

function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let i = 0
  while (i < line.length) {
    const size = i === 0 ? 75 : 74
    chunks.push((i === 0 ? '' : ' ') + line.slice(i, i + size))
    i += size
  }
  return chunks.join('\r\n')
}

export async function generateIcalFeed(token: string, appUrl: string): Promise<string | null> {
  const admin = createAdminClient()

  const { data: tokenUser } = await admin
    .from('users')
    .select('id, company_id, role, full_name')
    .eq('calendar_token', token)
    .maybeSingle()

  if (!tokenUser?.company_id) return null

  const now = new Date()
  const lookback = new Date(now)
  lookback.setDate(lookback.getDate() - FEED_LOOKBACK_DAYS)
  const lookahead = new Date(now)
  lookahead.setDate(lookahead.getDate() + FEED_LOOKAHEAD_DAYS)

  let jobsQuery = admin
    .from('jobs')
    .select(`
      id, job_number, title, description, status,
      scheduled_start, scheduled_end,
      site_address_line1, site_city, site_state, site_postcode,
      customer:customers!jobs_customer_id_fkey(name)
    `)
    .eq('company_id', tokenUser.company_id)
    .not('scheduled_start', 'is', null)
    .not('scheduled_end', 'is', null)
    .gte('scheduled_start', lookback.toISOString())
    .lte('scheduled_start', lookahead.toISOString())
    .neq('status', 'cancelled')

  const isAdminLike = tokenUser.role === 'admin' || tokenUser.role === 'manager'
  if (!isAdminLike) {
    const { data: assignments } = await admin
      .from('job_assignments')
      .select('job_id')
      .eq('user_id', tokenUser.id)
    const jobIds = (assignments || []).map(a => a.job_id)
    if (jobIds.length === 0) {
      return buildIcs([], tokenUser.full_name || 'Jobs')
    }
    jobsQuery = jobsQuery.in('id', jobIds)
  }

  const { data: jobs } = await jobsQuery

  const events = (jobs || []).map(j => {
    const customer = Array.isArray(j.customer) ? j.customer[0] : j.customer
    const addressParts = [
      j.site_address_line1,
      [j.site_city, j.site_state, j.site_postcode].filter(Boolean).join(' '),
    ].filter(Boolean) as string[]
    const location = addressParts.join(', ')

    const descriptionParts: string[] = []
    if (customer?.name) descriptionParts.push(`Customer: ${customer.name}`)
    descriptionParts.push(`Status: ${j.status}`)
    if (j.description) descriptionParts.push('', j.description)
    descriptionParts.push('', `${appUrl}/jobs/${j.id}`)

    return {
      uid: `job-${j.id}@boris-killer`,
      summary: `${j.job_number} — ${j.title}`,
      location,
      description: descriptionParts.join('\n'),
      start: j.scheduled_start as string,
      end: j.scheduled_end as string,
      url: `${appUrl}/jobs/${j.id}`,
    }
  })

  return buildIcs(events, tokenUser.full_name || 'Jobs')
}

interface IcsEvent {
  uid: string
  summary: string
  location: string
  description: string
  start: string
  end: string
  url: string
}

function buildIcs(events: IcsEvent[], calendarName: string): string {
  const stamp = formatIcsDate(new Date().toISOString())
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AUTONYX//Boris Killer//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeIcs(calendarName)} — Jobs`),
    'X-PUBLISHED-TTL:PT15M',
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
  ]

  for (const ev of events) {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${ev.uid}`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART:${formatIcsDate(ev.start)}`)
    lines.push(`DTEND:${formatIcsDate(ev.end)}`)
    lines.push(foldLine(`SUMMARY:${escapeIcs(ev.summary)}`))
    if (ev.location) lines.push(foldLine(`LOCATION:${escapeIcs(ev.location)}`))
    lines.push(foldLine(`DESCRIPTION:${escapeIcs(ev.description)}`))
    lines.push(foldLine(`URL:${ev.url}`))
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
