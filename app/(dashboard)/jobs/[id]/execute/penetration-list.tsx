'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getPenetrations,
  deletePenetration,
  deletePenetrationPhoto,
  getPenetrationPhotoUrl,
  type Penetration,
} from '@/lib/services/penetrations'
import { MapPin, ChevronDown, ChevronRight, Trash2, ImageIcon, X, Plus } from 'lucide-react'

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

interface LocationGroup {
  key: string
  levelName: string
  roomName: string
  penetrations: Penetration[]
}

interface Props {
  jobId: string
  evidenceFields: EvidenceField[]
  refreshTrigger: number
  activeLocation: LocationSession | null
  onChangeLocation: () => void
}

export default function PenetrationList({
  jobId,
  evidenceFields,
  refreshTrigger,
  activeLocation,
  onChangeLocation,
}: Props) {
  const [penetrations, setPenetrations] = useState<Penetration[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPenetrations(jobId)
      setPenetrations(data)
      const allPhotos = data.flatMap(p => p.photos)
      const urlMap: Record<string, string> = {}
      await Promise.all(
        allPhotos.map(async photo => {
          const url = await getPenetrationPhotoUrl(photo.storage_path)
          if (url) urlMap[photo.id] = url
        })
      )
      setUrls(urlMap)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load() }, [load, refreshTrigger])

  // Group penetrations by level + room
  const groups: LocationGroup[] = []
  for (const pen of penetrations) {
    const key = `${pen.location_level ?? ''}||${pen.location_room ?? ''}`
    const existing = groups.find(g => g.key === key)
    if (existing) {
      existing.penetrations.push(pen)
    } else {
      groups.push({
        key,
        levelName: pen.location_level ?? 'No location',
        roomName: pen.location_room ?? '',
        penetrations: [pen],
      })
    }
  }

  function togglePen(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleDeletePenetration(id: string) {
    if (!confirm('Delete this penetration and all its photos?')) return
    setDeleting(id)
    try {
      await deletePenetration(id)
      setPenetrations(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('Failed to delete penetration')
    } finally {
      setDeleting(null)
    }
  }

  async function handleDeletePhoto(penetrationId: string, photoId: string, storagePath: string) {
    if (!confirm('Delete this photo?')) return
    try {
      await deletePenetrationPhoto(photoId, storagePath)
      setPenetrations(prev =>
        prev.map(p =>
          p.id === penetrationId
            ? { ...p, photos: p.photos.filter(ph => ph.id !== photoId) }
            : p
        )
      )
    } catch {
      alert('Failed to delete photo')
    }
  }

  if (loading) return (
    <div className="text-center text-sm text-slate-400 py-4">Loading…</div>
  )

  return (
    <>
      <div className="space-y-4">

        {/* Render each location group */}
        {groups.map(group => {
          const isCurrentLocation =
            activeLocation &&
            activeLocation.levelName === group.levelName &&
            activeLocation.roomName === group.roomName

          return (
            <div key={group.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">

              {/* Location header */}
              <div className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 ${
                isCurrentLocation ? 'bg-blue-50' : 'bg-slate-50'
              }`}>
                <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrentLocation ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className={`text-xs font-semibold flex-1 ${isCurrentLocation ? 'text-blue-700' : 'text-slate-600'}`}>
                  {group.levelName}{group.roomName ? ` — ${group.roomName}` : ''}
                  {isCurrentLocation && <span className="ml-2 font-normal text-blue-500">(current)</span>}
                </p>
                <span className="text-xs text-slate-400">{group.penetrations.length} logged</span>
              </div>

              {/* Penetrations in this group */}
              <div className="divide-y divide-slate-100">
                {group.penetrations.map((pen, index) => {
                  const isExpanded = expanded.has(pen.id)
                  const photoCount = pen.photos.length
                  const createdAt = new Date(pen.created_at).toLocaleTimeString('en-AU', {
                    hour: '2-digit', minute: '2-digit',
                  })
                  const summaryParts = evidenceFields
                    .filter(f => f.field_type !== 'structure_level')
                    .slice(0, 2)
                    .map(f => pen.field_values[f.id])
                    .filter(Boolean)
                  const summary = summaryParts.join(' · ') || `Penetration ${index + 1}`

                  return (
                    <div key={pen.id}>
                      <div
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => togglePen(pen.id)}
                      >
                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{summary}</p>
                          <p className="text-xs text-slate-400">
                            {createdAt} · {photoCount} photo{photoCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); handleDeletePenetration(pen.id) }}
                            disabled={deleting === pen.id}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4 text-slate-400" />
                            : <ChevronRight className="w-4 h-4 text-slate-400" />
                          }
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 space-y-3 bg-slate-50 border-t border-slate-100">
                          {evidenceFields.filter(f => f.field_type !== 'structure_level').length > 0 && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                              {evidenceFields
                                .filter(f => f.field_type !== 'structure_level')
                                .map(field => {
                                  const val = pen.field_values[field.id]
                                  if (!val) return null
                                  return (
                                    <div key={field.id}>
                                      <p className="text-xs text-slate-500">{field.label}</p>
                                      <p className="text-sm font-medium text-slate-800">{val}</p>
                                    </div>
                                  )
                                })}
                            </div>
                          )}

                          {photoCount > 0 ? (
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-2">Photos</p>
                              <div className="grid grid-cols-3 gap-2">
                                {pen.photos.map(photo => (
                                  <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-slate-200 aspect-square">
                                    {urls[photo.id] ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={urls[photo.id]}
                                        alt="Penetration photo"
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={() => setLightbox(urls[photo.id])}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-5 h-5 text-slate-400" />
                                      </div>
                                    )}
                                    <button
                                      onClick={() => handleDeletePhoto(pen.id, photo.id, photo.storage_path)}
                                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center hidden group-hover:flex hover:bg-red-600"
                                    >
                                      <X className="w-3 h-3 text-white" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">No photos attached.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              
            </div>
          )
        })}

        {/* New Location button */}
        <button
          onClick={onChangeLocation}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:text-blue-600 hover:border-blue-400 bg-white transition-colors"
        >
          <MapPin className="w-4 h-4" />
          + New Location
        </button>
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
          <img src={lightbox} alt="Full size" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  )
}