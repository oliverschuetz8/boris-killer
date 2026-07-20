'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import * as ts from '@/lib/services/time-tracking'
import type { TimeEntryType, EditableField, TimeEntry } from '@/lib/services/time-tracking'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Your session has expired. Refresh the page and sign in again.')

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, company_id, full_name')
    .eq('id', user.id)
    .single()
  if (!profile?.company_id) {
    throw new Error(
      "We couldn't find your profile. Sign out and back in — if it keeps happening, contact support.",
    )
  }
  return { supabase, user, profile }
}

// ── Active state ─────────────────────────────────────────────────────────────

export async function getClockStateAction() {
  const { supabase, user } = await getAuthContext()
  return ts.getCurrentClockState(supabase, user.id)
}

// ── Day shift ────────────────────────────────────────────────────────────────

export async function startShiftAction() {
  const { supabase, user, profile } = await getAuthContext()
  const entry = await ts.startShift(supabase, {
    userId: user.id,
    companyId: profile.company_id,
  })
  revalidatePath('/today')
  return entry
}

export async function endShiftAction() {
  const { supabase, user } = await getAuthContext()
  const entry = await ts.endShift(supabase, user.id)
  revalidatePath('/today')
  return entry
}

// ── Job timer ────────────────────────────────────────────────────────────────

export async function startJobTimerAction(jobId: string) {
  if (!jobId) throw new Error('Pick a job before starting the timer.')
  const { supabase, user, profile } = await getAuthContext()

  const entry = await ts.startJobTimer(supabase, {
    userId: user.id,
    companyId: profile.company_id,
    jobId,
  })

  // Promote job status to in_progress on first start
  const { data: job } = await supabase
    .from('jobs')
    .select('status, actual_start')
    .eq('id', jobId)
    .single()
  if (job && (job.status === 'scheduled' || job.status === 'draft')) {
    await supabase
      .from('jobs')
      .update({
        status: 'in_progress',
        actual_start: job.actual_start ?? new Date().toISOString(),
      })
      .eq('id', jobId)
  }

  revalidatePath('/today')
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/jobs/${jobId}/execute`)
  return entry
}

export async function endJobTimerAction() {
  const { supabase, user } = await getAuthContext()
  const entry = await ts.endJobTimer(supabase, user.id)
  revalidatePath('/today')
  if (entry?.job_id) {
    revalidatePath(`/jobs/${entry.job_id}`)
    revalidatePath(`/jobs/${entry.job_id}/execute`)
  }
  return entry
}

// ── Edits ────────────────────────────────────────────────────────────────────

export async function editEntryAction(params: {
  entryId: string
  updates: Partial<Pick<TimeEntry, EditableField>>
  reason: string
}) {
  const { supabase, user, profile } = await getAuthContext()

  if (profile.role === 'worker') {
    const check = await ts.canWorkerEditEntry(supabase, {
      userId: user.id,
      entryId: params.entryId,
    })
    if (!check.allowed) {
      throw new Error(check.reason || "You can't edit this entry right now.")
    }
    if (!params.reason || params.reason.trim().length < 3) {
      throw new Error(
        "Tell us briefly why you're editing this entry (3+ characters) — it helps your admin verify the change.",
      )
    }
  }

  const result = await ts.editEntry(supabase, {
    entryId: params.entryId,
    updates: params.updates,
    reason: params.reason || '',
    editorId: user.id,
    companyId: profile.company_id,
  })

  revalidatePath('/today/timesheet')
  revalidatePath('/team/timesheets')
  return result
}

export async function deleteEntryAction(entryId: string) {
  const { supabase, profile } = await getAuthContext()
  if (profile.role === 'worker') {
    throw new Error(
      "Tradies can't delete time entries — only edit them. Ask your admin to remove this entry if it's wrong.",
    )
  }
  await ts.deleteEntry(supabase, { entryId })
  revalidatePath('/today/timesheet')
  revalidatePath('/team/timesheets')
}

// ── Missed entries ───────────────────────────────────────────────────────────

export async function addMissedEntryAction(params: {
  userId?: string
  entryType: TimeEntryType
  startedAt: string
  endedAt: string
  jobId?: string | null
  notes?: string | null
  reason?: string
}) {
  const { supabase, user, profile } = await getAuthContext()

  // Determine target user
  let targetUserId = user.id
  if (params.userId && params.userId !== user.id) {
    if (profile.role !== 'admin' && profile.role !== 'manager') {
      throw new Error(
        "Tradies can only add entries for themselves. Ask your admin to add missed entries for other tradies.",
      )
    }
    const { data: targetUser } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', params.userId)
      .single()
    if (!targetUser || targetUser.company_id !== profile.company_id) {
      throw new Error(
        "That tradie isn't in your company. Refresh the page and pick someone else.",
      )
    }
    targetUserId = params.userId
  }

  // Worker constraints: 48h window + week not locked + reason required
  if (profile.role === 'worker') {
    if (!params.reason || params.reason.trim().length < 3) {
      throw new Error(
        "Tell us briefly why you're adding this missed entry (3+ characters) — it helps your admin verify it.",
      )
    }
    const startMs = new Date(params.startedAt).getTime()
    const windowStart = Date.now() - ts.SELF_EDIT_WINDOW_HOURS * 60 * 60 * 1000
    if (startMs < windowStart) {
      throw new Error(
        `You can only add entries from the last ${ts.SELF_EDIT_WINDOW_HOURS} hours. Ask your admin to add older entries.`,
      )
    }
    const startDate = new Date(params.startedAt).toISOString().slice(0, 10)
    const locked = await ts.isWeekLocked(supabase, {
      userId: targetUserId,
      anyDateInWeek: startDate,
    })
    if (locked) {
      throw new Error('This week is locked for payroll. Ask your admin to unlock it first.')
    }
  }

  const entry = await ts.addMissedEntry(supabase, {
    userId: targetUserId,
    companyId: profile.company_id,
    entryType: params.entryType,
    startedAt: params.startedAt,
    endedAt: params.endedAt,
    jobId: params.jobId ?? null,
    notes: params.notes ?? null,
    source: profile.role === 'worker' ? 'worker_clock' : 'admin_manual',
  })

  // If worker added with reason, write a single audit row
  if (profile.role === 'worker' && params.reason) {
    await supabase.from('time_entry_edits').insert({
      company_id: profile.company_id,
      time_entry_id: entry.id,
      field_name: 'created',
      old_value: null,
      new_value: 'missed-entry-add',
      edited_by: user.id,
      reason: params.reason,
    })
  }

  revalidatePath('/today/timesheet')
  revalidatePath('/team/timesheets')
  return entry
}

// ── Payroll week lock ────────────────────────────────────────────────────────

export async function lockWeekAction(userId: string, weekStartDate: string) {
  const { supabase, user, profile } = await getAuthContext()
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Only admins or managers can lock weeks for payroll.')
  }
  const result = await ts.lockWeek(supabase, {
    userId,
    weekStartDate,
    lockedBy: user.id,
  })
  revalidatePath('/team/timesheets')
  return result
}

export async function unlockWeekAction(userId: string, weekStartDate: string) {
  const { supabase, profile } = await getAuthContext()
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    throw new Error('Only admins or managers can unlock payroll weeks.')
  }
  await ts.unlockWeek(supabase, { userId, weekStartDate })
  revalidatePath('/team/timesheets')
}

// ── Reads (used by client components) ────────────────────────────────────────

export async function getOwnTimesheetAction(weekStartDate: string) {
  const { supabase, user } = await getAuthContext()
  return ts.getEntriesForWeek(supabase, { userId: user.id, weekStartDate })
}

export async function getWorkerTimesheetAction(userId: string, weekStartDate: string) {
  const { supabase, user, profile } = await getAuthContext()
  if (userId !== user.id && profile.role === 'worker') {
    throw new Error('You can only see your own timesheet.')
  }
  return ts.getEntriesForWeek(supabase, { userId, weekStartDate })
}

export async function getAuditTrailAction(entryId: string) {
  const { supabase } = await getAuthContext()
  return ts.getAuditTrail(supabase, entryId)
}

// ── Settings ─────────────────────────────────────────────────────────────────

export async function setTimeTrackingSettingsAction(settings: {
  day_hours_source?: 'in_app' | 'xero' | 'none'
  job_attribution_source?: 'in_app' | 'xero'
  worker_self_edit_enabled?: boolean
}) {
  const { supabase, profile } = await getAuthContext()
  if (profile.role !== 'admin') {
    throw new Error('Only admins can change time-tracking settings.')
  }
  const { error } = await supabase
    .from('companies')
    .update(settings)
    .eq('id', profile.company_id)
  if (error) {
    throw new Error(
      `Couldn't save settings: ${error.message}. Try again or refresh the page.`,
    )
  }
  revalidatePath('/settings/time-tracking')
  revalidatePath('/settings')
}
