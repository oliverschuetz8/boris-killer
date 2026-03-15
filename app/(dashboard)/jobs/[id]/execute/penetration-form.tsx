'use client'

import { useState, useRef } from 'react'
import { createPenetration, uploadPenetrationPhoto } from '@/lib/services/penetrations'
import { Camera, ImageIcon, X, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react'

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
  activeLocation: LocationSession
  onSaved: () => void
  onCancel: () => void
}

export default function PenetrationForm({
  jobId,
  companyId,
  userId,
  evidenceFields,
  activeLocation,
  onSaved,
  onCancel,
}: Props) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  function setField(fieldId: string, value: string) {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }))
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
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
      if (field.field_type === 'structure_level') continue // handled by location
      if (!fieldValues[field.id]?.trim()) return `"${field.label}" is required`
    }
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setSaving(true)
    setError(null)
    try {
      const penetration = await createPenetration(
        jobId, companyId, userId, fieldValues,
        activeLocation.levelName,
        activeLocation.roomName,
        activeLocation.levelId,
        activeLocation.roomId,
      )
      await Promise.all(
        photos.map(p =>
          uploadPenetrationPhoto(
            penetration.id, jobId, companyId, userId,
            p.file, p.caption.trim() || undefined
          )
        )
      )
      photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
      setSaved(true)
      setTimeout(() => {
        setFieldValues({})
        setPhotos([])
        setSaved(false)
        onSaved()
      }, 900)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    photos.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setFieldValues({})
    setPhotos([])
    setError(null)
    onCancel()
  }

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
        <p className="text-sm font-semibold text-blue-800">New Penetration</p>
        <button onClick={handleCancel}
          className="w-7 h-7 rounded-lg hover:bg-blue-100 flex items-center justify-center transition-colors">
          <X className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      <div className="p-4 space-y-4">

        {/* Evidence fields — skip structure_level (handled by location) */}
        {evidenceFields
          .filter(f => f.field_type !== 'structure_level')
          .map(field => {
            const value = fieldValues[field.id] ?? ''

            if (field.field_type === 'text') {
              return (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <input type="text" value={value}
                    onChange={e => setField(field.id, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )
            }

            if (field.field_type === 'dropdown') {
              return (
                <div key={field.id}>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <div className="relative">
                    <select value={value} onChange={e => setField(field.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
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

            return null
          })}

        {/* Photos */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Photos</label>

          {photos.length > 0 && (
            <div className="space-y-3 mb-3">
              {photos.map((p, i) => (
                <div key={i} className="space-y-2">
                  <div className="relative w-full rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: '4/3' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md transition-colors">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  <input type="text" value={p.caption}
                    onChange={e => updateCaption(i, e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button"
              onClick={() => { if (cameraRef.current) { cameraRef.current.value = ''; cameraRef.current.click() } }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors">
              <Camera className="w-4 h-4" />Take Photo
            </button>
            <button type="button"
              onClick={() => { if (galleryRef.current) { galleryRef.current.value = ''; galleryRef.current.click() } }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors">
              <ImageIcon className="w-4 h-4" />From Gallery
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" multiple
            onChange={e => addPhotos(e.target.files)} className="hidden" />
          <input ref={galleryRef} type="file" accept="image/*" multiple
            onChange={e => addPhotos(e.target.files)} className="hidden" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {saved ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Saved!</span>
          </div>
        ) : (
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-colors">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              : <><CheckCircle2 className="w-4 h-4" />Save Penetration</>
            }
          </button>
        )}
      </div>
    </div>
  )
}