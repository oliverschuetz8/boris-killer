import { createClient } from '@/lib/supabase/server'

export type CalendarEventType =
  | 'meeting'
  | 'call'
  | 'reminder'
  | 'task'
  | 'material_delivery'
  | 'interview'
  | 'block'
  | 'custom'

export type CalendarEventVisibility = 'private' | 'team' | 'company'

export interface CalendarEvent {
  id: string
  company_id: string
  created_by: string | null
  creator_name: string | null
  event_type: CalendarEventType
  title: string
  description: string | null
  start_time: string
  end_time: string | null
  is_all_day: boolean
  is_completed: boolean
  job_id: string | null
  customer_id: string | null
  lead_id: string | null
  customer_name: string | null
  job_number: string | null
  lead_name: string | null
  location: string | null
  video_link: string | null
  color: string | null
  reminder_minutes_before: number | null
  reminder_sent_at: string | null
  visibility: CalendarEventVisibility
  created_at: string
  updated_at: string
}

export async function getCalendarEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarEvent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      id, company_id, created_by, event_type, title, description,
      start_time, end_time, is_all_day, is_completed,
      job_id, customer_id, lead_id,
      location, video_link, color,
      reminder_minutes_before, reminder_sent_at, visibility,
      created_at, updated_at,
      creator:users!calendar_events_created_by_fkey(full_name),
      job:jobs!calendar_events_job_id_fkey(job_number),
      customer:customers!calendar_events_customer_id_fkey(name),
      lead:leads!calendar_events_lead_id_fkey(name)
    `)
    .lte('start_time', rangeEnd)
    .or(`end_time.gte.${rangeStart},end_time.is.null`)
    .order('start_time', { ascending: true })

  if (error) throw new Error(`Failed to fetch calendar events: ${error.message}`)
  if (!data) return []

  return data.map((row: any) => {
    const creator = Array.isArray(row.creator) ? row.creator[0] : row.creator
    const job = Array.isArray(row.job) ? row.job[0] : row.job
    const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer
    const lead = Array.isArray(row.lead) ? row.lead[0] : row.lead
    return {
      id: row.id,
      company_id: row.company_id,
      created_by: row.created_by,
      creator_name: creator?.full_name ?? null,
      event_type: row.event_type as CalendarEventType,
      title: row.title,
      description: row.description,
      start_time: row.start_time,
      end_time: row.end_time,
      is_all_day: row.is_all_day,
      is_completed: row.is_completed,
      job_id: row.job_id,
      customer_id: row.customer_id,
      lead_id: row.lead_id,
      customer_name: customer?.name ?? null,
      job_number: job?.job_number ?? null,
      lead_name: lead?.name ?? null,
      location: row.location,
      video_link: row.video_link,
      color: row.color,
      reminder_minutes_before: row.reminder_minutes_before,
      reminder_sent_at: row.reminder_sent_at,
      visibility: (row.visibility ?? 'private') as CalendarEventVisibility,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  })
}
