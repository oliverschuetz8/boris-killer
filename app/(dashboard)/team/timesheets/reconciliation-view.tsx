'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  Briefcase,
  Edit2,
  Plus,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  History,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import {
  editEntryAction,
  addMissedEntryAction,
  deleteEntryAction,
  lockWeekAction,
  unlockWeekAction,
  getAuditTrailAction,
} from '@/app/actions/time-tracking'
import { formatDurationFromMinutes } from '@/lib/services/time-tracking'

type EntryType = 'shift' | 'job'

interface Entry {
  id: string
  user_id: string
  entry_type: EntryType
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  status: 'open' | 'closed'
  auto_closed: boolean
  approved_at: string | null
  notes: string | null
  job_id: string | null
  source: 'worker_clock' | 'admin_manual'
  hourly_rate: number | null
  job?: { id: string; job_number: string; title: string } | null
}

interface Worker {
  id: string
  full_name: string
  hourly_rate: number | null
  role: string
  trade: string | null
}

interface CompanyJob {
  id: string
  job_number: string
  title: string
  status: string
}

interface AuditRow {
  id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  edited_at: string
  reason: string | null
  editor?: { id: string; full_name: string } | null
}

const SYDNEY_TZ = 'Australia/Sydney'

function fmtTimeSydney(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SYDNEY_TZ,
  })
}

function fmtDateSydney(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: SYDNEY_TZ,
  })
}

function dayKeySydney(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SYDNEY_TZ }).format(new Date(iso))
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const dt = new Date(iso)
  const tzOffset = dt.getTimezoneOffset() * 60000
  const local = new Date(dt.getTime() - tzOffset)
  return local.toISOString().slice(0, 16)
}

function localInputToISO(value: string): string {
  return new Date(value).toISOString()
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function formatRangeLabel(monday: string, sunday: string) {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    })
  }
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export default function ReconciliationView({
  workers,
  selectedWorkerId,
  entries,
  mondayDate,
  sundayDate,
  weekLocked,
  companyJobs,
}: {
  workers: Worker[]
  selectedWorkerId: string | null
  entries: Entry[]
  mondayDate: string
  sundayDate: string
  weekLocked: boolean
  companyJobs: CompanyJob[]
}) {
  const router = useRouter()
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [historyForId, setHistoryForId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedWorker = workers.find(w => w.id === selectedWorkerId)

  // Group by Sydney calendar day
  const grouped: Record<string, Entry[]> = {}
  for (const e of entries) {
    const k = dayKeySydney(e.started_at)
    if (!grouped[k]) grouped[k] = []
    grouped[k].push(e)
  }
  const dayKeys = Object.keys(grouped).sort()

  const totalShiftMin = entries
    .filter(e => e.entry_type === 'shift')
    .reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const totalJobMin = entries
    .filter(e => e.entry_type === 'job')
    .reduce((s, e) => s + (e.duration_minutes || 0), 0)
  const gapMin = Math.max(0, totalShiftMin - totalJobMin)
  const totalLabourCost = entries
    .filter(e => e.entry_type === 'job' && e.hourly_rate)
    .reduce((s, e) => s + ((e.duration_minutes || 0) / 60) * (e.hourly_rate || 0), 0)

  const goToWeek = (newWeek: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('week', newWeek)
    if (selectedWorkerId) url.searchParams.set('worker', selectedWorkerId)
    router.push(url.pathname + url.search)
  }

  const handleWorkerChange = (workerId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('worker', workerId)
    url.searchParams.set('week', mondayDate)
    router.push(url.pathname + url.search)
  }

  const handleLockToggle = () => {
    if (!selectedWorkerId) return
    const action = weekLocked ? 'unlock' : 'lock'
    if (
      !confirm(
        weekLocked
          ? 'Unlock this week? Tradies will be able to edit entries again.'
          : 'Lock this week for payroll? Tradies will no longer be able to edit entries from this week.',
      )
    ) {
      return
    }
    startTransition(async () => {
      try {
        if (weekLocked) {
          await unlockWeekAction(selectedWorkerId, mondayDate)
        } else {
          await lockWeekAction(selectedWorkerId, mondayDate)
        }
        router.refresh()
      } catch (e) {
        alert(
          e instanceof Error
            ? e.message
            : `Couldn't ${action} the week. Refresh and try again.`,
        )
      }
    })
  }

  const handleDelete = (entryId: string) => {
    startTransition(async () => {
      try {
        await deleteEntryAction(entryId)
        setConfirmDeleteId(null)
        router.refresh()
      } catch (e) {
        alert(
          e instanceof Error ? e.message : "Couldn't delete the entry. Refresh and try again.",
        )
      }
    })
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/team"
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">Timesheets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and adjust tradies' time entries. Lock weeks once approved for payroll.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Worker list */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden self-start">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Tradies
            </p>
          </div>
          <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {workers.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-400 text-center">
                No tradies in your company yet.
              </div>
            )}
            {workers.map(w => (
              <button
                key={w.id}
                onClick={() => handleWorkerChange(w.id)}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                  w.id === selectedWorkerId ? 'bg-blue-50' : ''
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    w.id === selectedWorkerId ? 'text-blue-800' : 'text-slate-800'
                  }`}
                >
                  {w.full_name}
                </p>
                <p className="text-xs text-slate-500">
                  {w.trade ? `${w.trade} · ` : ''}
                  {w.hourly_rate ? `A$${w.hourly_rate}/hr` : 'No rate set'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Week view */}
        <div className="space-y-4">
          {!selectedWorker ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-sm text-slate-500">Pick a tradie on the left to view their week.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => goToWeek(shiftDate(mondayDate, -7))}
                  className="p-1.5 rounded-md hover:bg-slate-50 text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500">Week of</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {formatRangeLabel(mondayDate, sundayDate)}
                  </p>
                </div>
                <button
                  onClick={() => goToWeek(shiftDate(mondayDate, 7))}
                  className="p-1.5 rounded-md hover:bg-slate-50 text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Summary + Actions */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {selectedWorker.full_name}
                    </p>
                    <div className="flex items-baseline gap-4 mt-1 flex-wrap">
                      <div>
                        <p className="text-xs text-slate-500">Day total</p>
                        <p className="text-lg font-bold text-slate-800">
                          {formatDurationFromMinutes(totalShiftMin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">On jobs</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatDurationFromMinutes(totalJobMin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Unallocated</p>
                        <p
                          className={`text-lg font-bold ${gapMin > 0 ? 'text-amber-600' : 'text-slate-400'}`}
                        >
                          {formatDurationFromMinutes(gapMin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Labour cost</p>
                        <p className="text-lg font-bold text-green-700">
                          A${totalLabourCost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAdd(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-md transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add entry
                    </button>
                    <button
                      onClick={handleLockToggle}
                      disabled={pending || entries.length === 0}
                      className={`flex items-center gap-1 px-3 py-1.5 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 ${
                        weekLocked
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {weekLocked ? (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          Unlock week
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          Lock week for payroll
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {gapMin > 0 && (
                  <div className="mt-3 flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-800">
                      {formatDurationFromMinutes(gapMin)} of day time isn't attributed to any job.
                      Could be lunch, travel, or a forgotten clock — review with the tradie.
                    </p>
                  </div>
                )}
              </div>

              {/* Days */}
              {dayKeys.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                  No entries this week. Use “Add entry” to log a missed shift or job time.
                </div>
              )}

              {dayKeys.map(dayKey => {
                const dayEntries = grouped[dayKey]
                const dayShiftMin = dayEntries
                  .filter(e => e.entry_type === 'shift')
                  .reduce((s, e) => s + (e.duration_minutes || 0), 0)
                const dayJobMin = dayEntries
                  .filter(e => e.entry_type === 'job')
                  .reduce((s, e) => s + (e.duration_minutes || 0), 0)
                const dayGap = Math.max(0, dayShiftMin - dayJobMin)

                return (
                  <div
                    key={dayKey}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800">
                        {fmtDateSydney(`${dayKey}T12:00:00+10:00`)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Day {formatDurationFromMinutes(dayShiftMin)} · Jobs{' '}
                        {formatDurationFromMinutes(dayJobMin)}
                        {dayGap > 0 && (
                          <span className="text-amber-600 ml-1">
                            · {formatDurationFromMinutes(dayGap)} unallocated
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {dayEntries.map(entry => (
                        <AdminEntryRow
                          key={entry.id}
                          entry={entry}
                          onEdit={() => setEditingEntry(entry)}
                          onShowHistory={() => setHistoryForId(entry.id)}
                          onDelete={() => setConfirmDeleteId(entry.id)}
                          isPending={pending}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {editingEntry && (
        <EditModal
          entry={editingEntry}
          companyJobs={companyJobs}
          onClose={() => setEditingEntry(null)}
          onSaved={() => {
            setEditingEntry(null)
            router.refresh()
          }}
        />
      )}

      {showAdd && selectedWorker && (
        <AddModal
          workerId={selectedWorker.id}
          workerName={selectedWorker.full_name}
          companyJobs={companyJobs}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false)
            router.refresh()
          }}
        />
      )}

      {historyForId && (
        <HistoryModal entryId={historyForId} onClose={() => setHistoryForId(null)} />
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="text-base font-bold text-slate-900 mb-2">Delete this entry?</h3>
            <p className="text-sm text-slate-600 mb-4">
              This permanently removes the entry. The audit history goes with it. Use only when the
              entry was added by mistake.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={pending}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold text-sm rounded-lg"
              >
                {pending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminEntryRow({
  entry,
  onEdit,
  onShowHistory,
  onDelete,
  isPending,
}: {
  entry: Entry
  onEdit: () => void
  onShowHistory: () => void
  onDelete: () => void
  isPending: boolean
}) {
  const isShift = entry.entry_type === 'shift'
  const isOpen = entry.status === 'open'
  const cost =
    !isShift && entry.hourly_rate
      ? ((entry.duration_minutes || 0) / 60) * entry.hourly_rate
      : null
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {isShift ? (
          <Clock className="w-4 h-4 text-green-600" />
        ) : (
          <Briefcase className="w-4 h-4 text-blue-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-800">
            {isShift ? 'Day shift' : entry.job?.job_number || 'Job'}
          </p>
          {isOpen && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">
              Running
            </span>
          )}
          {entry.auto_closed && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded">
              Auto-closed
            </span>
          )}
          {entry.approved_at && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded inline-flex items-center gap-0.5">
              <Lock className="w-2.5 h-2.5" />
              Locked
            </span>
          )}
          {entry.source === 'admin_manual' && (
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
              Admin
            </span>
          )}
        </div>
        {!isShift && entry.job?.title && (
          <p className="text-xs text-slate-500 truncate">{entry.job.title}</p>
        )}
        <p className="text-xs text-slate-500 mt-0.5">
          {fmtTimeSydney(entry.started_at)} – {isOpen ? 'now' : fmtTimeSydney(entry.ended_at)} ·{' '}
          <span className="font-medium text-slate-700">
            {formatDurationFromMinutes(entry.duration_minutes || 0)}
          </span>
          {cost !== null && (
            <span className="ml-2 text-green-700 font-medium">A${cost.toFixed(2)}</span>
          )}
        </p>
        {entry.notes && <p className="text-xs text-slate-500 mt-1 italic">{entry.notes}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onShowHistory}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-50"
          title="Edit history"
        >
          <History className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onEdit}
          disabled={isPending || isOpen}
          className="p-1.5 text-slate-400 hover:text-blue-700 rounded-md hover:bg-blue-50 disabled:opacity-30"
          title={isOpen ? 'End this entry first via the worker clock bar' : 'Edit entry'}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isPending}
          className="p-1.5 text-slate-400 hover:text-red-700 rounded-md hover:bg-red-50 disabled:opacity-30"
          title="Delete entry"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function EditModal({
  entry,
  companyJobs,
  onClose,
  onSaved,
}: {
  entry: Entry
  companyJobs: CompanyJob[]
  onClose: () => void
  onSaved: () => void
}) {
  const [startedLocal, setStartedLocal] = useState(isoToLocalInput(entry.started_at))
  const [endedLocal, setEndedLocal] = useState(isoToLocalInput(entry.ended_at))
  const [jobId, setJobId] = useState(entry.job_id || '')
  const [notes, setNotes] = useState(entry.notes || '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setError(null)
    startTransition(async () => {
      try {
        const updates: any = {
          started_at: localInputToISO(startedLocal),
          ended_at: endedLocal ? localInputToISO(endedLocal) : null,
          notes: notes.trim() || null,
        }
        if (entry.entry_type === 'job' && jobId !== entry.job_id) {
          updates.job_id = jobId || null
        }
        await editEntryAction({
          entryId: entry.id,
          updates,
          reason: reason.trim(),
        })
        onSaved()
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Couldn't save changes. Refresh and try again.",
        )
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-base font-bold text-slate-900">Edit entry</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-slate-500">
            {entry.entry_type === 'shift' ? 'Day shift' : 'Job timer'}
          </p>
          {entry.entry_type === 'job' && (
            <Field label="Job" required>
              <div className="relative">
                <select
                  value={jobId}
                  onChange={e => setJobId(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Pick a job…</option>
                  {companyJobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.job_number} — {j.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </Field>
          )}
          <Field label="Started" required>
            <input
              type="datetime-local"
              value={startedLocal}
              onChange={e => setStartedLocal(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Ended">
            <input
              type="datetime-local"
              value={endedLocal}
              onChange={e => setEndedLocal(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">
              Leave blank to keep this entry running.
            </p>
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Optional"
            />
          </Field>
          <Field label="Reason">
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="e.g. corrected lunch break per worker request"
            />
            <p className="text-xs text-slate-400 mt-1">
              Goes into the audit trail so you can trace this change later.
            </p>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg"
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddModal({
  workerId,
  workerName,
  companyJobs,
  onClose,
  onSaved,
}: {
  workerId: string
  workerName: string
  companyJobs: CompanyJob[]
  onClose: () => void
  onSaved: () => void
}) {
  const [entryType, setEntryType] = useState<EntryType>('job')
  const [jobId, setJobId] = useState<string>('')
  const [startedLocal, setStartedLocal] = useState('')
  const [endedLocal, setEndedLocal] = useState('')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const now = new Date()
    const dayStr = new Intl.DateTimeFormat('en-CA', { timeZone: SYDNEY_TZ }).format(now)
    setStartedLocal(`${dayStr}T08:00`)
    setEndedLocal(`${dayStr}T09:00`)
  }, [])

  const save = () => {
    setError(null)
    if (entryType === 'job' && !jobId) {
      setError('Pick a job to log time against, or switch to a day shift entry.')
      return
    }
    startTransition(async () => {
      try {
        await addMissedEntryAction({
          userId: workerId,
          entryType,
          jobId: entryType === 'job' ? jobId : null,
          startedAt: localInputToISO(startedLocal),
          endedAt: localInputToISO(endedLocal),
          notes: notes.trim() || null,
          reason: reason.trim(),
        })
        onSaved()
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Couldn't save the entry. Refresh and try again.",
        )
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-base font-bold text-slate-900">Add entry for {workerName}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <Field label="Type" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEntryType('job')}
                className={`py-2 text-sm rounded-lg border ${
                  entryType === 'job'
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Job timer
              </button>
              <button
                type="button"
                onClick={() => setEntryType('shift')}
                className={`py-2 text-sm rounded-lg border ${
                  entryType === 'shift'
                    ? 'bg-green-50 border-green-300 text-green-700 font-semibold'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Day shift
              </button>
            </div>
          </Field>
          {entryType === 'job' && (
            <Field label="Job" required>
              <div className="relative">
                <select
                  value={jobId}
                  onChange={e => setJobId(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">Pick a job…</option>
                  {companyJobs.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.job_number} — {j.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </Field>
          )}
          <Field label="Started" required>
            <input
              type="datetime-local"
              value={startedLocal}
              onChange={e => setStartedLocal(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Ended" required>
            <input
              type="datetime-local"
              value={endedLocal}
              onChange={e => setEndedLocal(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Optional"
            />
          </Field>
          <Field label="Reason">
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="e.g. tradie forgot to clock in"
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            disabled={pending}
            className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={pending}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm rounded-lg"
          >
            {pending ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    getAuditTrailAction(entryId).then(data => {
      if (!cancelled) setRows(data as any)
    })
    return () => {
      cancelled = true
    }
  }, [entryId])

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-base font-bold text-slate-900">Edit history</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-md hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4">
          {rows === null && <p className="text-sm text-slate-400">Loading…</p>}
          {rows && rows.length === 0 && (
            <p className="text-sm text-slate-400">No edits yet on this entry.</p>
          )}
          {rows && rows.length > 0 && (
            <ul className="space-y-3">
              {rows.map(r => (
                <li key={r.id} className="text-xs">
                  <p className="text-slate-500">
                    {new Date(r.edited_at).toLocaleString('en-AU', { timeZone: SYDNEY_TZ })}
                    {' · '}
                    <span className="font-semibold text-slate-700">
                      {r.editor?.full_name || 'Unknown'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-slate-700">
                    Changed{' '}
                    <span className="font-mono bg-slate-100 px-1 rounded">{r.field_name}</span>:{' '}
                    {r.old_value || '∅'} → {r.new_value || '∅'}
                  </p>
                  {r.reason && (
                    <p className="mt-0.5 text-slate-500 italic">“{r.reason}”</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
