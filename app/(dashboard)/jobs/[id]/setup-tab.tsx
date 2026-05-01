'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, ChevronUp, ChevronDown, UserPlus, X, Layers, Package } from 'lucide-react'
import {
  createEvidenceField,
  deleteEvidenceField,
  reorderEvidenceFields,
  type EvidenceField,
} from '@/lib/services/evidence-fields'
import {
  upsertJobMaterialDefault,
  deleteJobMaterialDefault,
} from '@/lib/services/job-material-defaults'
import {
  assignWorker,
  unassignWorker,
} from '@/lib/services/job-assignments'

interface Material {
  id: string
  name: string
  unit: string | null
  unit_price: number | null
}

interface PartItem {
  id: string
  name: string
  unit: string
  sell_price: number | null
  subcategory: string | null
}

interface ProductItem {
  id: string
  name: string
  total_sell_price: number | null
  description: string | null
  product_parts?: any[]
}

interface CompanyWorker {
  id: string
  full_name: string | null
  email: string
  role: string
  trade: string | null
}

interface Assignment {
  id: string
  role: string | null
  user: {
    id: string
    full_name: string | null
    email: string
    role: string
  }
}

interface SetupTabProps {
  jobId: string
  companyId: string
  materials: Material[]
  parts: PartItem[]
  products: ProductItem[]
  initialEvidenceFields: EvidenceField[]
  initialMaterialDefaults: any[]
  companyWorkers: CompanyWorker[]
  initialAssignments: Assignment[]
  evidenceCategoryId?: string | null
}

export default function SetupTab({
  jobId,
  companyId,
  materials,
  parts,
  products,
  initialEvidenceFields,
  initialMaterialDefaults,
  companyWorkers,
  initialAssignments,
}: SetupTabProps) {
  return (
    <div className="space-y-6">
      <AssignmentsSection
        jobId={jobId}
        companyId={companyId}
        companyWorkers={companyWorkers}
        initialAssignments={initialAssignments}
      />

      <EvidenceFieldsSection
        jobId={jobId}
        companyId={companyId}
        initialFields={initialEvidenceFields}
      />

      <MaterialDefaultsSection
        jobId={jobId}
        companyId={companyId}
        materials={materials}
        parts={parts}
        products={products}
        initialDefaults={initialMaterialDefaults}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Worker Assignments Section
// ─────────────────────────────────────────────────────────────

function AssignmentsSection({
  jobId,
  companyId,
  companyWorkers,
  initialAssignments,
}: {
  jobId: string
  companyId: string
  companyWorkers: CompanyWorker[]
  initialAssignments: Assignment[]
}) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const assignedUserIds = new Set(assignments.map(a => a.user.id))
  const availableWorkers = companyWorkers.filter(w => !assignedUserIds.has(w.id))

  async function handleAssign() {
    if (!selectedUserId) return
    setAssigning(true)
    setError(null)
    try {
      const result = await assignWorker(jobId, selectedUserId, companyId)
      setAssignments(prev => [...prev, {
        id: result.id,
        role: result.role,
        user: result.user,
      }])
      setSelectedUserId('')
    } catch {
      setError('Failed to assign worker')
    } finally {
      setAssigning(false)
    }
  }

  async function handleUnassign(userId: string) {
    setRemovingId(userId)
    setError(null)
    try {
      await unassignWorker(jobId, userId)
      setAssignments(prev => prev.filter(a => a.user.id !== userId))
    } catch {
      setError('Failed to remove worker')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Worker Assignments</h2>
        <p className="text-xs text-slate-500 mt-0.5">Assign workers to this job. Changes save immediately.</p>
      </div>

      {assignments.length > 0 && (
        <div className="divide-y divide-slate-100">
          {assignments.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-6 py-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-slate-600">
                  {a.user.full_name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{a.user.full_name}</p>
                <p className="text-xs text-slate-500">{a.user.email}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">
                {a.role || 'worker'}
              </span>
              <button
                onClick={() => handleUnassign(a.user.id)}
                disabled={removingId === a.user.id}
                className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {availableWorkers.length === 0 && companyWorkers.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">All workers have been assigned to this job.</p>
        </div>
      )}
      {availableWorkers.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full px-3 h-10 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select worker...</option>
                  {availableWorkers.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.full_name || w.email}{w.trade ? ` — ${w.trade}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <button
              onClick={handleAssign}
              disabled={!selectedUserId || assigning}
              className="flex items-center gap-1.5 px-4 h-10 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors flex-shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {assigning ? 'Adding...' : 'Assign'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-6 py-3 border-t border-slate-100">
          <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        </div>
      )}
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
  const [newDefaultValue, setNewDefaultValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetAddForm() {
    setNewLabel('')
    setNewType('text')
    setNewOptions([])
    setNewOptionInput('')
    setNewRequired(false)
    setNewDefaultValue('')
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
      setError('Add at least one option for a dropdown field'); return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await createEvidenceField(
        jobId, companyId, newLabel.trim(), newType, newOptions, newRequired, fields.length,
        newDefaultValue.trim() || null,
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
      const updated = fields.filter(f => f.id !== id).map((f, i) => ({ ...f, order_index: i }))
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Evidence Fields</h2>
          <p className="text-xs text-slate-500 mt-0.5">Add custom fields for workers. Template questions load automatically based on each penetration's subcategory.</p>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Field
          </button>
        )}
      </div>

      {fields.length > 0 && (
        <div className="divide-y divide-slate-100">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 px-6 py-3">
              <div className="flex flex-col gap-0.5 mt-0.5 flex-shrink-0">
                <button onClick={() => handleMove(index, 'up')} disabled={index === 0}
                  className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleMove(index, 'down')} disabled={index === fields.length - 1}
                  className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800">{field.label}</span>
                {field.field_type === 'dropdown' && field.options && field.options.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{field.options.join(', ')}</p>
                )}
                {field.field_type === 'structure_level' && (
                  <p className="text-xs text-slate-400 mt-0.5">Pulls from job structure</p>
                )}
                {field.default_value && (
                  <p className="text-xs text-blue-500 mt-0.5">Default: {field.default_value}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {field.template_field_id && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">Default</span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FIELD_TYPE_COLOURS[field.field_type]}`}>
                  {FIELD_TYPE_LABELS[field.field_type]}
                </span>
                {field.required && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Required</span>
                )}
                <button onClick={() => handleDelete(field.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && !showAddForm && (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-slate-500">No evidence fields configured yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add fields to define what workers fill in for each penetration.</p>
        </div>
      )}

      {showAddForm && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">New Field</p>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Field Label <span className="text-red-500">*</span>
            </label>
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Barrier Type, Seal ID, Service" autoFocus
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Field Type</label>
            <div className="flex gap-2 flex-wrap">
              {(['text', 'dropdown', 'structure_level'] as const).map(type => (
                <button key={type} type="button"
                  onClick={() => { setNewType(type); setNewOptions([]) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    newType === type
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}>
                  {type === 'text' ? 'Text Input' : type === 'dropdown' ? 'Dropdown' : 'Level (from structure)'}
                </button>
              ))}
            </div>
            {newType === 'structure_level' && (
              <p className="text-xs text-purple-600 mt-1.5">
                Workers will see the actual levels set up in the Structure tab.
              </p>
            )}
          </div>

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
                      <button type="button" onClick={() => removeOption(opt)}
                        className="text-blue-400 hover:text-blue-700 ml-0.5">x</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={newOptionInput}
                  onChange={e => setNewOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Type an option and press Enter"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="button" onClick={addOption}
                  className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors">
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={newRequired}
              onChange={e => setNewRequired(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
            <span className="text-xs font-medium text-slate-600">Required field</span>
          </div>

          {/* Default Answer */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Default Answer <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            {newType === 'dropdown' && newOptions.length > 0 ? (
              <div className="relative">
                <select
                  value={newDefaultValue}
                  onChange={e => setNewDefaultValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                >
                  <option value="">No default</option>
                  {newOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            ) : newType === 'text' ? (
              <input
                type="text"
                value={newDefaultValue}
                onChange={e => setNewDefaultValue(e.target.value)}
                placeholder="Pre-filled value for workers"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : null}
            <p className="text-xs text-slate-400 mt-1">
              Workers will see this value pre-filled but can change it.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
              {saving ? 'Adding...' : 'Add Field'}
            </button>
            <button type="button" onClick={resetAddForm}
              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Job Materials Setup Section (Parts & Products)
// ─────────────────────────────────────────────────────────────

function MaterialDefaultsSection({
  jobId,
  companyId,
  materials,
  parts,
  products,
  initialDefaults,
}: {
  jobId: string
  companyId: string
  materials: Material[]
  parts: PartItem[]
  products: ProductItem[]
  initialDefaults: any[]
}) {
  const [defaults, setDefaults] = useState<any[]>(initialDefaults)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedType, setSelectedType] = useState<'part' | 'product' | 'legacy' | 'manual'>('part')
  const [selectedId, setSelectedId] = useState('')
  const [newManualName, setNewManualName] = useState('')
  const [newSealId, setNewSealId] = useState('')
  const [newManufacturer, setNewManufacturer] = useState('')
  const [newSystemProduct, setNewSystemProduct] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usedPartIds = new Set(defaults.filter((d: any) => d.part_id).map((d: any) => d.part_id))
  const usedProductIds = new Set(defaults.filter((d: any) => d.product_id).map((d: any) => d.product_id))
  const usedMaterialIds = new Set(defaults.filter((d: any) => d.material_id).map((d: any) => d.material_id))

  const availableParts = parts.filter(p => !usedPartIds.has(p.id))
  const availableProducts = products.filter(p => !usedProductIds.has(p.id))
  const availableMaterials = materials.filter(m => !usedMaterialIds.has(m.id))

  const hasParts = parts.length > 0
  const hasProducts = products.length > 0

  function resetAddForm() {
    setSelectedType('part')
    setSelectedId('')
    setNewManualName('')
    setNewSealId('')
    setNewManufacturer('')
    setNewSystemProduct('')
    setShowAddForm(false)
    setError(null)
  }

  async function handleAdd() {
    if (selectedType === 'manual' && !newManualName.trim()) { setError('Enter a name'); return }
    if (selectedType !== 'manual' && !selectedId) { setError('Select an item'); return }

    setSaving(true)
    setError(null)
    try {
      const materialId = selectedType === 'legacy' ? selectedId : null
      const partId = selectedType === 'part' ? selectedId : null
      const productId = selectedType === 'product' ? selectedId : null
      const nameOverride = selectedType === 'manual' ? newManualName.trim() : null

      const created = await upsertJobMaterialDefault(jobId, companyId, materialId, nameOverride, {
        seal_id: newSealId,
        manufacturer: newManufacturer,
        system_product: newSystemProduct,
        part_id: partId,
        product_id: productId,
      })
      setDefaults(prev => [...prev, created])
      resetAddForm()
    } catch {
      setError('Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this item from the job setup?')) return
    try {
      await deleteJobMaterialDefault(id)
      setDefaults(prev => prev.filter((d: any) => d.id !== id))
    } catch {
      alert('Failed to remove item')
    }
  }

  function getItemName(d: any): string {
    if (d.part?.name) return d.part.name
    if (d.product?.name) return d.product.name
    if (d.material?.name) return d.material.name
    if (d.material_name_override) return d.material_name_override
    return 'Unknown'
  }

  function getItemType(d: any): 'part' | 'product' | 'legacy' | 'manual' {
    if (d.part_id) return 'part'
    if (d.product_id) return 'product'
    if (d.material_id) return 'legacy'
    return 'manual'
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Job Materials Setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-configure parts and products for this job. Workers pick from these during execution.
          </p>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        )}
      </div>

      {defaults.length > 0 && (
        <div className="divide-y divide-slate-100">
          {defaults.map((d: any) => {
            const itemType = getItemType(d)
            return (
              <div key={d.id} className="flex items-start gap-3 px-6 py-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  itemType === 'product' ? 'bg-indigo-50' : 'bg-blue-50'
                }`}>
                  {itemType === 'product'
                    ? <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    : <Package className="w-3.5 h-3.5 text-blue-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {getItemName(d)}
                    {itemType === 'product' && (
                      <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">Product</span>
                    )}
                    {itemType === 'legacy' && (
                      <span className="ml-2 text-xs font-normal text-slate-400">(legacy)</span>
                    )}
                    {itemType === 'manual' && (
                      <span className="ml-2 text-xs font-normal text-slate-400">(manual)</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1">
                    {d.seal_id && (
                      <span className="text-xs text-slate-500">Seal: <span className="font-medium text-slate-700">{d.seal_id}</span></span>
                    )}
                    {d.manufacturer && (
                      <span className="text-xs text-slate-500">Mfg: <span className="font-medium text-slate-700">{d.manufacturer}</span></span>
                    )}
                    {d.system_product && (
                      <span className="text-xs text-slate-500">System: <span className="font-medium text-slate-700">{d.system_product}</span></span>
                    )}
                    {!d.seal_id && !d.manufacturer && !d.system_product && (
                      <span className="text-xs text-slate-400">No extra details</span>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(d.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {defaults.length === 0 && !showAddForm && (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-slate-500">No materials configured for this job yet.</p>
          <p className="text-xs text-slate-400 mt-1">
            Add parts or products from your catalogue. Workers will pick from these during execution.
          </p>
        </div>
      )}

      {!hasParts && !hasProducts && !showAddForm && (
        <div className="px-6 pb-4 text-center">
          <p className="text-xs text-slate-400">
            No parts or products in your catalogue.{' '}
            <Link href="/settings/parts" className="text-blue-600 hover:underline">
              Add parts in Settings.
            </Link>
          </p>
        </div>
      )}

      {showAddForm && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Add Item</p>

          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
            <div className="flex gap-2 flex-wrap">
              {hasParts && (
                <button type="button" onClick={() => { setSelectedType('part'); setSelectedId('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedType === 'part' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                  }`}>
                  Part
                </button>
              )}
              {hasProducts && (
                <button type="button" onClick={() => { setSelectedType('product'); setSelectedId('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedType === 'product' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:border-indigo-400'
                  }`}>
                  Product
                </button>
              )}
              {availableMaterials.length > 0 && (
                <button type="button" onClick={() => { setSelectedType('legacy'); setSelectedId('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedType === 'legacy' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}>
                  Legacy Material
                </button>
              )}
              <button type="button" onClick={() => { setSelectedType('manual'); setSelectedId('') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedType === 'manual' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}>
                + Manual
              </button>
            </div>
          </div>

          {/* Item selector */}
          {selectedType === 'part' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Part <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select part...</option>
                  {availableParts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.subcategory ? ` (${p.subcategory})` : ''}{p.unit ? ` — ${p.unit}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {selectedType === 'product' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Product <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select product...</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.description ? ` — ${p.description}` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {selectedType === 'legacy' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Material <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select material...</option>
                  {availableMaterials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.unit ? ` (${m.unit})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}

          {selectedType === 'manual' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={newManualName} onChange={e => setNewManualName(e.target.value)}
                placeholder="e.g. 50mm Rockwool Batt" autoFocus
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-slate-400 mt-1">This name is job-specific and won't be added to your catalogue.</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Seal ID</label>
              <input type="text" value={newSealId} onChange={e => setNewSealId(e.target.value)}
                placeholder="e.g. FP-201"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Manufacturer</label>
              <input type="text" value={newManufacturer} onChange={e => setNewManufacturer(e.target.value)}
                placeholder="e.g. Hilti"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">System / Product</label>
              <input type="text" value={newSystemProduct} onChange={e => setNewSystemProduct(e.target.value)}
                placeholder="e.g. CP 606 Flex"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
              {saving ? 'Adding...' : 'Add Item'}
            </button>
            <button type="button" onClick={resetAddForm}
              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
