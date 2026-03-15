'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import PenetrationForm from './penetration-form'
import PenetrationList from './penetration-list'
import RoomMaterialsSection from './room-materials-section'
import OverviewView from './overview-view'
import { startJob } from '@/lib/services/jobs'
import { startTimeEntry } from '@/lib/services/time-entries'
import { getRoomsForJob } from '@/lib/services/building-structure'
import {
  ArrowLeft, Play, Clock, MapPin, User,
  AlertTriangle, ClipboardList, ChevronDown,
  LayoutList, Plus, CheckCircle2,
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
  levelId: string
  levelName: string
  roomId: string
  roomName: string
}

interface Building {
  id: string
  name: string
  levels: {
    id: string
    name: string
    order_index: number
    rooms: { id: string; name: string; is_done: boolean }[]
  }[]
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

  const [buildings, setBuildings] = useState<Building[]>([])
  const [loadingStructure, setLoadingStructure] = useState(false)

  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [selectedLevelId, setSelectedLevelId] = useState('')
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [locationError, setLocationError] = useState<string | null>(null)

  const [activeLocation, setActiveLocation] = useState<LocationSession | null>(null)
  const [showPenetrationForm, setShowPenetrationForm] = useState(false)
  const [penetrationRefresh, setPenetrationRefresh] = useState(0)
  const [roomMaterialsRefresh, setRoomMaterialsRefresh] = useState(0)
  const [overviewRefresh, setOverviewRefresh] = useState(0)
  const [showOverview, setShowOverview] = useState(false)
  const [roomDone, setRoomDone] = useState(false)

  const isNotStarted = localStatus === 'scheduled' || localStatus === 'draft'
  const isInProgress = localStatus === 'in_progress'
  const isCompleted = localStatus === 'completed'

  useEffect(() => {
    if (isInProgress || isCompleted) {
      setLoadingStructure(true)
      getRoomsForJob(job.id).then((data: any[]) => {
        const mapped: Building[] = data.map(b => ({
          id: b.id,
          name: b.name,
          levels: (b.levels || [])
            .slice()
            .sort((a: any, z: any) => a.order_index - z.order_index)
            .map((l: any) => ({
              id: l.id,
              name: l.name,
              order_index: l.order_index,
              rooms: l.rooms || [],
            })),
        }))
        setBuildings(mapped)
        if (mapped.length === 1) setSelectedBuildingId(mapped[0].id)
        setLoadingStructure(false)
      })
    }
  }, [job.id, isInProgress, isCompleted])

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId) ?? buildings[0]
  const selectedLevel = selectedBuilding?.levels.find(l => l.id === selectedLevelId)
  const roomOptions = selectedLevel?.rooms ?? []

  function handleConfirmLocation() {
    if (!selectedLevelId || !selectedRoomId) {
      setLocationError('Select a level and room to continue')
      return
    }
    const building = buildings.find(b => b.id === selectedBuildingId) ?? buildings[0]
    const level = building?.levels.find(l => l.id === selectedLevelId)
    const room = level?.rooms.find(r => r.id === selectedRoomId)
    if (!level || !room) { setLocationError('Invalid selection'); return }
    setLocationError(null)
    setActiveLocation({
      buildingId: building?.id ?? '',
      buildingName: building?.name ?? '',
      levelId: level.id,
      levelName: level.name,
      roomId: room.id,
      roomName: room.name,
    })
    setRoomDone(room.is_done ?? false)
    setShowPenetrationForm(false)
  }

  function handleNewLocation() {
    setActiveLocation(null)
    setSelectedLevelId('')
    setSelectedRoomId('')
    setLocationError(null)
    setShowPenetrationForm(false)
    setRoomDone(false)
  }

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


  return (
    <div className="max-w-lg mx-auto pb-24">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/jobs"
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">{job.job_number}</p>
          <h1 className="text-lg font-bold text-slate-900 truncate">{job.title}</h1>
        </div>
        <StatusPill status={localStatus} />
      </div>

      {/* Job Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3">
        {job.customer && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">{job.customer.name}</span>
          </div>
        )}
        {(job.site_name || job.site_address_line1) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">
              {job.site_name || job.site_address_line1}
              {job.site_city ? `, ${job.site_city}` : ''}
            </span>
          </div>
        )}
        {startedAt && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-700">
              Started {new Date(startedAt).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
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

      {job.description && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Job Description</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
        </div>
      )}

      {job.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{job.notes}</p>
        </div>
      )}

      {/* ── Execution sections ── */}
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

          {/* ── Location picker ── */}
          {!activeLocation && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-slate-800">Where are you working?</p>
              </div>
              <div className="p-4 space-y-3">
                {loadingStructure ? (
                  <p className="text-sm text-slate-400 text-center py-4">Loading structure…</p>
                ) : buildings.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">
                    No structure set up for this job. Ask an admin to add levels and rooms.
                  </p>
                ) : (
                  <>
                    {buildings.length >= 2 && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                          Structure <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select value={selectedBuildingId}
                            onChange={e => { setSelectedBuildingId(e.target.value); setSelectedLevelId(''); setSelectedRoomId('') }}
                            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Select structure…</option>
                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Level <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select value={selectedLevelId}
                          onChange={e => { setSelectedLevelId(e.target.value); setSelectedRoomId('') }}
                          disabled={buildings.length >= 2 && !selectedBuildingId}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400">
                          <option value="">Select level…</option>
                          {(selectedBuilding?.levels ?? []).map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Room <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select value={selectedRoomId}
                          onChange={e => setSelectedRoomId(e.target.value)}
                          disabled={!selectedLevelId}
                          className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400">
                          <option value="">Select room…</option>
                          {roomOptions.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {locationError && <p className="text-sm text-red-600">{locationError}</p>}

                    <button onClick={handleConfirmLocation}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors">
                      Set Location
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Active location view ── */}
          {activeLocation && (
            <>
              {/* Location label + New Penetration grouped in one card */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-blue-50">
                  <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm font-semibold text-blue-800 flex-1 flex items-center gap-2">
                    <span>{activeLocation.levelName} — {activeLocation.roomName}</span>
                    {roomDone && (
                      <span className="text-green-600 text-xs font-normal">✓ Done</span>
                    )}
                  </p>
                </div>
                <div className="p-4">
                  {showPenetrationForm ? (
                    <PenetrationForm
                      jobId={job.id}
                      companyId={companyId}
                      userId={userId}
                      evidenceFields={evidenceFields}
                      activeLocation={activeLocation}
                      onSaved={() => {
                        setShowPenetrationForm(false)
                        setPenetrationRefresh(n => n + 1)
                        setOverviewRefresh(n => n + 1)
                        setRoomDone(false)
                      }}
                      onCancel={() => setShowPenetrationForm(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowPenetrationForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New Penetration
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Penetrations in this room */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Penetrations in this room
                  </p>
                </div>
                <div className="px-4 py-2">
                  <PenetrationList
                    jobId={job.id}
                    roomId={activeLocation.roomId}
                    evidenceFields={evidenceFields}
                    refreshTrigger={penetrationRefresh}
                  />
                </div>
              </div>

              {/* 2. Materials Used + Mark Room Done */}
              <RoomMaterialsSection
                jobId={job.id}
                roomId={activeLocation.roomId}
                levelId={activeLocation.levelId}
                companyId={companyId}
                userId={userId}
                materialDefaults={materialDefaults}
                refreshTrigger={roomMaterialsRefresh}
                onMaterialAdded={() => setRoomDone(false)}
                onRoomMarkedDone={() => {
                  setRoomDone(true)
                  setOverviewRefresh(n => n + 1)
                }}
              />

              {/* 4. New Location */}
              <button
                onClick={handleNewLocation}
                className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:text-blue-600 hover:border-blue-400 bg-white transition-colors"
              >
                <MapPin className="w-4 h-4" />
                + New Location
              </button>

              {/* 5. View Full Overview */}
              <button
                onClick={() => setShowOverview(v => !v)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <LayoutList className="w-4 h-4" />
                {showOverview ? 'Hide Overview' : 'View Full Overview'}
              </button>

              {showOverview && (
                <OverviewView
                  jobId={job.id}
                  onClose={() => setShowOverview(false)}
                  refreshTrigger={overviewRefresh}
                />
              )}
            </>
          )}

        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {isNotStarted && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-2 bg-white border-t border-slate-200">
          <div className="max-w-lg mx-auto pt-3">
            <button onClick={handleStart} disabled={loading === 'start'}
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-lg rounded-xl transition-colors">
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