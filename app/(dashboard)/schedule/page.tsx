import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getScheduledJobs, getActiveWorkers, getCalendarCustomers } from '@/lib/services/schedule'
import { getCalendarEvents } from '@/lib/services/calendar-events'
import { ScheduleView } from './schedule-view'

const LOOKBACK_DAYS = 90
const LOOKAHEAD_DAYS = 365

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) {
    redirect('/today')
  }

  const now = new Date()
  const rangeStart = new Date(now)
  rangeStart.setDate(rangeStart.getDate() - LOOKBACK_DAYS)
  const rangeEnd = new Date(now)
  rangeEnd.setDate(rangeEnd.getDate() + LOOKAHEAD_DAYS)

  const [jobs, calendarEvents, workers, customers] = await Promise.all([
    getScheduledJobs(rangeStart.toISOString(), rangeEnd.toISOString()),
    getCalendarEvents(rangeStart.toISOString(), rangeEnd.toISOString()),
    getActiveWorkers(),
    getCalendarCustomers(),
  ])

  return (
    <div className="w-full px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Schedule</h1>
      </div>
      <ScheduleView
        initialJobs={jobs}
        initialCalendarEvents={calendarEvents}
        workers={workers}
        customers={customers}
        currentUserRole={profile.role}
      />
    </div>
  )
}
