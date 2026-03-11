'use client'

import { useState, useRef, useEffect } from 'react'
import { getRoomsForJob } from '@/lib/services/building-structure'
import {
  createPenetration,
  uploadPenetrationPhoto,
} from '@/lib/services/penetrations'
import { Plus, Camera, ImageIcon, X, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface EvidenceField {
  id: string
  label: string
  field_type: 'text' | 'dropdown' | 'structure_level'
  options: string[] | null
  required: boolean
  order_index: number
}

interface Building {
  id: string
  name: string
  levels: { id: string; name: string; order_index: number }[]
}

interface PendingPhoto {
  file: File
  previewUrl: string
  caption: string
}

interface Props {
  jobId: string
  companyId: string
  userId: string
  evidenceFields: EvidenceField[]
  materialDefaults: any[]
  onSaved: () => void
}

export default function PenetrationForm({
  jobId,
  companyId,
  userId,
  evidenceFields,
  onSaved,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      getRoomsForJob(jobId).then((data: any[]) => {
        const mapped: Building[] = data.map((b: any) => ({
          id: b.id,
          name: b.name,
          levels: (b.levels || [])
            .slice()
            .sort((a: any, z: any) => a.order_index - z.order_index),
        }))
        setBuildings(mapped)
        // Auto-select if only one building
        if (mapped.length === 1) setSelectedBuildingId(mapped[0].id)
      })
    }
  }, [isOpen, jobId])

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)
  const levelOptions = selectedBuilding?.levels ?? []

  const hasStructureLevelField = evidenceFields.some(f => f.field_type === 'structure_level')

  function setField(fieldId: string, value: string) {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }))
  }

  function addPhotos(files: FileList | null) {
    if (!files) return
    const newPhotos: PendingPhoto[] = Array.from(files).map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
    }))
    setPhotos(prev => [...prev, ...newPhotos])
  }

  function removePhoto(index: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateCaption(index: number, caption: string) {
    setPhotos(prev => prev.map((p, i) => i === index ? { ...p, caption } : p))
  }

  function validate(): string | null {
    for (const field of evidenceFields) {
      if (!field.required) continue
      if (field.field_type === 'structure_level') {
        if (!fieldValues[field.id]) return `"${field.label}" is required`
      } else {
        if (!fieldValues[field.id]?.trim()) return `"${field.label}" is required`
      }
    }
    // If there's a structure_level field and multiple buildings, require building selection
    if (hasStructureLevelField && buildings.length >= 2 && !selectedBuildingId) {
      return 'Please select a structure'
    }
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setSaving(true)
    setError(null)

    try {
      // Create penetration
      const penetration = await createPenetration(jobId, companyId, userId, fieldValues)

      // Upload photos
      await Promise.all(
        photos.map(p =>
          uploadPenetrationPhoto(
            penetration.id,
            jobId,
            companyId,
            userId,
            p.file,
            p.caption.trim() || undefined
          )
        )
      )

      // Clean up previews
      photos.forEach(p => URL.revokeObjectURL(p.previewUrl))

      setSaved(true)
      setTimeout(() => {
        // Reset form
        setIsOpen(false)
        setFieldValues({})
        setPhotos([])
        setSelectedBuildingId('')
        setSaved(false)
        onSaved()
      }, 1000)
    } catch {
      setError('Failed to save penetration. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setIsOpen(false)
    setFieldValues({})
    setPhotos([])
    setSelectedBuildingId('')
    setError(null)
  }

  if (!isOpen) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-slate-800">Penetrations</p>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Log each penetration with its metadata and photos.
        </p>
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Penetration
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
      {/* Form header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
        <p className="text-sm font-semibold text-blue-800">New Penetration</p>
        <button
          onClick={handleCancel}
          className="w-7 h-7 rounded-lg hover:bg-blue-100 flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* Structure selector — only if 2+ buildings AND there's a structure_level field */}
        {hasStructureLevelField && buildings.length >= 2 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Which structure? <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedBuildingId}
                onChange={e => {
                  setSelectedBuildingId(e.target.value)
                  // Clear any structure_level field values when building changes
                  const levelFields = evidenceFields.filter(f => f.field_type === 'structure_level')
                  if (levelFields.length > 0) {
                    setFieldValues(prev => {
                      const next = { ...prev }
                      levelFields.forEach(f => delete next[f.id])
                      return next
                    })
                  }
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select structure…</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Dynamic evidence fields */}
        {evidenceFields.length === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-slate-400">
              No evidence fields configured for this job.
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              An admin can add fields in Job Edit → Evidence Fields.
            </p>
          </div>
        )}

        {evidenceFields.map(field => {
          const value = fieldValues[field.id] ?? ''

          if (field.field_type === 'text') {
            return (
              <div key={field.id}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={e => setField(field.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )
          }

          if (field.field_type === 'dropdown') {
            return (
              <div key={field.id}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={value}
                    onChange={e => setField(field.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select…</option>
                    {(field.options || []).map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )
          }

          if (field.field_type === 'structure_level') {
            const disabled = buildings.length >= 2 && !selectedBuildingId
            return (
              <div key={field.id}>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <div className="relative">
                  <select
                    value={value}
                    onChange={e => setField(field.id, e.target.value)}
                    disabled={disabled}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    <option value="">
                      {disabled ? 'Select structure first…' : 'Select level…'}
                    </option>
                    {levelOptions.map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )
          }

          return null
        })}

        {/* Photos section */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Photos</label>

          {/* Photo previews */}
          {photos.length > 0 && (
            <div className="space-y-2 mb-3">
              {photos.map((p, i) => (
                <div key={i} className="flex gap-2 items-start bg-slate-50 rounded-lg p-2">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                    <Image src={p.previewUrl} alt="Preview" fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={p.caption}
                      onChange={e => updateCaption(i, e.target.value)}
                      placeholder="Caption (optional)"
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <button
                    onClick={() => removePhoto(i)}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add photo buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              From Gallery
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={e => addPhotos(e.target.files)}
            className="hidden"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => addPhotos(e.target.files)}
            className="hidden"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Save button */}
        {saved ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Penetration saved!</span>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Save Penetration
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}