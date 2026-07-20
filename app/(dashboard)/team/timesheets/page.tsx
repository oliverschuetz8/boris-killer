import { createClient } from '@/lib/supabase/server'
import { requireAdminOrManager } from '@/lib/auth/require-role'
import {
  getEntriesForWeek,
  formatSydneyDate,
  sydneyWeekBounds,
  isWeekLocked,
  getCompanyWorkers,
  getAllCompanyJobs,
} from '@/lib/services/time-tracking'
import ReconciliationView from './reconciliation-view'

export default async function TeamTimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ worker?: string; week?: string }>
}) {
  const { companyId } = await requireAdminOrManager()
  const supabase = await createClient()

  const params = await searchParams
  const workers = await getCompanyWorkers(supabase, companyId)

  const selectedWorkerId = params?.worker || workers[0]?.id || null
  const today = formatSydneyDate()
  const targetDate = params?.week || today
  const { mondayDate, sundayDate } = sydneyWeekBounds(targetDate)

  let entries: any[] = []
  let weekLocked = false
  if (selectedWorkerId) {
    const [e, l] = await Promise.all([
      getEntriesForWeek(supabase, { userId: selectedWorkerId, weekStartDate: mondayDate }),
      isWeekLocked(supabase, { userId: selectedWorkerId, anyDateInWeek: mondayDate }),
    ])
    entries = e
    weekLocked = l
  }

  const companyJobs = await getAllCompanyJobs(supabase, companyId)

  return (
    <ReconciliationView
      workers={workers}
      selectedWorkerId={selectedWorkerId}
      entries={entries}
      mondayDate={mondayDate}
      sundayDate={sundayDate}
      weekLocked={weekLocked}
      companyJobs={companyJobs}
    />
  )
}
