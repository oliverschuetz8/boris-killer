'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventVisibility,
} from '@/lib/services/calendar-events'

async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Your session has expired. Refresh the page and sign in again.")

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) throw new Error("We couldn't find your company. Refresh the page or contact support if this keeps happening.")

  return { supabase, userId: user.id, ...profile }
}

const SELECT_FRAGMENT = `
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
`

function rowToEvent(row: any): CalendarEvent {
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
}

export interface CalendarEventInput {
  event_type: CalendarEventType
  title: string
  description?: string | null
  start_time: string
  end_time?: string | null
  is_all_day?: boolean
  job_id?: string | null
  customer_id?: string | null
  lead_id?: string | null
  location?: string | null
  video_link?: string | null
  reminder_minutes_before?: number | null
  visibility?: CalendarEventVisibility
}

export async function createCalendarEvent(input: CalendarEventInput): Promise<CalendarEvent> {
  const { supabase, userId, company_id } = await getProfile()

  if (!input.title?.trim()) throw new Error('Give this event a title before saving.')
  if (!input.start_time) throw new Error('Pick a start time for this event before saving.')

  const { data, error } = await supabase
    .from('calendar_events')
    .insert({
      company_id,
      created_by: userId,
      event_type: input.event_type,
      title: input.title.trim(),
      description: input.description ?? null,
      start_time: input.start_time,
      end_time: input.end_time ?? null,
      is_all_day: input.is_all_day ?? false,
      job_id: input.job_id ?? null,
      customer_id: input.customer_id ?? null,
      lead_id: input.lead_id ?? null,
      location: input.location ?? null,
      video_link: input.video_link ?? null,
      reminder_minutes_before: input.reminder_minutes_before ?? null,
      visibility: input.visibility ?? 'private',
    })
    .select(SELECT_FRAGMENT)
    .single()

  if (error || !data) {
    console.error('Create calendar event error:', error)
    throw new Error("We couldn't create that event. Check the title, date and time, then try again.")
  }

  revalidatePath('/schedule')
  return rowToEvent(data)
}

export async function updateCalendarEvent(
  id: string,
  updates: Partial<CalendarEventInput>,
): Promise<CalendarEvent> {
  const { supabase } = await getProfile()

  const patch: Record<string, any> = {}
  if (updates.event_type !== undefined) patch.event_type = updates.event_type
  if (updates.title !== undefined) patch.title = updates.title.trim()
  if (updates.description !== undefined) patch.description = updates.description
  if (updates.start_time !== undefined) patch.start_time = updates.start_time
  if (updates.end_time !== undefined) patch.end_time = updates.end_time
  if (updates.is_all_day !== undefined) patch.is_all_day = updates.is_all_day
  if (updates.job_id !== undefined) patch.job_id = updates.job_id
  if (updates.customer_id !== undefined) patch.customer_id = updates.customer_id
  if (updates.lead_id !== undefined) patch.lead_id = updates.lead_id
  if (updates.location !== undefined) patch.location = updates.location
  if (updates.video_link !== undefined) patch.video_link = updates.video_link
  if (updates.reminder_minutes_before !== undefined) {
    patch.reminder_minutes_before = updates.reminder_minutes_before
    patch.reminder_sent_at = null
  }
  if (updates.visibility !== undefined) patch.visibility = updates.visibility

  const { data, error } = await supabase
    .from('calendar_events')
    .update(patch)
    .eq('id', id)
    .select(SELECT_FRAGMENT)
    .single()

  if (error || !data) {
    console.error('Update calendar event error:', error)
    throw new Error("We couldn't save changes to that event. Try again or refresh the page.")
  }

  revalidatePath('/schedule')
  return rowToEvent(data)
}

export async function rescheduleCalendarEvent(
  id: string,
  start: string,
  end: string | null,
): Promise<void> {
  const { supabase } = await getProfile()

  const startDate = new Date(start)
  if (isNaN(startDate.getTime())) throw new Error("The start time doesn't look right — pick a valid date and time.")
  let endIso: string | null = null
  if (end) {
    const endDate = new Date(end)
    if (isNaN(endDate.getTime())) throw new Error("The end time doesn't look right — pick a valid date and time.")
    if (endDate <= startDate) throw new Error('The event has to end after it starts. Pick a later end time.')
    endIso = endDate.toISOString()
  }

  const { error } = await supabase
    .from('calendar_events')
    .update({
      start_time: startDate.toISOString(),
      end_time: endIso,
      reminder_sent_at: null,
    })
    .eq('id', id)

  if (error) {
    console.error('Reschedule calendar event error:', error)
    throw new Error("We couldn't reschedule that event. Try again or refresh the page.")
  }
  revalidatePath('/schedule')
}

export async function toggleCalendarEventComplete(id: string, isCompleted: boolean): Promise<void> {
  const { supabase } = await getProfile()
  const { error } = await supabase
    .from('calendar_events')
    .update({ is_completed: isCompleted })
    .eq('id', id)
  if (error) {
    console.error('Toggle calendar event error:', error)
    throw new Error("We couldn't update that event. Try again or refresh the page.")
  }
  revalidatePath('/schedule')
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { supabase } = await getProfile()
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) {
    console.error('Delete calendar event error:', error)
    throw new Error("We couldn't delete that event. Try again or refresh the page.")
  }
  revalidatePath('/schedule')
}
