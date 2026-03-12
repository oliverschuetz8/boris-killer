'use client'

import { useState } from 'react'
import Link from 'next/link'
import MaterialLog from './material-log'
import PenetrationForm from './penetration-form'
import PenetrationList from './penetration-list'
import { startJob } from '@/lib/services/jobs'
import { startTimeEntry } from '@/lib/services/time-entries'
import {
  ArrowLeft, Play, Clock, MapPin, User,
  AlertTriangle, ClipboardList,
} from 'lucide-react'

interface Job {
  id: string
  title: string
  job_number: string
  status: string
  priority: string | null
  description: string | null
  notes: string | null
  started_at: string | null
  completed_at: string | null
  company_id: string
  customer: { name: string; email: string | null } | null
  site_name: string | null
  site_address_line1: string | null
  site_city: string | null
}

interface EvidenceField {
  id: string
  label: string
  field_type: 'text' | 'dropdown' | 'structure_level'
  options: string[] | null
  required: boolean
  order_index: number
}

interface LocationSession {
  buildingId: string
  buildingName: string
  levelName: string
  roomName: string
}

interface ExecutionViewProps {
  job: Job
  userId: string
  userName: string
  companyId: string
  evidenceFields: EvidenceField[]
  materialDefaults: any[]
}

export default function ExecutionView({
  job,
  userId,
  companyId,
  evidenceFields,
  materialDefaults,
}: ExecutionViewProps) {
  const [loading, setLoading] = useState<'start' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState(job.status)
  const [startedAt, setStartedAt] = useState<string | null>(job.started_at)
  const [penetrationRefresh, setPenetrationRefresh] = useState(0)

  // The currently active location (where new penetrations will be logged)
  const [activeLocation, setActiveLocation] = useState<LocationSession | null>(null)
  // Whether to show the location picker (to add a new location)
  const [showLocationPicker, setShowLocationPicker] = useState(true)

  const isNotStarted = localStatus === 'scheduled' || localStatus === 'draft'
  const isInProgress = localStatus === 'in_progress'
  const isCompleted = localStatus === 'completed'

  async function handleStart() {
    setLoading('start')
    setError(null)
    try {
      await startJob(job.id, userId)
      await startTimeEntry(job.id, userId, companyId)
      setLocalStatus('in_progress')
      setStartedAt(new Date().toISOString())
    } catch {
      setError('Failed to start job. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const siteDisplay = job.site_name || job.site_address_line1
  const siteCity = job.site_city

  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/jobs"
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
        {siteDisplay && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">
              {siteDisplay}{siteCity ? `, ${siteCity}` : ''}
            </span>
          </div>
        )}
        {startedAt && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">
              Started {new Date(startedAt).toLocaleTimeString('en-AU', {
                hour: '2-digit', minute: '2-digit',
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Job Description
          </p>
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

      {/* Execution sections */}
      {(isInProgress || isCompleted) && (
        <div className="space-y-4 mb-4">

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

          {/*
            LOCATION PICKER — shown when:
            - No location has been set yet (first time), OR
            - Worker tapped "New Location"
          */}
          {showLocationPicker && (
            <PenetrationForm
              jobId={job.id}
              companyId={companyId}
              userId={userId}
              evidenceFields={evidenceFields}
              materialDefaults={materialDefaults}
              activeLocation={null}
              onLocationSet={(loc) => {
                setActiveLocation(loc)
                setShowLocationPicker(false)
              }}
              onSaved={() => {
                setPenetrationRefresh(n => n + 1)
              }}
            />
          )}

          {/*
            PENETRATION LIST — shown once at least one location has been set.
            Shows all logged penetrations grouped by location.
            The active location group shows a "New Penetration" button.
          */}
          {activeLocation && !showLocationPicker && (
            <>
              {/* Active location banner */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm font-medium text-blue-800 flex-1">
                  {activeLocation.levelName} — {activeLocation.roomName}
                </p>
              </div>

              {/* Penetration form for the active location */}
              <PenetrationForm
                jobId={job.id}
                companyId={companyId}
                userId={userId}
                evidenceFields={evidenceFields}
                materialDefaults={materialDefaults}
                activeLocation={activeLocation}
                onLocationSet={(loc) => {
                  setActiveLocation(loc)
                  setShowLocationPicker(false)
                }}
                onSaved={() => {
                  setPenetrationRefresh(n => n + 1)
                }}
              />

              {/* All logged penetrations grouped by location */}
              <PenetrationList
                jobId={job.id}
                evidenceFields={evidenceFields}
                refreshTrigger={penetrationRefresh}
                activeLocation={activeLocation}
                onChangeLocation={() => {
                  setShowLocationPicker(true)
                }}
              />
            </>
          )}

        </div>
      )}

      {/* Materials */}
      {(isInProgress || isCompleted) && (
        <MaterialLog jobId={job.id} userRole="worker" />
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {/* Start Job button */}
      {isNotStarted && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 bg-white border-t border-slate-200">
          <div className="max-w-lg mx-auto pt-3">
            <button
              onClick={handleStart}
              disabled={loading === 'start'}
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-lg rounded-xl transition-colors"
            >
              <Play className="w-5 h-5" />
              {loading === 'start' ? 'Starting…' : 'Start Job'}
            </button>
          </div>
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