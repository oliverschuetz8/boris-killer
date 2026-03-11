'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getPenetrations,
  deletePenetration,
  deletePenetrationPhoto,
  getPenetrationPhotoUrl,
  type Penetration,
} from '@/lib/services/penetrations'
import { ChevronDown, ChevronRight, Trash2, ImageIcon, X } from 'lucide-react'
import Image from 'next/image'

interface EvidenceField {
  id: string
  label: string
  field_type: 'text' | 'dropdown' | 'structure_level'
  options: string[] | null
  required: boolean
  order_index: number
}

interface Props {
  jobId: string
  evidenceFields: EvidenceField[]
  refreshTrigger: number
}

export default function PenetrationList({ jobId, evidenceFields, refreshTrigger }: Props) {
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

      // Load signed URLs for all photos
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

  function toggle(id: string) {
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
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center text-sm text-slate-400">
      Loading penetrations…
    </div>
  )

  if (penetrations.length === 0) return null

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Logged Penetrations · {penetrations.length}
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {penetrations.map((pen, index) => {
            const isExpanded = expanded.has(pen.id)
            const photoCount = pen.photos.length
            const createdAt = new Date(pen.created_at).toLocaleTimeString('en-AU', {
              hour: '2-digit', minute: '2-digit',
            })

            // Build summary label from field values
            const summaryParts = evidenceFields
              .slice(0, 2)
              .map(f => pen.field_values[f.id])
              .filter(Boolean)
            const summary = summaryParts.join(' · ') || `Penetration ${penetrations.length - index}`

            return (
              <div key={pen.id}>
                {/* Row header */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggle(pen.id)}
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {penetrations.length - index}
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

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 bg-slate-50 border-t border-slate-100">

                    {/* Field values */}
                    {evidenceFields.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-3">
                        {evidenceFields.map(field => {
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

                    {/* Photos */}
                    {photoCount > 0 ? (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-2">Photos</p>
                        <div className="grid grid-cols-3 gap-2">
                          {pen.photos.map(photo => (
                            <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-slate-200 aspect-square">
                              {urls[photo.id] ? (
                                <Image
                                  src={urls[photo.id]}
                                  alt="Penetration photo"
                                  fill
                                  className="object-cover cursor-pointer"
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
                      <p className="text-xs text-slate-400 pt-1">No photos attached.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
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
          <div className="relative w-full max-w-lg aspect-square">
            <Image
              src={lightbox}
              alt="Full size"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}