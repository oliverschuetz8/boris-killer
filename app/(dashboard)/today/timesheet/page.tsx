import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  getEntriesForWeek,
  formatSydneyDate,
  sydneyWeekBounds,
  isWeekLocked,
  getAssignedJobs,
} from '@/lib/services/time-tracking'
import TimesheetView from './timesheet-view'

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, role, company_id, companies(worker_self_edit_enabled)')
    .eq('id', user.id)
    .single()
  if (!profile) redirect('/login')

  const params = await searchParams
  const today = formatSydneyDate()
  const targetDate = params?.week || today
  const { mondayDate, sundayDate } = sydneyWeekBounds(targetDate)

  const [entries, assignedJobs, locked] = await Promise.all([
    getEntriesForWeek(supabase, { userId: user.id, weekStartDate: mondayDate }),
    getAssignedJobs(supabase, user.id),
    isWeekLocked(supabase, { userId: user.id, anyDateInWeek: mondayDate }),
  ])

  const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies

  return (
    <TimesheetView
      entries={entries}
      mondayDate={mondayDate}
      sundayDate={sundayDate}
      assignedJobs={assignedJobs}
      currentUserName={profile.full_name}
      role={profile.role}
      weekLocked={locked}
      selfEditEnabled={(company as any)?.worker_self_edit_enabled ?? true}
    />
  )
}
