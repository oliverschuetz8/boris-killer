'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  startShiftAction,
  endShiftAction,
  endJobTimerAction,
  getClockStateAction,
} from '@/app/actions/time-tracking'
import { formatDurationLive } from '@/lib/services/time-tracking'
import { Play, Square, Clock, Briefcase, ChevronRight, ClipboardList } from 'lucide-react'

type State = Awaited<ReturnType<typeof getClockStateAction>>

export default function WorkerClockBar({ initialState }: { initialState: State }) {
  const [state, setState] = useState<State>(initialState)
  const [, forceTick] = useState(0)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  // Re-render every 30s so live duration ticks
  useEffect(() => {
    const t = setInterval(() => forceTick(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  // Background refresh of server state every 60s (catches changes from other tabs / admin edits)
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const fresh = await getClockStateAction()
        setState(fresh)
      } catch {
        /* keep last known state */
      }
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  const refresh = async () => {
    try {
      const fresh = await getClockStateAction()
      setState(fresh)
    } catch {
      /* ignore */
    }
  }

  const handleStartDay = () =>
    startTransition(async () => {
      try {
        await startShiftAction()
        await refresh()
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : "Couldn't start your shift. Refresh and try again.")
      }
    })

  const handleEndDay = () =>
    startTransition(async () => {
      const onJob = !!state.activeJobEntry
      const msg = onJob
        ? "End your day? Your current job timer will be stopped too."
        : 'End your day?'
      if (!confirm(msg)) return
      try {
        await endShiftAction()
        await refresh()
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : "Couldn't end your shift. Refresh and try again.")
      }
    })

  const handleStopJob = () =>
    startTransition(async () => {
      try {
        await endJobTimerAction()
        await refresh()
        router.refresh()
      } catch (e) {
        alert(e instanceof Error ? e.message : "Couldn't stop the job timer. Refresh and try again.")
      }
    })

  const dayDur = state.activeShift ? formatDurationLive(state.activeShift.started_at) : null
  const jobDur = state.activeJobEntry ? formatDurationLive(state.activeJobEntry.started_at) : null
  const jobLabel = state.activeJobEntry?.job?.job_number ?? null

  return (
    <div className="sticky top-16 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-lg mx-auto px-4 py-2">
        {!state.activeShift ? (
          // Off the clock
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Off the clock</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/today/timesheet"
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
                aria-label="My timesheet"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My time</span>
              </Link>
              <button
                onClick={handleStartDay}
                disabled={pending}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-semibold rounded-md transition-colors"
              >
                <Play className="w-3 h-3" />
                Start day
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {/* Day row */}
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                <span className="text-slate-700 font-medium">{dayDur} today</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/today/timesheet"
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1"
                  aria-label="My timesheet"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">My time</span>
                </Link>
                <button
                  onClick={handleEndDay}
                  disabled={pending}
                  className="text-xs font-semibold text-slate-600 hover:text-red-600 disabled:text-slate-400 px-2 py-1 transition-colors"
                >
                  End day
                </button>
              </div>
            </div>
            {/* Job row */}
            {state.activeJobEntry ? (
              <div className="flex items-center justify-between gap-2 text-sm bg-blue-50 px-3 py-1.5 rounded-md">
                <Link
                  href={`/jobs/${state.activeJobEntry.job_id}/execute`}
                  className="flex items-center gap-2 min-w-0 flex-1 group"
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span className="text-blue-800 font-medium truncate">
                    {jobLabel ? `${jobLabel} · ` : ''}
                    {jobDur} on this job
                  </span>
                  <ChevronRight className="w-3 h-3 text-blue-400 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <button
                  onClick={handleStopJob}
                  disabled={pending}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-md transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 pl-4">
                Not on a job yet — tap a job below to start the timer.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
