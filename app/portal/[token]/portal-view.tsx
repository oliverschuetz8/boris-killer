'use client'

import { useState } from 'react'
import {
  Building2, ChevronDown, MapPin, Calendar,
  ImageIcon, X, Layers, Map, CheckCircle2,
  Clock, Shield,
} from 'lucide-react'
import { FloorPlanViewer } from '@/components/floor-plan-pin'
import type {
  PortalJobData,
  PortalPenetration,
  PortalEvidenceField,
  PortalBuilding,
} from '@/lib/services/portal'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-orange-100 text-orange-800',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
}

interface Props {
  data: PortalJobData
  photoUrls: Record<string, string>
  drawingUrls: Record<string, string>
  companyLogoUrl?: string | null
}

export default function PortalView({ data, photoUrls, drawingUrls, companyLogoUrl }: Props) {
  const { job, company, buildings, penetrations, evidence_fields } = data

  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [activePinId, setActivePinId] = useState<string | null>(null)
  const [selectedPenetration, setSelectedPenetration] = useState<PortalPenetration | null>(null)

  const COLOURS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee']

  // Collect all level drawings across all buildings for the standalone floor plans section
  const allLevelDrawings: { levelId: string; levelName: string; buildingName: string; colour: string; drawingUrl: string }[] = []
  buildings.forEach(building => {
    building.levels.forEach((level, levelIndex) => {
      if (drawingUrls[level.id]) {
        allLevelDrawings.push({
          levelId: level.id,
          levelName: level.name,
          buildingName: building.name,
          colour: COLOURS[levelIndex % COLOURS.length],
          drawingUrl: drawingUrls[level.id],
        })
      }
    })
  })

  // Group penetrations by room
  const byRoom: Record<string, PortalPenetration[]> = {}
  const unassigned: PortalPenetration[] = []
  for (const pen of penetrations) {
    if (pen.room_id) {
      if (!byRoom[pen.room_id]) byRoom[pen.room_id] = []
      byRoom[pen.room_id].push(pen)
    } else {
      unassigned.push(pen)
    }
  }

  const totalPhotos = penetrations.reduce((sum, p) => sum + p.photos.length, 0)

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setFn(next)
  }

  const statusStyle = STATUS_STYLES[job.status] || 'bg-gray-100 text-gray-800'
  const statusLabel = STATUS_LABELS[job.status] || job.status

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoUrl} alt="" className="w-7 h-7 object-contain rounded flex-shrink-0" />
            ) : (
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
            <span className="text-sm font-semibold text-slate-800">{company.name}</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Customer Portal</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Job Info Card */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
                <p className="text-sm text-slate-500 mt-0.5">{job.job_number}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle} flex-shrink-0`}>
                {statusLabel}
              </span>
            </div>

            {job.description && (
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{job.description}</p>
            )}
          </div>

          <div className="border-t border-slate-100 divide-y divide-slate-100">
            {/* Site */}
            {(job.site_address_line1 || job.site_name) && (
              <div className="flex items-start gap-3 px-6 py-3">
                <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  {job.site_name && (
                    <p className="text-sm font-medium text-slate-800">{job.site_name}</p>
                  )}
                  {job.site_address_line1 && (
                    <p className="text-xs text-slate-500">
                      {[job.site_address_line1, job.site_city, job.site_state, job.site_postcode]
                        .filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Schedule */}
            {(job.scheduled_start || job.scheduled_end) && (
              <div className="flex items-start gap-3 px-6 py-3">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex gap-6">
                  {job.scheduled_start && (
                    <div>
                      <p className="text-xs text-slate-400">Start</p>
                      <p className="text-sm text-slate-700">
                        {new Date(job.scheduled_start).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                  {job.scheduled_end && (
                    <div>
                      <p className="text-xs text-slate-400">End</p>
                      <p className="text-sm text-slate-700">
                        {new Date(job.scheduled_end).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Completed */}
            {job.completed_at && (
              <div className="flex items-start gap-3 px-6 py-3">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">Completed</p>
                  <p className="text-sm text-slate-700">
                    {new Date(job.completed_at).toLocaleDateString('en-AU', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evidence Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Evidence & Documentation</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              All penetrations, photos, and floor plan drawings for this job
            </p>
          </div>

          {penetrations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No evidence logged yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Evidence will appear here once work begins.
              </p>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <Layers className="w-4 h-4 text-slate-400" />
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{penetrations.length}</span> penetrations ·{' '}
                  <span className="font-semibold text-slate-700">{totalPhotos}</span> photos
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {/* Buildings drill-down */}
                {buildings.map(building => {
                  const buildingRoomIds = new Set(
                    building.levels.flatMap(l => l.rooms.map(r => r.id))
                  )
                  const buildingPenCount = penetrations.filter(
                    p => p.room_id && buildingRoomIds.has(p.room_id)
                  ).length
                  if (buildingPenCount === 0) return null
                  const buildingExpanded = expandedBuildings.has(building.id)

                  return (
                    <div key={building.id}>
                      <div
                        className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggle(expandedBuildings, setExpandedBuildings, building.id)}
                      >
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="flex-1 text-sm font-semibold text-slate-800 truncate min-w-0">
                          {building.name}
                        </span>
                        <span className="text-xs text-slate-400 mr-1 flex-shrink-0 hidden sm:inline">
                          {buildingPenCount} penetrations
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                          buildingExpanded ? 'rotate-0' : '-rotate-90'
                        }`} />
                      </div>

                      {buildingExpanded && (
                        <div className="border-t border-slate-100">
                          {building.levels.map((level, levelIndex) => {
                            const levelPenCount = level.rooms.reduce(
                              (sum, r) => sum + (byRoom[r.id]?.length ?? 0), 0
                            )
                            if (levelPenCount === 0) return null
                            const levelExpanded = expandedLevels.has(level.id)
                            const colour = COLOURS[levelIndex % COLOURS.length]
                            const hasDrawing = !!drawingUrls[level.id]

                            return (
                              <div key={level.id}>
                                <div
                                  className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                                  style={{ borderLeft: `3px solid ${colour}` }}
                                  onClick={() => toggle(expandedLevels, setExpandedLevels, level.id)}
                                >
                                  <span className="flex-1 text-sm font-medium text-slate-700 ml-2 truncate min-w-0">
                                    {level.name}
                                  </span>
                                  <span className="text-xs text-slate-400 mr-1 flex-shrink-0 hidden sm:inline">
                                    {levelPenCount} penetrations
                                  </span>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                                    levelExpanded ? 'rotate-0' : '-rotate-90'
                                  }`} />
                                </div>

                                {levelExpanded && (
                                  <div style={{ borderLeft: `3px solid ${colour}` }}>
                                    {level.rooms.map(room => {
                                      const roomPens = byRoom[room.id] || []
                                      if (roomPens.length === 0) return null
                                      const roomExpanded = expandedRooms.has(room.id)

                                      return (
                                        <div key={room.id} className="border-t border-slate-100">
                                          <div
                                            className="flex items-center gap-2 sm:gap-3 px-4 sm:px-8 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/50"
                                            onClick={() => toggle(expandedRooms, setExpandedRooms, room.id)}
                                          >
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-700 truncate">{room.name}</span>
                                                {room.is_done && (
                                                  <span className="text-xs text-green-600 font-medium flex items-center gap-1 flex-shrink-0">
                                                    <CheckCircle2 className="w-3 h-3" /> Done
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-xs text-slate-400 sm:hidden">
                                                {roomPens.length} penetration{roomPens.length !== 1 ? 's' : ''} · {roomPens.reduce((s, p) => s + p.photos.length, 0)} photos
                                              </span>
                                            </div>
                                            <span className="text-xs text-slate-400 mr-1 hidden sm:inline flex-shrink-0">
                                              {roomPens.length} penetration{roomPens.length !== 1 ? 's' : ''} ·{' '}
                                              {roomPens.reduce((s, p) => s + p.photos.length, 0)} photos
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                                              roomExpanded ? 'rotate-0' : '-rotate-90'
                                            }`} />
                                          </div>

                                          {roomExpanded && (
                                            <div className="px-4 sm:px-8 py-3 space-y-4 bg-white">
                                              {roomPens.map((pen, i) => (
                                                <PortalPenetrationCard
                                                  key={pen.id}
                                                  pen={pen}
                                                  index={i + 1}
                                                  evidenceFields={evidence_fields}
                                                  photoUrls={photoUrls}
                                                  onLightbox={setLightbox}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Unassigned penetrations */}
                {unassigned.length > 0 && (
                  <div>
                    <div
                      className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => toggle(expandedBuildings, setExpandedBuildings, '__unassigned__')}
                    >
                      <MapPin className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium text-slate-500">Unassigned</span>
                      <span className="text-xs text-slate-400 mr-1">
                        {unassigned.length} penetrations
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                        expandedBuildings.has('__unassigned__') ? 'rotate-0' : '-rotate-90'
                      }`} />
                    </div>
                    {expandedBuildings.has('__unassigned__') && (
                      <div className="px-6 py-3 space-y-4 bg-white border-t border-slate-100">
                        {unassigned.map((pen, i) => (
                          <PortalPenetrationCard
                            key={pen.id}
                            pen={pen}
                            index={i + 1}
                            evidenceFields={evidence_fields}
                            photoUrls={photoUrls}
                            onLightbox={setLightbox}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Floor Plans Section — always visible */}
        {allLevelDrawings.length > 0 && (
          <div className="space-y-6">
            {allLevelDrawings.map(({ levelId, levelName, buildingName, colour, drawingUrl }) => {
              const levelPins = penetrations
                .filter(p => p.level_id === levelId && p.floorplan_x != null && p.floorplan_y != null)
                .map(p => ({
                  id: p.id,
                  x: p.floorplan_x!,
                  y: p.floorplan_y!,
                  label: p.floorplan_label || '',
                }))

              return (
                <div key={levelId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <Map className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">
                        {levelName} — Floor Plan
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {buildingName}
                        {levelPins.length > 0 && ` · ${levelPins.length} pinned penetration${levelPins.length !== 1 ? 's' : ''} — tap a pin to view details`}
                      </p>
                    </div>
                  </div>
                  <div className="p-4">
                    <FloorPlanViewer
                      imageUrl={drawingUrl}
                      pins={levelPins}
                      activePinId={activePinId}
                      onPinClick={id => {
                        if (activePinId === id) {
                          setActivePinId(null)
                          setSelectedPenetration(null)
                        } else {
                          setActivePinId(id)
                          const pen = penetrations.find(p => p.id === id)
                          setSelectedPenetration(pen || null)
                        }
                      }}
                    />
                  </div>
                  {/* Selected penetration card — shown when a pin on THIS drawing is clicked */}
                  {selectedPenetration && activePinId && penetrations.some(p => p.id === activePinId && p.level_id === levelId) && (
                    <div className="px-6 pb-5 -mt-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Pin {selectedPenetration.floorplan_label || '?'} — Penetration Details
                        </p>
                        <button
                          onClick={() => { setActivePinId(null); setSelectedPenetration(null) }}
                          className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3 h-3" /> Close
                        </button>
                      </div>
                      <PortalPenetrationCard
                        pen={selectedPenetration}
                        index={penetrations.indexOf(selectedPenetration) + 1}
                        evidenceFields={evidence_fields}
                        photoUrls={photoUrls}
                        onLightbox={setLightbox}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-400">
            <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
            This is a read-only view. Contact {company.name} for any questions.
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  )
}

// ─── Penetration Card (read-only, no delete buttons) ───

function PortalPenetrationCard({
  pen,
  index,
  evidenceFields,
  photoUrls,
  onLightbox,
}: {
  pen: PortalPenetration
  index: number
  evidenceFields: PortalEvidenceField[]
  photoUrls: Record<string, string>
  onLightbox: (url: string) => void
}) {
  const createdAt = new Date(pen.created_at).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const fieldLabelMap = Object.fromEntries(evidenceFields.map(f => [f.id, f.label]))

  const resolvedFields: { label: string; value: string }[] = []
  for (const [fieldId, value] of Object.entries(pen.field_values || {})) {
    if (!value) continue
    const label = fieldLabelMap[fieldId]
    resolvedFields.push({ label: label || 'Field', value })
  }

  resolvedFields.sort((a, b) => {
    const aIdx = evidenceFields.findIndex(f => f.label === a.label)
    const bIdx = evidenceFields.findIndex(f => f.label === b.label)
    return aIdx - bIdx
  })

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-white">
        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index}
        </div>
        <p className="text-xs text-slate-500 flex-1">{createdAt}</p>
        {pen.floorplan_label && (
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            Pin: {pen.floorplan_label}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Field values */}
        {resolvedFields.length > 0 && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {resolvedFields.map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-medium text-slate-800">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Photos */}
        {pen.photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {pen.photos.map(photo => (
              <div
                key={photo.id}
                className="relative group rounded-lg overflow-hidden bg-slate-200 aspect-square"
              >
                {photoUrls[photo.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrls[photo.id]}
                    alt={photo.caption || 'Evidence photo'}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLightbox(photoUrls[photo.id])}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No photos attached.</p>
        )}
      </div>
    </div>
  )
}
