'use client'

import { useEffect, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getEvidenceSubcategories,
  getTemplateFields,
  type EvidenceSubcategory,
  type EvidenceTemplateField,
} from '@/lib/services/evidence-categories'
import { getRoomsForJob } from '@/lib/services/building-structure'
import { updatePenetration } from '@/lib/services/penetrations'
import { friendlyError } from '@/lib/errors'

interface JobEvidenceField {
  id: string
  label: string
  field_type: 'text' | 'dropdown' | 'structure_level'
  options: string[] | null
  required: boolean
  order_index: number
  template_field_id: string | null
}

interface Penetration {
  id: string
  evidence_subcategory_id: string | null
  field_values: Record<string, string>
  floorplan_label: string | null
  level_id: string | null
  room_id: string | null
}

interface Room {
  id: string
  name: string
}
interface Level {
  id: string
  name: string
  rooms: Room[]
}
interface Building {
  id: string
  name: string
  levels: Level[]
}

interface Props {
  jobId: string
  penetration: Penetration
  evidenceCategoryId: string | null
  onClose: () => void
  onSaved: () => void
}

export default function PenetrationEditModal({
  jobId,
  penetration,
  evidenceCategoryId,
  onClose,
  onSaved,
}: Props) {
  const [subcategories, setSubcategories] = useState<EvidenceSubcategory[]>([])
  const [templateFields, setTemplateFields] = useState<EvidenceTemplateField[]>([])
  const [customFields, setCustomFields] = useState<JobEvidenceField[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [subcategoryId, setSubcategoryId] = useState<string | null>(penetration.evidence_subcategory_id)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(penetration.field_values || {})
  const [label, setLabel] = useState(penetration.floorplan_label || '')
  const [buildingId, setBuildingId] = useState<string>('')
  const [levelId, setLevelId] = useState<string>(penetration.level_id || '')
  const [roomId, setRoomId] = useState<string>(penetration.room_id || '')

  // Initial load: subcategories (scoped to job's category), custom job fields, structure
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const supabase = createClient()
        const [subs, structure, customFieldsResult] = await Promise.all([
          getEvidenceSubcategories(evidenceCategoryId || undefined),
          getRoomsForJob(jobId),
          supabase
            .from('job_evidence_fields')
            .select('id, label, field_type, options, required, order_index, template_field_id')
            .eq('job_id', jobId)
            .order('order_index'),
        ])
        if (cancelled) return

        setSubcategories(subs)
        setBuildings(structure as Building[])
        setCustomFields((customFieldsResult.data || []) as JobEvidenceField[])

        // Resolve buildingId from levelId if penetration has a level
        if (penetration.level_id) {
          for (const b of structure as Building[]) {
            for (const l of b.levels) {
              if (l.id === penetration.level_id) {
                setBuildingId(b.id)
                break
              }
            }
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [jobId, evidenceCategoryId, penetration.level_id])

  // Load template fields when subcategory changes
  useEffect(() => {
    let cancelled = false
    async function loadTemplate() {
      if (!subcategoryId) {
        setTemplateFields([])
        return
      }
      try {
        const fields = await getTemplateFields(subcategoryId)
        if (!cancelled) setTemplateFields(fields)
      } catch {
        if (!cancelled) setTemplateFields([])
      }
    }
    loadTemplate()
    return () => { cancelled = true }
  }, [subcategoryId])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Custom fields exclude template-sourced ones (those are per-subcategory)
  const customOnlyFields = customFields.filter(f => !f.template_field_id)

  // Available levels from chosen building, then rooms from chosen level
  const availableLevels = buildings.find(b => b.id === buildingId)?.levels || []
  const availableRooms = availableLevels.find(l => l.id === levelId)?.rooms || []

  function setValue(fieldId: string, value: string) {
    setFieldValues(prev => ({ ...prev, [fieldId]: value }))
  }

  function renderFieldInput(
    fieldId: string,
    fieldType: 'text' | 'dropdown' | 'structure_level',
    options: string[] | null,
  ) {
    const current = fieldValues[fieldId] || ''
    if (fieldType === 'dropdown') {
      return (
        <div className="relative">
          <select
            value={current}
            onChange={e => setValue(fieldId, e.target.value)}
            className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Not set</option>
            {(options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      )
    }
    if (fieldType === 'structure_level') {
      const allLevels = buildings.flatMap(b => b.levels.map(l => ({ id: l.id, name: `${b.name} — ${l.name}` })))
      return (
        <div className="relative">
          <select
            value={current}
            onChange={e => setValue(fieldId, e.target.value)}
            className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Not set</option>
            {allLevels.map(l => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      )
    }
    return (
      <input
        type="text"
        value={current}
        onChange={e => setValue(fieldId, e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    )
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      // Drop empty values from field_values to keep storage clean
      const cleanedFieldValues: Record<string, string> = {}
      for (const [k, v] of Object.entries(fieldValues)) {
        if (v && v.trim() !== '') cleanedFieldValues[k] = v
      }
      await updatePenetration(penetration.id, {
        field_values: cleanedFieldValues,
        floorplan_label: label.trim() || null,
        evidence_subcategory_id: subcategoryId,
        room_id: roomId || null,
        level_id: levelId || null,
      })
      onSaved()
      onClose()
    } catch (e) {
      setError(friendlyError(e, "We couldn't save changes to this entry. Try again or refresh the page."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Edit evidence entry</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Loading…</p>
          ) : (
            <>
              {/* Subcategory */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
                <div className="relative">
                  <select
                    value={subcategoryId || ''}
                    onChange={e => setSubcategoryId(e.target.value || null)}
                    className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No type set</option>
                    {subcategories.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Template fields (per subcategory) */}
              {templateFields.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Default fields</p>
                  {templateFields.map(f => (
                    <div key={f.id}>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        {f.label}{f.required && <span className="text-red-500"> *</span>}
                      </label>
                      {renderFieldInput(f.id, f.field_type, f.options)}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom fields */}
              {customOnlyFields.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom fields</p>
                  {customOnlyFields.map(f => (
                    <div key={f.id}>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        {f.label}{f.required && <span className="text-red-500"> *</span>}
                      </label>
                      {renderFieldInput(f.id, f.field_type, f.options)}
                    </div>
                  ))}
                </div>
              )}

              {/* Pin label */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Pin label</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. 1, 1.1, A1"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  To reposition the pin on the floor plan, use the Drawings tab.
                </p>
              </div>

              {/* Location: building → level → room */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</p>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Building</label>
                  <div className="relative">
                    <select
                      value={buildingId}
                      onChange={e => {
                        setBuildingId(e.target.value)
                        setLevelId('')
                        setRoomId('')
                      }}
                      className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Unassigned</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {buildingId && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Level</label>
                    <div className="relative">
                      <select
                        value={levelId}
                        onChange={e => {
                          setLevelId(e.target.value)
                          setRoomId('')
                        }}
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select level…</option>
                        {availableLevels.map(l => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {levelId && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Room</label>
                    <div className="relative">
                      <select
                        value={roomId}
                        onChange={e => setRoomId(e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select room…</option>
                        {availableRooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
