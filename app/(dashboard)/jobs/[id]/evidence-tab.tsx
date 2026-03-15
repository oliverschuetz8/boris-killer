'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getRoomsForJob } from '@/lib/services/building-structure'
import {
  getPenetrationPhotoUrl,
  deletePenetration,
  deletePenetrationPhoto,
} from '@/lib/services/penetrations'
import {
  Building2, ChevronDown, MapPin,
  ImageIcon, X, Layers, Trash2,
} from 'lucide-react'

interface Photo {
  id: string
  storage_path: string
  caption: string | null
}

interface Penetration {
  id: string
  field_values: Record<string, string>
  created_at: string
  room_id: string | null
  level_id: string | null
  photos: Photo[]
}

interface EvidenceField {
  id: string
  label: string
  order_index: number
}

interface Room {
  id: string
  name: string
  is_done: boolean
}

interface Level {
  id: string
  name: string
  order_index: number
  rooms: Room[]
}

interface Building {
  id: string
  name: string
  levels: Level[]
}

interface Props {
  jobId: string
  userRole: string
}

export default function EvidenceTab({ jobId, userRole }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [penetrations, setPenetrations] = useState<Penetration[]>([])
  const [evidenceFields, setEvidenceFields] = useState<EvidenceField[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [deletingPen, setDeletingPen] = useState<string | null>(null)
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null)

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch structure, penetrations, and evidence fields in parallel
      const [structureData, penResult, fieldsResult] = await Promise.all([
        getRoomsForJob(jobId),
        supabase
          .from('penetrations')
          .select(`
            id, field_values, created_at, room_id, level_id,
            photos:penetration_photos(id, storage_path, caption)
          `)
          .eq('job_id', jobId)
          .order('created_at', { ascending: true }),
        supabase
          .from('job_evidence_fields')
          .select('id, label, order_index')
          .eq('job_id', jobId)
          .order('order_index'),
      ])

      const mapped: Building[] = (structureData as any[]).map(b => ({
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

      const pens = (penResult.data || []) as Penetration[]
      setPenetrations(pens)
      setEvidenceFields((fieldsResult.data || []) as EvidenceField[])

      // Load signed URLs for all photos
      const allPhotos = pens.flatMap(p => p.photos)
      const urlMap: Record<string, string> = {}
      await Promise.all(
        allPhotos.map(async photo => {
          const url = await getPenetrationPhotoUrl(photo.storage_path)
          if (url) urlMap[photo.id] = url
        })
      )
      setPhotoUrls(urlMap)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load() }, [load])

  function toggle(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setFn(next)
  }

  async function handleDeletePenetration(penId: string) {
    if (!confirm('Delete this penetration and all its photos? This cannot be undone.')) return
    setDeletingPen(penId)
    try {
      await deletePenetration(penId)
      setPenetrations(prev => prev.filter(p => p.id !== penId))
    } catch {
      alert('Failed to delete penetration')
    } finally {
      setDeletingPen(null)
    }
  }

  async function handleDeletePhoto(penId: string, photoId: string, storagePath: string) {
    if (!confirm('Delete this photo?')) return
    setDeletingPhoto(photoId)
    try {
      await deletePenetrationPhoto(photoId, storagePath)
      setPenetrations(prev => prev.map(p =>
        p.id === penId
          ? { ...p, photos: p.photos.filter(ph => ph.id !== photoId) }
          : p
      ))
    } catch {
      alert('Failed to delete photo')
    } finally {
      setDeletingPhoto(null)
    }
  }

  const byRoom: Record<string, Penetration[]> = {}
  const unassigned: Penetration[] = []
  for (const pen of penetrations) {
    if (pen.room_id) {
      if (!byRoom[pen.room_id]) byRoom[pen.room_id] = []
      byRoom[pen.room_id].push(pen)
    } else {
      unassigned.push(pen)
    }
  }

  const totalPhotos = penetrations.reduce((sum, p) => sum + p.photos.length, 0)
  const COLOURS = ['#60a5fa','#a78bfa','#34d399','#fbbf24','#f87171','#22d3ee']

  if (loading) return (
    <div className="px-4 py-12 text-center text-sm text-slate-400">Loading evidence…</div>
  )

  if (penetrations.length === 0) return (
    <div className="px-4 py-12 text-center">
      <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-500">No penetrations logged yet.</p>
      <p className="text-xs text-slate-400 mt-1">
        Evidence will appear here once workers start logging penetrations.
      </p>
    </div>
  )

  return (
    <>
      {/* Summary bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
        <Layers className="w-4 h-4 text-slate-400" />
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{penetrations.length}</span> penetrations ·{' '}
          <span className="font-semibold text-slate-700">{totalPhotos}</span> photos
        </p>
      </div>

      <div className="divide-y divide-slate-100">

        {/* Buildings drill-down */}
        {buildings.map(building => {
          const buildingExpanded = expandedBuildings.has(building.id)
          const buildingRoomIds = new Set(building.levels.flatMap(l => l.rooms.map(r => r.id)))
          const buildingPenCount = penetrations.filter(
            p => p.room_id && buildingRoomIds.has(p.room_id)
          ).length
          if (buildingPenCount === 0) return null

          return (
            <div key={building.id}>
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggle(expandedBuildings, setExpandedBuildings, building.id)}
              >
                <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold text-slate-800">{building.name}</span>
                <span className="text-xs text-slate-400 mr-1">{buildingPenCount} penetrations</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  buildingExpanded ? 'rotate-0' : '-rotate-90'
                }`} />
              </div>

              {buildingExpanded && (
                <div className="border-t border-slate-100">
                  {building.levels.map((level, levelIndex) => {
                    const levelExpanded = expandedLevels.has(level.id)
                    const levelPenCount = level.rooms.reduce(
                      (sum, r) => sum + (byRoom[r.id]?.length ?? 0), 0
                    )
                    if (levelPenCount === 0) return null
                    const colour = COLOURS[levelIndex % COLOURS.length]

                    return (
                      <div key={level.id}>
                        <div
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                          style={{ borderLeft: `3px solid ${colour}` }}
                          onClick={() => toggle(expandedLevels, setExpandedLevels, level.id)}
                        >
                          <span className="flex-1 text-sm font-medium text-slate-700 ml-2">
                            {level.name}
                          </span>
                          <span className="text-xs text-slate-400 mr-1">
                            {levelPenCount} penetrations
                          </span>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
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
                                    className="flex items-center gap-3 px-6 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors bg-slate-50/50"
                                    onClick={() => toggle(expandedRooms, setExpandedRooms, room.id)}
                                  >
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="flex-1 text-sm text-slate-700">{room.name}</span>
                                    <span className="text-xs text-slate-400 mr-1">
                                      {roomPens.length} penetration{roomPens.length !== 1 ? 's' : ''} ·{' '}
                                      {roomPens.reduce((s, p) => s + p.photos.length, 0)} photos
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                      roomExpanded ? 'rotate-0' : '-rotate-90'
                                    }`} />
                                  </div>

                                  {roomExpanded && (
                                    <div className="px-6 py-3 space-y-4 bg-white">
                                      {roomPens.map((pen, i) => (
                                        <PenetrationCard
                                          key={pen.id}
                                          pen={pen}
                                          index={i + 1}
                                          evidenceFields={evidenceFields}
                                          photoUrls={photoUrls}
                                          isAdmin={isAdmin}
                                          deletingPen={deletingPen}
                                          deletingPhoto={deletingPhoto}
                                          onDeletePen={handleDeletePenetration}
                                          onDeletePhoto={handleDeletePhoto}
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

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div>
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggle(expandedBuildings, setExpandedBuildings, '__unassigned__')}
            >
              <MapPin className="w-4 h-4 text-slate-300 flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-slate-500">Unassigned</span>
              <span className="text-xs text-slate-400 mr-1">{unassigned.length} penetrations</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                expandedBuildings.has('__unassigned__') ? 'rotate-0' : '-rotate-90'
              }`} />
            </div>
            {expandedBuildings.has('__unassigned__') && (
              <div className="px-4 py-3 space-y-4 bg-white border-t border-slate-100">
                {unassigned.map((pen, i) => (
                  <PenetrationCard
                    key={pen.id}
                    pen={pen}
                    index={i + 1}
                    evidenceFields={evidenceFields}
                    photoUrls={photoUrls}
                    isAdmin={isAdmin}
                    deletingPen={deletingPen}
                    deletingPhoto={deletingPhoto}
                    onDeletePen={handleDeletePenetration}
                    onDeletePhoto={handleDeletePhoto}
                    onLightbox={setLightbox}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5 text-white" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  )
}

function PenetrationCard({
  pen,
  index,
  evidenceFields,
  photoUrls,
  isAdmin,
  deletingPen,
  deletingPhoto,
  onDeletePen,
  onDeletePhoto,
  onLightbox,
}: {
  pen: Penetration
  index: number
  evidenceFields: EvidenceField[]
  photoUrls: Record<string, string>
  isAdmin: boolean
  deletingPen: string | null
  deletingPhoto: string | null
  onDeletePen: (id: string) => void
  onDeletePhoto: (penId: string, photoId: string, storagePath: string) => void
  onLightbox: (url: string) => void
}) {
  const createdAt = new Date(pen.created_at).toLocaleString('en-AU', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })

  // Build a lookup map from field ID → label
  const fieldLabelMap = Object.fromEntries(evidenceFields.map(f => [f.id, f.label]))

  // Resolve field values: use label as key, skip unknown IDs and empty values
  const resolvedFields: { label: string; value: string }[] = []
  for (const [fieldId, value] of Object.entries(pen.field_values || {})) {
    if (!value) continue
    const label = fieldLabelMap[fieldId]
    // If we have a label, use it; if not (e.g. deleted field), show value only
    resolvedFields.push({ label: label || 'Field', value })
  }

  // Sort by evidence field order_index
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
        {isAdmin && (
          <button
            onClick={() => onDeletePen(pen.id)}
            disabled={deletingPen === pen.id}
            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50 flex-shrink-0"
            title="Delete penetration"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Field values with resolved labels */}
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
              <div key={photo.id}
                className="relative group rounded-lg overflow-hidden bg-slate-200 aspect-square">
                {photoUrls[photo.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrls[photo.id]}
                    alt={photo.caption || 'Penetration photo'}
                    className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onLightbox(photoUrls[photo.id])}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => onDeletePhoto(pen.id, photo.id, photo.storage_path)}
                    disabled={deletingPhoto === photo.id}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full items-center justify-center hidden group-hover:flex transition-colors disabled:opacity-50"
                    title="Delete photo"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
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