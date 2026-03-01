'use client'

import { useState, useRef } from 'react'
import { uploadJobPhoto } from '@/lib/services/photos'
import { Camera, X, Upload, CheckCircle2, ChevronDown } from 'lucide-react'
import Image from 'next/image'

interface PhotoUploadProps {
  jobId: string
  onPhotoUploaded?: () => void
}

const AREA_OPTIONS = [
  'Level 1', 'Level 2', 'Level 3', 'Roof', 'Basement',
  'Corridor', 'Stairwell', 'Plant Room', 'Car Park', 'External',
]

const WORK_TYPE_OPTIONS = [
  'Fire Penetration', 'Fire Door', 'Passive Fire Protection',
  'Sprinkler', 'Alarm System', 'Emergency Lighting',
  'Exit Sign', 'Extinguisher', 'General',
]

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface PhotoPreview {
  file: File
  previewUrl: string
  area: string
  workType: string
  beforeAfter: 'before' | 'after' | 'during'
  caption: string
}

export default function PhotoUpload({ jobId, onPhotoUploaded }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<PhotoPreview | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastArea, setLastArea] = useState('')
  const [lastWorkType, setLastWorkType] = useState('')

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setPhoto({
      file,
      previewUrl,
      area: lastArea,
      workType: lastWorkType,
      beforeAfter: 'before',
      caption: '',
    })
    setUploadState('idle')
    setError(null)
  }

  function handleCancel() {
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    setPhoto(null)
    setUploadState('idle')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!photo) return
    setUploadState('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('job_id', jobId)
      formData.append('photo', photo.file)
      formData.append('area_location', photo.area)
      formData.append('work_type', photo.workType)
      formData.append('before_after', photo.beforeAfter)
      formData.append('caption', photo.caption)

      await uploadJobPhoto(formData)

      // Remember last used values for next photo
      setLastArea(photo.area)
      setLastWorkType(photo.workType)

      setUploadState('success')
      setTimeout(() => {
        handleCancel()
        onPhotoUploaded?.()
      }, 1200)
    } catch {
      setUploadState('error')
      setError('Upload failed. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
          <Camera className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-800">Photos</p>
          <p className="text-xs text-slate-500">Capture evidence for this job</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          Add Photo
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo preview + metadata */}
      {photo && (
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-video">
            <Image
              src={photo.previewUrl}
              alt="Photo preview"
              fill
              className="object-cover"
            />
            <button
              onClick={handleCancel}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Before / After toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['before', 'during', 'after'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setPhoto(p => p ? { ...p, beforeAfter: val } : p)}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  photo.beforeAfter === val
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {val}
              </button>
            ))}
          </div>

          {/* Area / Location */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Area / Location <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={photo.area}
                onChange={(e) => setPhoto(p => p ? { ...p, area: e.target.value } : p)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select area…</option>
                {AREA_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Work Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Work Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={photo.workType}
                onChange={(e) => setPhoto(p => p ? { ...p, workType: e.target.value } : p)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select work type…</option>
                {WORK_TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Notes (optional)
            </label>
            <input
              type="text"
              value={photo.caption}
              onChange={(e) => setPhoto(p => p ? { ...p, caption: e.target.value } : p)}
              placeholder="Any notes about this photo…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Upload button */}
          {uploadState === 'success' ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Uploaded!</span>
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={!photo.area || !photo.workType || uploadState === 'uploading'}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              {uploadState === 'uploading' ? 'Uploading…' : 'Upload Photo'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}