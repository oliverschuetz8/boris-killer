'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateJob } from '@/app/actions/jobs'
import { Button } from '@/components/ui/button'
import {
  createEvidenceField,
  deleteEvidenceField,
  reorderEvidenceFields,
  type EvidenceField,
} from '@/lib/services/evidence-fields'
import {
  upsertJobMaterialDefault,
  deleteJobMaterialDefault,
  type JobMaterialDefault,
} from '@/lib/services/job-material-defaults'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

const STATE_OPTIONS = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']

interface Material {
  id: string
  name: string
  unit: string | null
  unit_price: number | null
}

interface Props {
  job: any
  customers: any[]
  materials: Material[]
  initialEvidenceFields: EvidenceField[]
  initialMaterialDefaults: any[]
}

export default function JobEditForm({
  job,
  customers,
  materials,
  initialEvidenceFields,
  initialMaterialDefaults,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toDatetimeLocal(dateStr: string | null) {
    if (!dateStr) return ''
    return new Date(dateStr).toISOString().slice(0, 16)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData(e.currentTarget)
      await updateJob(job.id, formData)
      router.push(`/jobs/${job.id}`)
      router.refresh()
    } catch {
      setError('Failed to update job. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="mb-2">
        <Link href={`/jobs/${job.id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block">
          ← Back to {job.title}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Job</h1>
        <p className="text-slate-500 mt-1">{job.job_number}</p>
      </div>

      {/* ── Core job fields ── */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              defaultValue={job.title}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              name="description"
              rows={3}
              defaultValue={job.description || ''}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Scheduled Start</label>
              <input
                name="scheduled_start"
                type="datetime-local"
                defaultValue={toDatetimeLocal(job.scheduled_start)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Scheduled End</label>
              <input
                name="scheduled_end"
                type="datetime-local"
                defaultValue={toDatetimeLocal(job.scheduled_end)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                name="status"
                defaultValue={job.status}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
              <select
                name="priority"
                defaultValue={job.priority}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Internal Notes</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={job.notes || ''}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Site Details */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 border-t border-slate-100 pt-4">Site Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Name</label>
              <input
                name="site_name"
                defaultValue={job.site_name ?? ''}
                placeholder="e.g. Head Office, Warehouse"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Street Address</label>
              <input
                name="site_address_line1"
                defaultValue={job.site_address_line1 ?? ''}
                placeholder="Street address"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input
                  name="site_city"
                  defaultValue={job.site_city ?? ''}
                  placeholder="Sydney"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                <select
                  name="site_state"
                  defaultValue={job.site_state ?? ''}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select…</option>
                  {STATE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Postcode</label>
                <input
                  name="site_postcode"
                  defaultValue={job.site_postcode ?? ''}
                  placeholder="2000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Manager</label>
                <input
                  name="site_manager"
                  defaultValue={job.site_manager ?? ''}
                  placeholder="e.g. John Smith"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Site Manager Phone</label>
                <input
                  name="site_manager_phone"
                  defaultValue={job.site_manager_phone ?? ''}
                  placeholder="e.g. 0412 345 678"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Link href={`/jobs/${job.id}`}>
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* ── Evidence Fields ── */}
      <EvidenceFieldsSection
        jobId={job.id}
        companyId={job.company_id}
        initialFields={initialEvidenceFields}
      />

      {/* ── Job Materials Setup ── */}
      <MaterialDefaultsSection
        jobId={job.id}
        companyId={job.company_id}
        materials={materials}
        initialDefaults={initialMaterialDefaults}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Evidence Fields Section
// ─────────────────────────────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  dropdown: 'Dropdown',
  structure_level: 'Level',
}

const FIELD_TYPE_COLOURS: Record<string, string> = {
  text: 'bg-slate-100 text-slate-600',
  dropdown: 'bg-blue-50 text-blue-700',
  structure_level: 'bg-purple-50 text-purple-700',
}

function EvidenceFieldsSection({
  jobId,
  companyId,
  initialFields,
}: {
  jobId: string
  companyId: string
  initialFields: EvidenceField[]
}) {
  const [fields, setFields] = useState<EvidenceField[]>(initialFields)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<'text' | 'dropdown' | 'structure_level'>('text')
  const [newOptions, setNewOptions] = useState<string[]>([])
  const [newOptionInput, setNewOptionInput] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetAddForm() {
    setNewLabel('')
    setNewType('text')
    setNewOptions([])
    setNewOptionInput('')
    setNewRequired(false)
    setShowAddForm(false)
    setError(null)
  }

  function addOption() {
    const trimmed = newOptionInput.trim()
    if (!trimmed || newOptions.includes(trimmed)) return
    setNewOptions(prev => [...prev, trimmed])
    setNewOptionInput('')
  }

  function removeOption(opt: string) {
    setNewOptions(prev => prev.filter(o => o !== opt))
  }

  async function handleAdd() {
    if (!newLabel.trim()) { setError('Field label is required'); return }
    if (newType === 'dropdown' && newOptions.length === 0) {
      setError('Add at least one option for a dropdown field')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await createEvidenceField(
        jobId,
        companyId,
        newLabel.trim(),
        newType,
        newOptions,
        newRequired,
        fields.length
      )
      setFields(prev => [...prev, created])
      resetAddForm()
    } catch {
      setError('Failed to add field')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this evidence field?')) return
    try {
      await deleteEvidenceField(id)
      const updated = fields
        .filter(f => f.id !== id)
        .map((f, i) => ({ ...f, order_index: i }))
      setFields(updated)
      if (updated.length > 0) {
        await reorderEvidenceFields(updated.map(f => ({ id: f.id, order_index: f.order_index })))
      }
    } catch {
      alert('Failed to delete field')
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const newFields = [...fields]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newFields.length) return
    ;[newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]]
    const reindexed = newFields.map((f, i) => ({ ...f, order_index: i }))
    setFields(reindexed)
    await reorderEvidenceFields(reindexed.map(f => ({ id: f.id, order_index: f.order_index })))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Evidence Fields</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure what workers fill in for each penetration on this job.
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </button>
        )}
      </div>

      {/* Field list */}
      {fields.length > 0 && (
        <div className="divide-y divide-slate-100">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 px-6 py-3">
              {/* Reorder buttons */}
              <div className="flex flex-col gap-0.5 mt-0.5 flex-shrink-0">
                <button
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === fields.length - 1}
                  className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Field info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800">{field.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FIELD_TYPE_COLOURS[field.field_type]}`}>
                    {FIELD_TYPE_LABELS[field.field_type]}
                  </span>
                  {field.required && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">
                      Required
                    </span>
                  )}
                </div>
                {field.field_type === 'dropdown' && field.options && field.options.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {field.options.join(', ')}
                  </p>
                )}
                {field.field_type === 'structure_level' && (
                  <p className="text-xs text-slate-400 mt-0.5">Pulls from job structure</p>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(field.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {fields.length === 0 && !showAddForm && (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-slate-500">No evidence fields configured yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Add fields to define what workers fill in for each penetration.
          </p>
        </div>
      )}

      {/* Add field form */}
      {showAddForm && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">New Field</p>

          {/* Label */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Barrier Type, Seal ID, Service"
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Field Type</label>
            <div className="flex gap-2">
              {(['text', 'dropdown', 'structure_level'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setNewType(type); setNewOptions([]) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    newType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}
                >
                  {type === 'text' ? 'Text Input' : type === 'dropdown' ? 'Dropdown' : 'Level (from structure)'}
                </button>
              ))}
            </div>
            {newType === 'structure_level' && (
              <p className="text-xs text-purple-600 mt-1.5">
                Workers will see the actual levels the admin set up in the Structure tab.
              </p>
            )}
          </div>

          {/* Options — only for dropdown */}
          {newType === 'dropdown' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Options <span className="text-red-500">*</span>
              </label>
              {newOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {newOptions.map(opt => (
                    <span key={opt} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {opt}
                      <button
                        type="button"
                        onClick={() => removeOption(opt)}
                        className="text-blue-400 hover:text-blue-700 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOptionInput}
                  onChange={e => setNewOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Type an option and press Enter"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Required toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNewRequired(r => !r)}
              className={`relative w-9 h-5 rounded-full transition-colors ${newRequired ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${newRequired ? 'translate-x-4' : ''}`} />
            </button>
            <span className="text-xs font-medium text-slate-600">Required field</span>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              {saving ? 'Adding…' : 'Add Field'}
            </button>
            <button
              type="button"
              onClick={resetAddForm}
              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Job Materials Setup Section
// ─────────────────────────────────────────────────────────────

function MaterialDefaultsSection({
  jobId,
  companyId,
  materials,
  initialDefaults,
}: {
  jobId: string
  companyId: string
  materials: Material[]
  initialDefaults: any[]
}) {
  const [defaults, setDefaults] = useState<any[]>(initialDefaults)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMaterialId, setNewMaterialId] = useState('')
  const [newSealId, setNewSealId] = useState('')
  const [newManufacturer, setNewManufacturer] = useState('')
  const [newSystemProduct, setNewSystemProduct] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usedMaterialIds = new Set(defaults.map(d => d.material_id))
  const availableMaterials = materials.filter(m => !usedMaterialIds.has(m.id))

  function resetAddForm() {
    setNewMaterialId('')
    setNewSealId('')
    setNewManufacturer('')
    setNewSystemProduct('')
    setShowAddForm(false)
    setError(null)
  }

  async function handleAdd() {
    if (!newMaterialId) { setError('Select a material'); return }
    setSaving(true)
    setError(null)
    try {
      const created = await upsertJobMaterialDefault(jobId, companyId, newMaterialId, {
        seal_id: newSealId,
        manufacturer: newManufacturer,
        system_product: newSystemProduct,
      })
      setDefaults(prev => [...prev, created])
      resetAddForm()
    } catch {
      setError('Failed to add material')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this material from the job setup?')) return
    try {
      await deleteJobMaterialDefault(id)
      setDefaults(prev => prev.filter(d => d.id !== id))
    } catch {
      alert('Failed to remove material')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Job Materials Setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configure materials for this job. Workers pick from these — details auto-attach.
          </p>
        </div>
        {!showAddForm && availableMaterials.length > 0 && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Material
          </button>
        )}
      </div>

      {/* Material list */}
      {defaults.length > 0 && (
        <div className="divide-y divide-slate-100">
          {defaults.map(d => (
            <div key={d.id} className="flex items-start gap-3 px-6 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">
                  {d.material?.name ?? 'Unknown material'}
                </p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {d.seal_id && (
                    <span className="text-xs text-slate-500">
                      Seal: <span className="font-medium text-slate-700">{d.seal_id}</span>
                    </span>
                  )}
                  {d.manufacturer && (
                    <span className="text-xs text-slate-500">
                      Mfg: <span className="font-medium text-slate-700">{d.manufacturer}</span>
                    </span>
                  )}
                  {d.system_product && (
                    <span className="text-xs text-slate-500">
                      System: <span className="font-medium text-slate-700">{d.system_product}</span>
                    </span>
                  )}
                  {!d.seal_id && !d.manufacturer && !d.system_product && (
                    <span className="text-xs text-slate-400">No extra details</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(d.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {defaults.length === 0 && !showAddForm && (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-slate-500">No materials configured for this job yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Add materials from your catalogue and pre-fill details workers shouldn't have to know.
          </p>
        </div>
      )}

      {/* No materials in catalogue */}
      {materials.length === 0 && (
        <div className="px-6 pb-4 pt-2 text-center">
          <p className="text-xs text-slate-400">
            No materials in your catalogue yet. Add materials in{' '}
            <Link href="/settings/materials" className="text-blue-600 hover:underline">
              Settings → Materials
            </Link>
            .
          </p>
        </div>
      )}

      {/* Add material form */}
      {showAddForm && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Add Material</p>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Material <span className="text-red-500">*</span>
            </label>
            <select
              value={newMaterialId}
              onChange={e => setNewMaterialId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select material…</option>
              {availableMaterials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.unit ? ` (${m.unit})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Seal ID</label>
              <input
                type="text"
                value={newSealId}
                onChange={e => setNewSealId(e.target.value)}
                placeholder="e.g. FP-201"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Manufacturer</label>
              <input
                type="text"
                value={newManufacturer}
                onChange={e => setNewManufacturer(e.target.value)}
                placeholder="e.g. Hilti"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">System / Product</label>
              <input
                type="text"
                value={newSystemProduct}
                onChange={e => setNewSystemProduct(e.target.value)}
                placeholder="e.g. CP 606 Flex"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              {saving ? 'Adding…' : 'Add Material'}
            </button>
            <button
              type="button"
              onClick={resetAddForm}
              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}