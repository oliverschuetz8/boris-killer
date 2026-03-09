'use client'

import { useState, useEffect } from 'react'
import { updatePhotoMetadata } from '@/lib/services/photos'
import { getRoomsForJob } from '@/lib/services/building-structure'
import { X, ChevronDown, Save } from 'lucide-react'

const SPACE_TYPES = [
  'Room', 'Corridor', 'Stairwell', 'Plant/Service Room',
  'Lobby/Reception', 'External', 'Other',
]

interface BuildingData {
  id: string
  name: string
  levels: { id: string; name: string; order_index: number }[]
}

interface PhotoAssignModalProps {
  jobId: string
  photoId: string
  currentLevel?: string | null
  currentSpaceType?: string | null
  currentSpaceIdentifier?: string | null
  currentWorkType?: string | null
  workTypes: string[]
  onSaved: () => void
  onClose: () => void
}

export default function PhotoAssignModal({
  jobId,
  photoId,
  currentLevel,
  currentSpaceType,
  currentSpaceIdentifier,
  currentWorkType,
  workTypes,
  onSaved,
  onClose,
}: PhotoAssignModalProps) {
  const [buildings, setBuildings] = useState<BuildingData[]>([])
  const [selectedBuildingId, setSelectedBuildingId] = useState('')
  const [level, setLevel] = useState(currentLevel || '')
  const [spaceType, setSpaceType] = useState(currentSpaceType || '')
  const [spaceIdentifier, setSpaceIdentifier] = useState(currentSpaceIdentifier || '')
  const [workType, setWorkType] = useState(currentWorkType || '')
  const [workTypeCustom, setWorkTypeCustom] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRoomsForJob(jobId).then((data: any[]) => {
      const mapped: BuildingData[] = data.map((b: any) => ({
        id: b.id,
        name: b.name,
        levels: (b.levels || [])
          .slice()
          .sort((a: any, b: any) => a.order_index - b.order_index),
      }))
      setBuildings(mapped)

      // Auto-select if only one building
      if (mapped.length === 1) {
        setSelectedBuildingId(mapped[0].id)
      } else if (currentLevel) {
        // Try to find which building contains the current level
        const match = mapped.find(b => b.levels.some(l => l.name === currentLevel))
        if (match) setSelectedBuildingId(match.id)
      }
    })
  }, [jobId, currentLevel])

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId)
  const levelOptions = selectedBuilding?.levels ?? []

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const effectiveWorkType = workType === 'Other' ? workTypeCustom.trim() : workType
      await updatePhotoMetadata(photoId, {
        level: level || undefined,
        space_type: spaceType || undefined,
        space_identifier: spaceIdentifier.trim() || undefined,
        work_type: effectiveWorkType || undefined,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">Assign Location</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Structure selector — only shown when 2+ buildings */}
        {buildings.length >= 2 && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Structure</label>
            <div className="relative">
              <select
                value={selectedBuildingId}
                onChange={e => {
                  setSelectedBuildingId(e.target.value)
                  setLevel('')
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

        {/* Level — from database */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Level</label>
          <div className="relative">
            <select
              value={level}
              onChange={e => setLevel(e.target.value)}
              disabled={buildings.length >= 2 && !selectedBuildingId}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select level…</option>
              {levelOptions.map(l => (
                <option key={l.id} value={l.name}>{l.name}</option>
              ))}
              <option value="Other">Other</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Space Type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Space Type</label>
          <div className="relative">
            <select value={spaceType} onChange={e => setSpaceType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select type…</option>
              {SPACE_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Space Identifier */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Space Identifier</label>
          <input type="text" value={spaceIdentifier}
            onChange={e => setSpaceIdentifier(e.target.value)}
            placeholder="e.g. 501, Corridor A"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Work Type */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Work Type</label>
          <div className="relative">
            <select value={workType} onChange={e => setWorkType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select work type…</option>
              {workTypes.filter(t => t !== 'Other').map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="Other">Other (type below)</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {workType === 'Other' && (
            <input type="text" value={workTypeCustom}
              onChange={e => setWorkTypeCustom(e.target.value)}
              placeholder="Type work type…"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium text-sm rounded-lg transition-colors">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Location'}
        </button>
      </div>
    </div>
  )
}