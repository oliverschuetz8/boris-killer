'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { uploadJobPhoto, getCompanyWorkTypes, getUsedIdentifiers } from '@/lib/services/photos'
import { Camera, X, Upload, CheckCircle2, ChevronDown } from 'lucide-react'
import Image from 'next/image'

interface PhotoUploadProps {
  jobId: string
  onPhotoUploaded?: () => void
}

const LEVEL_OPTIONS = [
  'Basement', 'Ground Floor', 'Level 1', 'Level 2', 'Level 3',
  'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Roof',
]

const SPACE_TYPES = [
  'Room', 'Corridor', 'Stairwell', 'Plant/Service Room',
  'Lobby/Reception', 'External', 'Other',
]

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface PhotoPreview {
  file: File
  previewUrl: string
  level: string
  levelCustom: string
  spaceType: string
  spaceIdentifier: string
  workType: string
  workTypeCustom: string
  beforeAfter: 'before' | 'after' | 'during'
  caption: string
}

export default function PhotoUpload({ jobId, onPhotoUploaded }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<PhotoPreview | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [workTypes, setWorkTypes] = useState<string[]>([])
  const [identifierSuggestions, setIdentifierSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Persist last-used across photos
  const [lastLevel, setLastLevel] = useState('')
  const [lastSpaceType, setLastSpaceType] = useState('')
  const [lastSpaceIdentifier, setLastSpaceIdentifier] = useState('')
  const [lastWorkType, setLastWorkType] = useState('')

  useEffect(() => {
    getCompanyWorkTypes().then(setWorkTypes)
  }, [])

  // Fetch identifier suggestions when level + spaceType change
  const fetchSuggestions = useCallback(async (level: string, spaceType: string) => {
    if (!level || !spaceType || spaceType === 'Other') {
      setIdentifierSuggestions([])
      return
    }
    const suggestions = await getUsedIdentifiers(jobId, level, spaceType)
    setIdentifierSuggestions(suggestions)
  }, [jobId])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)
    setPhoto({
      file, previewUrl,
      level: lastLevel, levelCustom: '',
      spaceType: lastSpaceType, spaceIdentifier: lastSpaceIdentifier,
      workType: lastWorkType, workTypeCustom: '',
      beforeAfter: 'before', caption: '',
    })
    if (lastLevel && lastSpaceType) {
      fetchSuggestions(lastLevel, lastSpaceType)
    }
    setUploadState('idle')
    setError(null)
  }

  function handleCancel() {
    if (photo) URL.revokeObjectURL(photo.previewUrl)
    setPhoto(null)
    setUploadState('idle')
    setError(null)
    setShowSuggestions(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function updatePhoto(updates: Partial<PhotoPreview>) {
    setPhoto(p => p ? { ...p, ...updates } : p)
  }

  const effectiveLevel = photo?.level === 'Other' ? photo.levelCustom.trim() : photo?.level
  const effectiveWorkType = photo?.workType === 'Other' ? photo.workTypeCustom.trim() : photo?.workType
  const isValid = !!(
    effectiveLevel &&
    photo?.spaceType &&
    photo?.spaceIdentifier?.trim() &&
    effectiveWorkType
  )

  async function handleUpload() {
    if (!photo || !isValid) return
    setUploadState('uploading')
    setError(null)

    try {
      const fd = new FormData()
      fd.append('job_id', jobId)
      fd.append('photo', photo.file)
      fd.append('level', effectiveLevel!)
      fd.append('space_type', photo.spaceType)
      fd.append('space_identifier', photo.spaceIdentifier.trim())
      fd.append('work_type', effectiveWorkType!)
      fd.append('before_after', photo.beforeAfter)
      fd.append('caption', photo.caption)

      await uploadJobPhoto(fd)

      setLastLevel(effectiveLevel!)
      setLastSpaceType(photo.spaceType)
      setLastSpaceIdentifier(photo.spaceIdentifier.trim())
      setLastWorkType(effectiveWorkType!)

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

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFileSelect} className="hidden" />

      {photo && (
        <div className="p-4 space-y-4">
          {/* Preview */}
          <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-video">
            <Image src={photo.previewUrl} alt="Preview" fill className="object-cover" />
            <button onClick={handleCancel}
              className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Before / During / After */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {(['before', 'during', 'after'] as const).map(val => (
              <button key={val}
                onClick={() => updatePhoto({ beforeAfter: val })}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  photo.beforeAfter === val ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                {val}
              </button>
            ))}
          </div>

          {/* Level */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Level <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select value={photo.level}
                onChange={e => {
                  updatePhoto({ level: e.target.value, levelCustom: '' })
                  if (e.target.value !== 'Other') fetchSuggestions(e.target.value, photo.spaceType)
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select level…</option>
                {LEVEL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                <option value="Other">Other (type below)</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {photo.level === 'Other' && (
              <input type="text" value={photo.levelCustom}
                onChange={e => updatePhoto({ levelCustom: e.target.value })}
                placeholder="e.g. Mezzanine"
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus />
            )}
          </div>

          {/* Space Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Space Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select value={photo.spaceType}
                onChange={e => {
                  updatePhoto({ spaceType: e.target.value, spaceIdentifier: '' })
                  if (photo.level && photo.level !== 'Other') fetchSuggestions(photo.level, e.target.value)
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select type…</option>
                {SPACE_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Space Identifier */}
          {photo.spaceType && (
            <div className="relative">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Space Identifier <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-1">
                  {photo.spaceType === 'Room' ? 'e.g. 501, Room 501' :
                   photo.spaceType === 'Corridor' ? 'e.g. A, North Wing' :
                   photo.spaceType === 'Stairwell' ? 'e.g. 1, East' :
                   'e.g. Level 2 Plant'}
                </span>
              </label>
              <input type="text" value={photo.spaceIdentifier}
                onChange={e => updatePhoto({ spaceIdentifier: e.target.value })}
                onFocus={() => setShowSuggestions(identifierSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Type or select…"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {showSuggestions && identifierSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {identifierSuggestions
                    .filter(s => s.toLowerCase().includes(photo.spaceIdentifier.toLowerCase()))
                    .map(suggestion => (
                      <button key={suggestion}
                        onMouseDown={() => {
                          updatePhoto({ spaceIdentifier: suggestion })
                          setShowSuggestions(false)
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        {suggestion}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Work Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Work Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select value={photo.workType}
                onChange={e => updatePhoto({ workType: e.target.value, workTypeCustom: '' })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select work type…</option>
                {workTypes.filter(t => t !== 'Other').map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
                <option value="Other">Other (type below)</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {photo.workType === 'Other' && (
              <input type="text" value={photo.workTypeCustom}
                onChange={e => updatePhoto({ workTypeCustom: e.target.value })}
                placeholder="Type work type…"
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
            <input type="text" value={photo.caption}
              onChange={e => updatePhoto({ caption: e.target.value })}
              placeholder="Any notes about this photo…"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {uploadState === 'success' ? (
            <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-lg text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Uploaded!</span>
            </div>
          ) : (
            <button onClick={handleUpload}
              disabled={!isValid || uploadState === 'uploading'}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg transition-colors">
              <Upload className="w-4 h-4" />
              {uploadState === 'uploading' ? 'Uploading…' : 'Upload Photo'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}