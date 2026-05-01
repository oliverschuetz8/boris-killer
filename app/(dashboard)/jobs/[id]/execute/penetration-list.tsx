'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getPenetrations,
  deletePenetration,
  deletePenetrationPhoto,
  getPenetrationPhotoUrl,
  type Penetration,
} from '@/lib/services/penetrations'
import { getTemplateFields, getEvidenceSubcategories } from '@/lib/services/evidence-categories'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, ChevronRight, Trash2, ImageIcon, X } from 'lucide-react'

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
  roomId: string
  evidenceFields: EvidenceField[]
  refreshTrigger: number
}

export default function PenetrationList({ jobId, roomId, evidenceFields, refreshTrigger }: Props) {
  const [penetrations, setPenetrations] = useState<Penetration[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [templateFieldMap, setTemplateFieldMap] = useState<Record<string, string>>({})
  const [subcategoryNames, setSubcategoryNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPenetrations(jobId, roomId)
      setPenetrations(data)

      // Load subcategory names and template field labels
      const uniqueSubIds = [...new Set(
        data.map(p => p.evidence_subcategory_id).filter(Boolean) as string[]
      )]
      if (uniqueSubIds.length > 0) {
        // Fetch subcategory names
        const supabase = createClient()
        const { data: subNames } = await supabase
          .from('evidence_subcategories')
          .select('id, name')
          .in('id', uniqueSubIds)
        const nameMap: Record<string, string> = {}
        for (const s of (subNames || [])) nameMap[s.id] = s.name
        setSubcategoryNames(nameMap)

        // Fetch template field labels
        const allTf = await Promise.all(uniqueSubIds.map(id => getTemplateFields(id)))
        const tfMap: Record<string, string> = {}
        for (const fields of allTf) {
          for (const f of fields) tfMap[f.id] = f.label
        }
        setTemplateFieldMap(tfMap)
      }

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
  }, [jobId, roomId])

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
    <div className="text-center text-xs text-slate-400 py-3">Loading penetrations…</div>
  )

  if (penetrations.length === 0) return (
    <div className="text-center text-xs text-slate-400 py-3">No penetrations logged here yet.</div>
  )

  return (
    <>
      <div className="divide-y divide-slate-100">
        {penetrations.map((pen, index) => {
          const isExpanded = expanded.has(pen.id)
          const photoCount = pen.photos.length
          const createdAt = new Date(pen.created_at).toLocaleTimeString('en-AU', {
            hour: '2-digit', minute: '2-digit',
          })
          // Build summary: subcategory name + pin label (e.g. "Penetration 1.2", "Fire Door 1.3")
          const subName = pen.evidence_subcategory_id
            ? subcategoryNames[pen.evidence_subcategory_id] || 'Penetration'
            : 'Penetration'
          const pinLabel = pen.floorplan_label || String(index + 1)
          const summary = `${subName} ${pinLabel}`

          return (
            <div key={pen.id}>
              <div
                className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggle(pen.id)}
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
                <div className="pb-3 pt-1 space-y-3 bg-slate-50 rounded-lg px-3 mb-1">
                  {Object.keys(pen.field_values || {}).length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2">
                      {Object.entries(pen.field_values || {}).map(([fieldId, val]) => {
                        if (!val) return null
                        const label = evidenceFields.find(f => f.id === fieldId)?.label
                          || templateFieldMap[fieldId]
                          || 'Field'
                        return (
                          <div key={fieldId}>
                            <p className="text-xs text-slate-500">{label}</p>
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
                              <img src={urls[photo.id]} alt="Penetration photo"
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => setLightbox(urls[photo.id])} />
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

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
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