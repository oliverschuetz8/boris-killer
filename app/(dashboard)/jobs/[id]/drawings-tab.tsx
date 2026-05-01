'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  Building2, ChevronDown, Upload, FileImage, Trash2, X, Layers, Map,
  ImageIcon,
} from 'lucide-react'
import { getBuildings } from '@/lib/services/building-structure'
import {
  getDrawingsForJob, uploadLevelDrawing, deleteLevelDrawing, getDrawingUrl,
  type LevelDrawing,
} from '@/lib/services/level-drawings'
import { getPenetrationPhotoUrl } from '@/lib/services/penetrations'
import { getTemplateFields } from '@/lib/services/evidence-categories'
import { createClient } from '@/lib/supabase/client'
import { FloorPlanViewer } from '@/components/floor-plan-pin'

interface Room {
  id: string
  name: string
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

interface PinData {
  id: string
  x: number
  y: number
  label: string
}

interface Photo {
  id: string
  storage_path: string
  caption: string | null
}

interface PenetrationDetail {
  id: string
  level_id: string | null
  floorplan_x: number | null
  floorplan_y: number | null
  floorplan_label: string | null
  field_values: Record<string, string>
  evidence_subcategory_id: string | null
  created_at: string
  room_id: string | null
  photos: Photo[]
}

interface EvidenceField {
  id: string
  label: string
  order_index: number
}

interface Props {
  jobId: string
  companyId: string
  userRole: string
  userId: string
}

const LEVEL_COLOURS = [
  '#60a5fa',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#22d3ee',
]

export default function DrawingsTab({ jobId, companyId, userRole, userId }: Props) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [drawingsMap, setDrawingsMap] = useState<Record<string, LevelDrawing[]>>({})
  const [drawingUrls, setDrawingUrls] = useState<Record<string, string>>({})
  const [pinsMap, setPinsMap] = useState<Record<string, PinData[]>>({})
  const [penetrations, setPenetrations] = useState<PenetrationDetail[]>([])
  const [evidenceFields, setEvidenceFields] = useState<EvidenceField[]>([])
  const [templateFieldMap, setTemplateFieldMap] = useState<Record<string, string>>({})
  const [subcategoryNames, setSubcategoryNames] = useState<Record<string, string>>({})
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [roomNames, setRoomNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(new Set())
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())
  const [uploadingLevel, setUploadingLevel] = useState<string | null>(null)
  const [previewDrawing, setPreviewDrawing] = useState<string | null>(null)
  const [activePinId, setActivePinId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadLevelRef = useRef<string | null>(null)

  const isAdmin = userRole === 'admin' || userRole === 'manager'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const [data, drawings, penResult, fieldsResult] = await Promise.all([
        getBuildings(jobId),
        getDrawingsForJob(jobId),
        supabase
          .from('penetrations')
          .select(`
            id, level_id, floorplan_x, floorplan_y, floorplan_label,
            field_values, evidence_subcategory_id, created_at, room_id,
            photos:penetration_photos(id, storage_path, caption)
          `)
          .eq('job_id', jobId)
          .not('floorplan_x', 'is', null),
        supabase
          .from('job_evidence_fields')
          .select('id, label, order_index')
          .eq('job_id', jobId)
          .order('order_index'),
      ])

      setBuildings(data as Building[])
      setDrawingsMap(drawings)
      setEvidenceFields((fieldsResult.data || []) as EvidenceField[])

      const pens = (penResult.data || []) as PenetrationDetail[]
      setPenetrations(pens)

      // Group pins by level_id
      const pins: Record<string, PinData[]> = {}
      for (const p of pens) {
        if (!p.level_id || p.floorplan_x == null || p.floorplan_y == null) continue
        if (!pins[p.level_id]) pins[p.level_id] = []
        pins[p.level_id].push({
          id: p.id,
          x: p.floorplan_x,
          y: p.floorplan_y,
          label: p.floorplan_label || '',
        })
      }
      setPinsMap(pins)

      // Build room name lookup from building structure
      const names: Record<string, string> = {}
      for (const b of data as Building[]) {
        for (const l of b.levels) {
          for (const r of l.rooms) {
            names[r.id] = r.name
          }
        }
      }
      setRoomNames(names)

      // Fetch template field labels for subcategories
      const uniqueSubcategoryIds = [...new Set(
        pens.map(p => p.evidence_subcategory_id).filter(Boolean) as string[]
      )]
      if (uniqueSubcategoryIds.length > 0) {
        const { data: subNames } = await supabase
          .from('evidence_subcategories')
          .select('id, name')
          .in('id', uniqueSubcategoryIds)
        const nameMap: Record<string, string> = {}
        for (const s of (subNames || [])) nameMap[s.id] = s.name
        setSubcategoryNames(nameMap)

        const allTemplateFields = await Promise.all(
          uniqueSubcategoryIds.map(id => getTemplateFields(id))
        )
        const tfMap: Record<string, string> = {}
        for (const fields of allTemplateFields) {
          for (const f of fields) tfMap[f.id] = f.label
        }
        setTemplateFieldMap(tfMap)
      }

      // Load signed URLs for all penetration photos
      const allPhotos = pens.flatMap(p => p.photos)
      const urlMap: Record<string, string> = {}
      await Promise.all(
        allPhotos.map(async photo => {
          const url = await getPenetrationPhotoUrl(photo.storage_path)
          if (url) urlMap[photo.id] = url
        })
      )
      setPhotoUrls(urlMap)

      // Auto-expand buildings that have drawings
      const buildingsWithDrawings = new Set<string>()
      for (const b of data as Building[]) {
        for (const l of b.levels) {
          if ((drawings[l.id] || []).length > 0) {
            buildingsWithDrawings.add(b.id)
          }
        }
      }
      setExpandedBuildings(buildingsWithDrawings)

      // Pre-load signed URLs for all drawings
      const urls: Record<string, string> = {}
      for (const levelDrawings of Object.values(drawings)) {
        for (const d of levelDrawings) {
          const url = await getDrawingUrl(d.file_url)
          if (url) urls[d.id] = url
        }
      }
      setDrawingUrls(urls)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load() }, [load])

  function toggleBuilding(id: string) {
    setExpandedBuildings(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleLevel(id: string) {
    setExpandedLevels(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function triggerDrawingUpload(levelId: string) {
    uploadLevelRef.current = levelId
    fileInputRef.current?.click()
  }

  async function handleDrawingFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const levelId = uploadLevelRef.current
    if (!file || !levelId) return

    setUploadingLevel(levelId)
    try {
      const drawing = await uploadLevelDrawing(levelId, companyId, jobId, userId, file)
      setDrawingsMap(prev => ({
        ...prev,
        [levelId]: [drawing, ...(prev[levelId] || [])],
      }))
      const url = await getDrawingUrl(drawing.file_url)
      if (url) {
        setDrawingUrls(prev => ({ ...prev, [drawing.id]: url }))
      }
    } catch (err) {
      console.error('Failed to upload drawing:', err)
      alert('Failed to upload drawing. Please try again.')
    } finally {
      setUploadingLevel(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDeleteDrawing(drawingId: string, storagePath: string, levelId: string) {
    if (!confirm('Delete this floor plan drawing?')) return
    try {
      await deleteLevelDrawing(drawingId, storagePath)
      setDrawingsMap(prev => ({
        ...prev,
        [levelId]: (prev[levelId] || []).filter(d => d.id !== drawingId),
      }))
      setDrawingUrls(prev => {
        const next = { ...prev }
        delete next[drawingId]
        return next
      })
      if (previewDrawing === drawingId) setPreviewDrawing(null)
    } catch (err) {
      console.error('Failed to delete drawing:', err)
    }
  }

  // Find the selected penetration for the detail panel
  const selectedPenetration = activePinId
    ? penetrations.find(p => p.id === activePinId) || null
    : null

  // Build field label lookup
  const fieldLabelMap: Record<string, string> = {
    ...templateFieldMap,
    ...Object.fromEntries(evidenceFields.map(f => [f.id, f.label])),
  }

  // Count total drawings
  const totalDrawings = Object.values(drawingsMap).reduce((sum, arr) => sum + arr.length, 0)
  const totalPins = Object.values(pinsMap).reduce((sum, arr) => sum + arr.length, 0)

  if (loading) return (
    <div className="p-6 text-center text-sm text-slate-400">Loading drawings...</div>
  )

  if (buildings.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
      <Layers className="w-8 h-8 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500">No building structure set up yet.</p>
      <p className="text-xs text-slate-400 mt-1">
        Add buildings and levels in the Structure tab first, then upload drawings here.
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Hidden file input for drawing uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleDrawingFileChange}
      />

      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">
        <Map className="w-4 h-4 text-slate-400" />
        <p className="text-xs text-slate-500">
          <span className="font-semibold text-slate-700">{totalDrawings}</span> drawing{totalDrawings !== 1 ? 's' : ''} ·{' '}
          <span className="font-semibold text-slate-700">{totalPins}</span> pinned penetration{totalPins !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Buildings > Levels > Drawings */}
      {buildings.map(building => {
        const buildingHasDrawings = building.levels.some(l => (drawingsMap[l.id] || []).length > 0)
        const buildingDrawingCount = building.levels.reduce(
          (sum, l) => sum + (drawingsMap[l.id] || []).length, 0
        )
        const isExpanded = expandedBuildings.has(building.id)

        return (
          <div key={building.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toggleBuilding(building.id)}
            >
              <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="flex-1 font-semibold text-slate-800 text-sm">{building.name}</span>
              {buildingDrawingCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <FileImage className="w-3 h-3" />
                  {buildingDrawingCount}
                </span>
              )}
              <span className="text-xs text-slate-400 mr-1">
                {building.levels.length} level{building.levels.length !== 1 ? 's' : ''}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-0' : '-rotate-90'
              }`} />
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {building.levels.map((level, levelIndex) => {
                  const colour = LEVEL_COLOURS[levelIndex % LEVEL_COLOURS.length]
                  const levelDrawings = drawingsMap[level.id] || []
                  const levelPins = pinsMap[level.id] || []
                  const levelExpanded = expandedLevels.has(level.id)

                  return (
                    <div key={level.id}>
                      {/* Level header */}
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                        style={{ borderLeft: `3px solid ${colour}` }}
                        onClick={() => toggleLevel(level.id)}
                      >
                        <span className="flex-1 text-sm font-medium text-slate-700">{level.name}</span>
                        {levelDrawings.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <FileImage className="w-3 h-3" />
                            {levelDrawings.length} drawing{levelDrawings.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {levelPins.length > 0 && (
                          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {levelPins.length} pin{levelPins.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            onClick={e => { e.stopPropagation(); triggerDrawingUpload(level.id) }}
                            disabled={uploadingLevel === level.id}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-blue-50"
                          >
                            <Upload className="w-3 h-3" />
                            {uploadingLevel === level.id ? 'Uploading...' : 'Upload'}
                          </button>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          levelExpanded ? 'rotate-0' : '-rotate-90'
                        }`} />
                      </div>

                      {/* Level content - drawings */}
                      {levelExpanded && (
                        <div
                          className="bg-slate-50 px-4 pb-4 pt-3 space-y-3"
                          style={{ borderLeft: `3px solid ${colour}` }}
                        >
                          {levelDrawings.length === 0 && (
                            <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <FileImage className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              <p className="text-xs text-amber-700">
                                No floor plan uploaded for this level.
                                {isAdmin && ' Click Upload above to add one.'}
                              </p>
                            </div>
                          )}

                          {/* Drawing thumbnails grid */}
                          {levelDrawings.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {levelDrawings.map(drawing => (
                                <div key={drawing.id} className="relative group">
                                  <button
                                    onClick={() => {
                                      setPreviewDrawing(
                                        previewDrawing === drawing.id ? null : drawing.id
                                      )
                                      setActivePinId(null)
                                    }}
                                    className={`w-full aspect-[4/3] rounded-lg border overflow-hidden bg-white transition-colors ${
                                      previewDrawing === drawing.id
                                        ? 'border-blue-400 ring-2 ring-blue-100'
                                        : 'border-slate-200 hover:border-blue-400'
                                    }`}
                                  >
                                    {drawingUrls[drawing.id] ? (
                                      <img
                                        src={drawingUrls[drawing.id]}
                                        alt={drawing.file_name}
                                        className="w-full h-full object-contain p-1"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <FileImage className="w-6 h-6 text-slate-300" />
                                      </div>
                                    )}
                                  </button>
                                  <p className="text-xs text-slate-500 mt-1 truncate px-1">
                                    {drawing.file_name}
                                  </p>
                                  {isAdmin && (
                                    <button
                                      onClick={() => handleDeleteDrawing(drawing.id, drawing.file_url, level.id)}
                                      className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Full drawing preview with pins */}
                          {previewDrawing && drawingUrls[previewDrawing] &&
                            levelDrawings.some(d => d.id === previewDrawing) && (
                            <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  {levelPins.length > 0
                                    ? `${levelPins.length} pinned penetration${levelPins.length !== 1 ? 's' : ''} — tap a pin to view details`
                                    : 'Floor Plan Preview'
                                  }
                                </p>
                                <button
                                  onClick={() => { setPreviewDrawing(null); setActivePinId(null) }}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                                >
                                  <X className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                              </div>
                              <FloorPlanViewer
                                imageUrl={drawingUrls[previewDrawing]}
                                pins={levelPins}
                                activePinId={activePinId}
                                onPinClick={id => setActivePinId(prev => prev === id ? null : id)}
                              />

                              {/* Pin detail panel */}
                              {selectedPenetration && levelPins.some(p => p.id === activePinId) && (
                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                      Pin {selectedPenetration.floorplan_label || '?'} — Penetration Details
                                    </p>
                                    <button
                                      onClick={() => setActivePinId(null)}
                                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                                    >
                                      <X className="w-3 h-3" /> Close
                                    </button>
                                  </div>
                                  <PinDetailCard
                                    pen={selectedPenetration}
                                    fieldLabelMap={fieldLabelMap}
                                    subcategoryName={selectedPenetration.evidence_subcategory_id
                                      ? subcategoryNames[selectedPenetration.evidence_subcategory_id] || null
                                      : null}
                                    roomName={selectedPenetration.room_id
                                      ? roomNames[selectedPenetration.room_id] || null
                                      : null}
                                    photoUrls={photoUrls}
                                    onLightbox={setLightbox}
                                  />
                                </div>
                              )}
                            </div>
                          )}
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
    </div>
  )
}

// ─── Pin Detail Card ───

function PinDetailCard({
  pen,
  fieldLabelMap,
  subcategoryName,
  roomName,
  photoUrls,
  onLightbox,
}: {
  pen: PenetrationDetail
  fieldLabelMap: Record<string, string>
  subcategoryName: string | null
  roomName: string | null
  photoUrls: Record<string, string>
  onLightbox: (url: string) => void
}) {
  const createdAt = new Date(pen.created_at).toLocaleString('en-AU', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Australia/Sydney',
  })

  const resolvedFields: { label: string; value: string }[] = []
  for (const [fieldId, value] of Object.entries(pen.field_values || {})) {
    if (!value) continue
    const label = fieldLabelMap[fieldId]
    resolvedFields.push({ label: label || 'Field', value })
  }

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-200 bg-white flex-wrap">
        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {pen.floorplan_label || '?'}
        </div>
        {subcategoryName && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 text-violet-700">
            {subcategoryName}
          </span>
        )}
        {roomName && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
            {roomName}
          </span>
        )}
        <p className="text-xs text-slate-500 flex-1">{createdAt}</p>
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

        {resolvedFields.length === 0 && (
          <p className="text-xs text-slate-400">No evidence fields recorded.</p>
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
