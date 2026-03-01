'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { startJob, completeJob } from '@/lib/services/jobs'
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Camera,
  ClipboardList,
} from 'lucide-react'

interface Job {
  id: string
  title: string
  job_number: string
  status: string
  priority: string
  description: string | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  customer: { name: string; email: string | null } | null
  site: { site_name: string | null; address_line1: string | null; city: string | null } | null
}

interface ExecutionViewProps {
  job: Job
  userId: string
  userName: string
}

export default function ExecutionView({ job, userId, userName }: ExecutionViewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'start' | 'complete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState(job.status)
  const [startedAt, setStartedAt] = useState<string | null>(job.started_at)

  const isNotStarted = localStatus === 'scheduled' || localStatus === 'draft'
  const isInProgress = localStatus === 'in_progress'
  const isCompleted = localStatus === 'completed'

  async function handleStart() {
    setLoading('start')
    setError(null)
    try {
      await startJob(job.id, userId)
      setLocalStatus('in_progress')
      setStartedAt(new Date().toISOString())
    } catch {
      setError('Failed to start job. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleComplete() {
    setLoading('complete')
    setError(null)
    try {
      await completeJob(job.id, userId)
      setLocalStatus('completed')
    } catch {
      setError('Failed to complete job. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/jobs/${job.id}`}
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">{job.job_number}</p>
          <h1 className="text-lg font-bold text-slate-900 truncate">{job.title}</h1>
        </div>
        <StatusPill status={localStatus} />
      </div>

      {/* Job Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
        {job.customer && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">{job.customer.name}</span>
          </div>
        )}
        {job.site && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">
              {job.site.site_name || job.site.address_line1 || 'Site not specified'}
              {job.site.city ? `, ${job.site.city}` : ''}
            </span>
          </div>
        )}
        {startedAt && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">
              Started {new Date(startedAt).toLocaleTimeString('en-AU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
        {job.priority === 'urgent' && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">Urgent priority</span>
          </div>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Job Description</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {/* Notes */}
      {job.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      {/* Execution Steps — only visible once started */}
      {(isInProgress || isCompleted) && (
        <div className="space-y-3 mb-4">
          {/* Checklist placeholder */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Checklist</p>
                <p className="text-xs text-slate-500">Coming soon</p>
              </div>
            </div>
          </div>

          {/* Photos placeholder */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                <Camera className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Photos</p>
                <p className="text-xs text-slate-500">Coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Completed state */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">Job Completed</p>
          <p className="text-sm text-green-600 mt-1">Great work, {userName.split(' ')[0]}!</p>
        </div>
      )}

      {/* Action Buttons — fixed to bottom on mobile */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 max-w-lg mx-auto">
          {isNotStarted && (
            <button
              onClick={handleStart}
              disabled={loading === 'start'}
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-lg rounded-xl transition-colors"
            >
              <Play className="w-5 h-5" />
              {loading === 'start' ? 'Starting…' : 'Start Job'}
            </button>
          )}
          {isInProgress && (
            <button
              onClick={handleComplete}
              disabled={loading === 'complete'}
              className="w-full flex items-center justify-center gap-3 py-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold text-lg rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-5 h-5" />
              {loading === 'complete' ? 'Completing…' : 'Complete Job'}
            </button>
          )}
        </div>
      )}

    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
    on_hold: { label: 'On Hold', className: 'bg-orange-100 text-orange-700' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
    draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600' },
  }
  const { label, className } = config[status] ?? config.draft
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}