/**
 * Time-tracking service: day shift + per-job timer.
 *
 * Storage: reuses `time_entries` table with `entry_type` ('shift' | 'job') to
 * distinguish the two clocks. DB-level constraints + partial unique indexes
 * guarantee one open shift + one open job timer per worker at a time.
 *
 * Payroll lock: per-row via existing `approved_by` / `approved_at` columns.
 * Week is considered locked if any entry in that week has `approved_at IS NOT NULL`.
 *
 * Audit: every edit writes one row per changed field to `time_entry_edits`
 * (immutable — no update/delete RLS policies).
 *
 * Timezone: Sydney AEST (+10). Week boundaries snap to Mon 00:00 / Sun 23:59
 * Sydney. DST transitions (Oct–Apr) accepted as a small known drift.
 */

export type TimeEntryType = 'shift' | 'job'
export type TimeEntryStatus = 'open' | 'closed'
export type TimeEntrySource = 'worker_clock' | 'admin_manual'

export interface TimeEntry {
  id: string
  company_id: string
  job_id: string | null
  user_id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  entry_type: TimeEntryType
  status: TimeEntryStatus
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  hourly_rate: number | null
  source: TimeEntrySource
  auto_closed: boolean
  created_at: string
}

export interface TimeEntryWithJob extends TimeEntry {
  job?: { id: string; title: string; job_number: string } | null
}

export interface TimeEntryWithUser extends TimeEntryWithJob {
  user?: { id: string; full_name: string; trade: string | null } | null
}

export interface ClockState {
  activeShift: TimeEntry | null
  activeJobEntry: TimeEntryWithJob | null
}

export const SELF_EDIT_WINDOW_HOURS = 48

// ── Active-state queries ─────────────────────────────────────────────────────

export async function getActiveShift(
  supabase: any,
  userId: string,
): Promise<TimeEntry | null> {
  const { data } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('entry_type', 'shift')
    .is('ended_at', null)
    .maybeSingle()
  return data ?? null
}

export async function getActiveJobTimer(
  supabase: any,
  userId: string,
): Promise<TimeEntryWithJob | null> {
  const { data } = await supabase
    .from('time_entries')
    .select('*, job:jobs(id, title, job_number)')
    .eq('user_id', userId)
    .eq('entry_type', 'job')
    .is('ended_at', null)
    .maybeSingle()
  if (!data) return null
  return { ...data, job: Array.isArray(data.job) ? data.job[0] : data.job }
}

export async function getCurrentClockState(
  supabase: any,
  userId: string,
): Promise<ClockState> {
  const [activeShift, activeJobEntry] = await Promise.all([
    getActiveShift(supabase, userId),
    getActiveJobTimer(supabase, userId),
  ])
  return { activeShift, activeJobEntry }
}

// ── Clocking ─────────────────────────────────────────────────────────────────

async function snapshotHourlyRate(supabase: any, userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('users')
    .select('hourly_rate')
    .eq('id', userId)
    .maybeSingle()
  return data?.hourly_rate ?? null
}

export async function startShift(
  supabase: any,
  params: { userId: string; companyId: string; source?: TimeEntrySource },
): Promise<TimeEntry> {
  const existing = await getActiveShift(supabase, params.userId)
  if (existing) {
    throw new Error(
      "You're already clocked in for the day. End your current shift before starting a new one — check the clock bar at the top.",
    )
  }

  const hourly_rate = await snapshotHourlyRate(supabase, params.userId)

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      entry_type: 'shift',
      started_at: new Date().toISOString(),
      status: 'open',
      hourly_rate,
      source: params.source ?? 'worker_clock',
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(
      `Couldn't start your shift: ${error.message}. Refresh the page and try again — if it keeps happening, contact support.`,
    )
  }
  return data
}

export async function endShift(
  supabase: any,
  userId: string,
): Promise<TimeEntry | null> {
  // Auto-stop any open job timer first (chain rule)
  await endJobTimer(supabase, userId).catch(() => {})

  const active = await getActiveShift(supabase, userId)
  if (!active) return null

  const now = new Date()
  const startedMs = new Date(active.started_at).getTime()
  const duration_minutes = Math.max(1, Math.round((now.getTime() - startedMs) / 60000))

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      ended_at: now.toISOString(),
      duration_minutes,
      status: 'closed',
    })
    .eq('id', active.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(
      `Couldn't end your shift: ${error.message}. Refresh the page and try again.`,
    )
  }
  return data
}

export async function startJobTimer(
  supabase: any,
  params: {
    userId: string
    companyId: string
    jobId: string
    source?: TimeEntrySource
  },
): Promise<TimeEntry> {
  // 1. Auto-start the day shift if none active
  const activeShift = await getActiveShift(supabase, params.userId)
  if (!activeShift) {
    await startShift(supabase, {
      userId: params.userId,
      companyId: params.companyId,
      source: params.source ?? 'worker_clock',
    })
  }

  // 2. Close any prior open job timer (one-at-a-time rule)
  await endJobTimer(supabase, params.userId).catch(() => {})

  // 3. Open the new job timer
  const hourly_rate = await snapshotHourlyRate(supabase, params.userId)

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      job_id: params.jobId,
      entry_type: 'job',
      started_at: new Date().toISOString(),
      status: 'open',
      hourly_rate,
      source: params.source ?? 'worker_clock',
    })
    .select('*')
    .single()

  if (error) {
    throw new Error(
      `Couldn't start the job timer: ${error.message}. Refresh the page and try again.`,
    )
  }
  return data
}

export async function endJobTimer(
  supabase: any,
  userId: string,
): Promise<TimeEntry | null> {
  const active = await getActiveJobTimer(supabase, userId)
  if (!active) return null

  const now = new Date()
  const startedMs = new Date(active.started_at).getTime()
  const duration_minutes = Math.max(1, Math.round((now.getTime() - startedMs) / 60000))

  const { data, error } = await supabase
    .from('time_entries')
    .update({
      ended_at: now.toISOString(),
      duration_minutes,
      status: 'closed',
    })
    .eq('id', active.id)
    .select('*')
    .single()

  if (error) {
    throw new Error(
      `Couldn't end the job timer: ${error.message}. Refresh the page and try again.`,
    )
  }
  return data
}

// ── Reconciliation queries ───────────────────────────────────────────────────

export async function getEntriesForDateRange(
  supabase: any,
  params: { userId: string; fromISO: string; toISO: string },
): Promise<TimeEntryWithJob[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, job:jobs(id, title, job_number)')
    .eq('user_id', params.userId)
    .gte('started_at', params.fromISO)
    .lte('started_at', params.toISO)
    .order('started_at', { ascending: true })

  if (error) {
    throw new Error(
      `Couldn't load timesheet entries: ${error.message}. Refresh the page and try again.`,
    )
  }
  return (data || []).map((d: any) => ({
    ...d,
    job: Array.isArray(d.job) ? d.job[0] : d.job,
  }))
}

export async function getEntriesForWeek(
  supabase: any,
  params: { userId: string; weekStartDate: string },
): Promise<TimeEntryWithJob[]> {
  const { startISO, endISO } = sydneyWeekBounds(params.weekStartDate)
  return getEntriesForDateRange(supabase, {
    userId: params.userId,
    fromISO: startISO,
    toISO: endISO,
  })
}

export async function getCompanyWorkers(supabase: any, companyId: string) {
  const { data } = await supabase
    .from('users')
    .select('id, full_name, hourly_rate, role, trade')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('full_name')
  return data || []
}

export async function getAssignedJobs(
  supabase: any,
  userId: string,
): Promise<Array<{ id: string; job_number: string; title: string; status: string }>> {
  const { data } = await supabase
    .from('job_assignments')
    .select('job:jobs(id, job_number, title, status)')
    .eq('user_id', userId)
  return (data || [])
    .map((a: any) => (Array.isArray(a.job) ? a.job[0] : a.job))
    .filter(Boolean)
}

export async function getAllCompanyJobs(
  supabase: any,
  companyId: string,
): Promise<Array<{ id: string; job_number: string; title: string; status: string }>> {
  const { data } = await supabase
    .from('jobs')
    .select('id, job_number, title, status')
    .eq('company_id', companyId)
    .order('job_number', { ascending: false })
  return data || []
}

// ── Edits + audit trail ──────────────────────────────────────────────────────

export type EditableField = 'started_at' | 'ended_at' | 'notes' | 'hourly_rate' | 'job_id'

export async function editEntry(
  supabase: any,
  params: {
    entryId: string
    updates: Partial<Pick<TimeEntry, EditableField>>
    reason: string
    editorId: string
    companyId: string
  },
): Promise<TimeEntry> {
  const { data: current, error: fetchErr } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', params.entryId)
    .single()
  if (fetchErr || !current) {
    throw new Error("Couldn't find this timesheet entry. Refresh the page and try again.")
  }

  // Recompute duration + status if time fields changed
  const newUpdates: any = { ...params.updates }
  const timeChanged =
    params.updates.started_at !== undefined || params.updates.ended_at !== undefined
  if (timeChanged) {
    const newStart = params.updates.started_at ?? current.started_at
    const newEnd =
      params.updates.ended_at !== undefined ? params.updates.ended_at : current.ended_at

    if (newEnd) {
      const startMs = new Date(newStart).getTime()
      const endMs = new Date(newEnd).getTime()
      if (endMs <= startMs) {
        throw new Error(
          'End time must be after start time. Adjust the times and try again.',
        )
      }
      newUpdates.duration_minutes = Math.max(1, Math.round((endMs - startMs) / 60000))
      newUpdates.status = 'closed'
    } else {
      newUpdates.duration_minutes = null
      newUpdates.status = 'open'
    }
  }

  const { data, error } = await supabase
    .from('time_entries')
    .update(newUpdates)
    .eq('id', params.entryId)
    .select('*')
    .single()
  if (error) {
    throw new Error(
      `Couldn't save changes: ${error.message}. Refresh the page and try again.`,
    )
  }

  // Audit each changed field
  const auditRows: any[] = []
  for (const [field, newValue] of Object.entries(params.updates)) {
    const oldValue = (current as any)[field]
    if (oldValue === newValue) continue
    auditRows.push({
      company_id: params.companyId,
      time_entry_id: params.entryId,
      field_name: field,
      old_value: oldValue === null || oldValue === undefined ? null : String(oldValue),
      new_value: newValue === null || newValue === undefined ? null : String(newValue),
      edited_by: params.editorId,
      reason: params.reason || null,
    })
  }
  if (auditRows.length > 0) {
    await supabase.from('time_entry_edits').insert(auditRows)
  }

  return data
}

export async function getAuditTrail(supabase: any, entryId: string) {
  const { data } = await supabase
    .from('time_entry_edits')
    .select('*, editor:users!time_entry_edits_edited_by_fkey(id, full_name)')
    .eq('time_entry_id', entryId)
    .order('edited_at', { ascending: false })
  return (data || []).map((d: any) => ({
    ...d,
    editor: Array.isArray(d.editor) ? d.editor[0] : d.editor,
  }))
}

export async function deleteEntry(
  supabase: any,
  params: { entryId: string },
): Promise<void> {
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', params.entryId)
  if (error) {
    throw new Error(
      `Couldn't delete the entry: ${error.message}. Refresh the page and try again.`,
    )
  }
}

// ── Missed-entry insertion ───────────────────────────────────────────────────

export async function addMissedEntry(
  supabase: any,
  params: {
    userId: string
    companyId: string
    entryType: TimeEntryType
    startedAt: string
    endedAt: string
    jobId?: string | null
    notes?: string | null
    source?: TimeEntrySource
  },
): Promise<TimeEntry> {
  if (params.entryType === 'job' && !params.jobId) {
    throw new Error('A job timer entry needs a job. Pick one and try again.')
  }
  if (params.entryType === 'shift' && params.jobId) {
    throw new Error(
      "A shift entry can't have a job linked. Remove the job and try again.",
    )
  }

  const startMs = new Date(params.startedAt).getTime()
  const endMs = new Date(params.endedAt).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error('Start and end times are required. Check the form and try again.')
  }
  if (endMs <= startMs) {
    throw new Error('End time must be after start time. Adjust the times and try again.')
  }
  const duration_minutes = Math.max(1, Math.round((endMs - startMs) / 60000))

  const hourly_rate = await snapshotHourlyRate(supabase, params.userId)

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      company_id: params.companyId,
      user_id: params.userId,
      job_id: params.jobId ?? null,
      entry_type: params.entryType,
      started_at: params.startedAt,
      ended_at: params.endedAt,
      duration_minutes,
      status: 'closed',
      hourly_rate,
      source: params.source ?? 'admin_manual',
      notes: params.notes ?? null,
    })
    .select('*')
    .single()
  if (error) {
    throw new Error(
      `Couldn't add the entry: ${error.message}. Refresh the page and try again.`,
    )
  }
  return data
}

// ── Week locks (per-row approved_at stamp) ───────────────────────────────────

export async function isWeekLocked(
  supabase: any,
  params: { userId: string; anyDateInWeek: string },
): Promise<boolean> {
  const { startISO, endISO } = sydneyWeekBounds(params.anyDateInWeek)
  const { count } = await supabase
    .from('time_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', params.userId)
    .gte('started_at', startISO)
    .lte('started_at', endISO)
    .not('approved_at', 'is', null)
  return (count || 0) > 0
}

export async function lockWeek(
  supabase: any,
  params: { userId: string; weekStartDate: string; lockedBy: string },
): Promise<{ locked: number }> {
  const { startISO, endISO } = sydneyWeekBounds(params.weekStartDate)
  const { data, error } = await supabase
    .from('time_entries')
    .update({
      approved_by: params.lockedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('user_id', params.userId)
    .gte('started_at', startISO)
    .lte('started_at', endISO)
    .is('approved_at', null)
    .select('id')
  if (error) {
    throw new Error(
      `Couldn't lock the week: ${error.message}. Refresh the page and try again.`,
    )
  }
  return { locked: (data || []).length }
}

export async function unlockWeek(
  supabase: any,
  params: { userId: string; weekStartDate: string },
): Promise<void> {
  const { startISO, endISO } = sydneyWeekBounds(params.weekStartDate)
  const { error } = await supabase
    .from('time_entries')
    .update({ approved_by: null, approved_at: null })
    .eq('user_id', params.userId)
    .gte('started_at', startISO)
    .lte('started_at', endISO)
  if (error) {
    throw new Error(
      `Couldn't unlock the week: ${error.message}. Refresh the page and try again.`,
    )
  }
}

// ── Self-edit permission gate ────────────────────────────────────────────────

export async function canWorkerEditEntry(
  supabase: any,
  params: { userId: string; entryId: string },
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role, companies(worker_self_edit_enabled)')
    .eq('id', params.userId)
    .single()
  if (!profile) {
    return { allowed: false, reason: "We couldn't verify your account. Sign out and back in." }
  }

  if (profile.role === 'admin' || profile.role === 'manager') {
    return { allowed: true }
  }

  const company = Array.isArray(profile.companies) ? profile.companies[0] : profile.companies
  if (company?.worker_self_edit_enabled === false) {
    return {
      allowed: false,
      reason:
        'Self-editing time entries is disabled for your company. Ask your admin to fix this entry for you.',
    }
  }

  const { data: entry } = await supabase
    .from('time_entries')
    .select('user_id, started_at, approved_at')
    .eq('id', params.entryId)
    .single()
  if (!entry) {
    return { allowed: false, reason: "Couldn't find this entry. Refresh the page and try again." }
  }
  if (entry.user_id !== params.userId) {
    return { allowed: false, reason: 'You can only edit your own time entries.' }
  }
  if (entry.approved_at) {
    return {
      allowed: false,
      reason: 'This week is locked for payroll. Ask your admin to unlock it first.',
    }
  }

  const startedMs = new Date(entry.started_at).getTime()
  const windowStartMs = Date.now() - SELF_EDIT_WINDOW_HOURS * 60 * 60 * 1000
  if (startedMs < windowStartMs) {
    return {
      allowed: false,
      reason: `You can only edit entries from the last ${SELF_EDIT_WINDOW_HOURS} hours. Ask your admin to fix older entries.`,
    }
  }

  return { allowed: true }
}

// ── Cron: auto-close runaway clocks ──────────────────────────────────────────

export async function autoCloseRunawayClocks(
  supabase: any,
): Promise<{ closed: number }> {
  // Close any entry open longer than 16 hours. Cron runs ~23:59 Sydney so a
  // shift that opened that morning will exceed the threshold.
  const cutoffMs = Date.now() - 16 * 60 * 60 * 1000
  const cutoffIso = new Date(cutoffMs).toISOString()

  const { data: open } = await supabase
    .from('time_entries')
    .select('id, started_at')
    .is('ended_at', null)
    .lt('started_at', cutoffIso)

  let closed = 0
  for (const row of open || []) {
    const startMs = new Date(row.started_at).getTime()
    const nowMs = Date.now()
    const duration_minutes = Math.max(1, Math.round((nowMs - startMs) / 60000))
    const { error } = await supabase
      .from('time_entries')
      .update({
        ended_at: new Date().toISOString(),
        duration_minutes,
        status: 'closed',
        auto_closed: true,
      })
      .eq('id', row.id)
    if (!error) closed++
  }
  return { closed }
}

// ── Source-aware labour cost for a job (used by Job Cost Summary) ────────────

export interface JobLabourLine {
  id: string
  user_id: string | null
  full_name: string
  trade: string | null
  date: string
  hours: number
  hourly_rate: number
  cost: number
}

export async function getJobLabourInApp(
  supabase: any,
  jobId: string,
): Promise<JobLabourLine[]> {
  const { data } = await supabase
    .from('time_entries')
    .select(`
      id, user_id, started_at, duration_minutes, hourly_rate,
      user:users(id, full_name, trade)
    `)
    .eq('job_id', jobId)
    .eq('entry_type', 'job')
    .eq('status', 'closed')
    .order('started_at')

  return (data || []).map((e: any) => {
    const user = Array.isArray(e.user) ? e.user[0] : e.user
    const hours = (e.duration_minutes || 0) / 60
    const rate = Number(e.hourly_rate || 0)
    return {
      id: e.id,
      user_id: e.user_id,
      full_name: user?.full_name || 'Unknown',
      trade: user?.trade || null,
      date: (e.started_at || '').slice(0, 10),
      hours,
      hourly_rate: rate,
      cost: hours * rate,
    }
  })
}

export async function getJobLabourXero(
  supabase: any,
  jobId: string,
): Promise<JobLabourLine[]> {
  const { data } = await supabase
    .from('job_time_entries')
    .select(`
      id, user_id, employee_name, date, hours, hourly_rate, cost,
      user:users(id, full_name, trade)
    `)
    .eq('job_id', jobId)
    .eq('status', 'assigned')
    .order('date')

  return (data || []).map((e: any) => {
    const user = Array.isArray(e.user) ? e.user[0] : e.user
    const hrs = Number(e.hours || 0)
    const rate = Number(e.hourly_rate || 0)
    return {
      id: e.id,
      user_id: e.user_id,
      full_name: user?.full_name || e.employee_name || 'Unknown',
      trade: user?.trade || null,
      date: e.date,
      hours: hrs,
      hourly_rate: rate,
      cost: e.cost != null ? Number(e.cost) : hrs * rate,
    }
  })
}

export async function getJobLabour(
  supabase: any,
  jobId: string,
): Promise<JobLabourLine[]> {
  // Look up the company's job_attribution_source via the job → company chain
  const { data: job } = await supabase
    .from('jobs')
    .select('company_id, companies(job_attribution_source)')
    .eq('id', jobId)
    .single()
  const company = Array.isArray(job?.companies) ? job?.companies[0] : job?.companies
  const source: 'in_app' | 'xero' = company?.job_attribution_source ?? 'in_app'

  return source === 'xero'
    ? getJobLabourXero(supabase, jobId)
    : getJobLabourInApp(supabase, jobId)
}

// ── Timezone helpers (Sydney AEST +10) ───────────────────────────────────────

const SYDNEY_TZ = 'Australia/Sydney'
const SYDNEY_OFFSET = '+10:00' // AEST; DST drift accepted

export function formatSydneyDate(d: Date = new Date()): string {
  // Returns YYYY-MM-DD for the calendar day in Sydney
  return new Intl.DateTimeFormat('en-CA', { timeZone: SYDNEY_TZ }).format(d)
}

export function sydneyWeekBounds(anyDateStr: string): {
  startISO: string
  endISO: string
  mondayDate: string
  sundayDate: string
} {
  const [y, m, d] = anyDateStr.split('-').map(Number)
  const dayUTC = new Date(Date.UTC(y, m - 1, d))
  const dow = dayUTC.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const daysToMon = (dow + 6) % 7
  const monday = new Date(dayUTC)
  monday.setUTCDate(monday.getUTCDate() - daysToMon)
  const sunday = new Date(monday)
  sunday.setUTCDate(sunday.getUTCDate() + 6)
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
  const mondayDate = fmt(monday)
  const sundayDate = fmt(sunday)
  return {
    startISO: `${mondayDate}T00:00:00${SYDNEY_OFFSET}`,
    endISO: `${sundayDate}T23:59:59.999${SYDNEY_OFFSET}`,
    mondayDate,
    sundayDate,
  }
}

export function shiftWeek(weekStartDate: string, deltaWeeks: number): string {
  const [y, m, d] = weekStartDate.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaWeeks * 7))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function formatSydneyTime(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SYDNEY_TZ,
  })
}

export function formatDurationFromMinutes(minutes: number | null | undefined): string {
  const m = minutes ?? 0
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem}m`
  if (rem === 0) return `${h}h`
  return `${h}h ${rem}m`
}

export function formatDurationLive(startedAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000))
  return formatDurationFromMinutes(minutes)
}
