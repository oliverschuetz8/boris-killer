'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, ChevronRight,
  Pencil, X, Check, Layers, FileText,
} from 'lucide-react'
import {
  getEvidenceCategories,
  getEvidenceSubcategories,
  getTemplateFields,
  createEvidenceCategory,
  updateEvidenceCategory,
  deleteEvidenceCategory,
  createEvidenceSubcategory,
  updateEvidenceSubcategory,
  deleteEvidenceSubcategory,
  createTemplateField,
  updateTemplateField,
  deleteTemplateField,
  reorderTemplateFields,
  type EvidenceCategory,
  type EvidenceSubcategory,
  type EvidenceTemplateField,
} from '@/lib/services/evidence-categories'

interface Props {
  companyId: string
}

export default function EvidenceSettingsView({ companyId }: Props) {
  const [categories, setCategories] = useState<EvidenceCategory[]>([])
  const [subcategories, setSubcategories] = useState<Record<string, EvidenceSubcategory[]>>({})
  const [templateFields, setTemplateFields] = useState<Record<string, EvidenceTemplateField[]>>({})
  const [loading, setLoading] = useState(true)

  // Expansion state
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set())

  // Add forms
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // Edit inline
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editingSubName, setEditingSubName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const cats = await getEvidenceCategories()
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function loadSubcategories(categoryId: string) {
    const subs = await getEvidenceSubcategories(categoryId)
    setSubcategories(prev => ({ ...prev, [categoryId]: subs }))
  }

  async function loadTemplateFieldsForSub(subcategoryId: string) {
    const fields = await getTemplateFields(subcategoryId)
    setTemplateFields(prev => ({ ...prev, [subcategoryId]: fields }))
  }

  function toggleCat(catId: string) {
    const next = new Set(expandedCats)
    if (next.has(catId)) {
      next.delete(catId)
    } else {
      next.add(catId)
      if (!subcategories[catId]) loadSubcategories(catId)
    }
    setExpandedCats(next)
  }

  function toggleSub(subId: string) {
    const next = new Set(expandedSubs)
    if (next.has(subId)) {
      next.delete(subId)
    } else {
      next.add(subId)
      if (!templateFields[subId]) loadTemplateFieldsForSub(subId)
    }
    setExpandedSubs(next)
  }

  // ─── Category CRUD ─────────────────────────────────────────

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    try {
      const created = await createEvidenceCategory(companyId, newCatName.trim(), categories.length)
      setCategories(prev => [...prev, created])
      setNewCatName('')
      setShowAddCategory(false)
    } catch {
      alert('Failed to add category')
    }
  }

  async function handleSaveCatEdit(catId: string) {
    if (!editingCatName.trim()) return
    try {
      await updateEvidenceCategory(catId, { name: editingCatName.trim() })
      setCategories(prev => prev.map(c => c.id === catId ? { ...c, name: editingCatName.trim() } : c))
      setEditingCatId(null)
    } catch {
      alert('Failed to update category')
    }
  }

  async function handleDeleteCategory(catId: string) {
    if (!confirm('Delete this category and ALL its subcategories and template fields? This cannot be undone.')) return
    try {
      await deleteEvidenceCategory(catId)
      setCategories(prev => prev.filter(c => c.id !== catId))
    } catch {
      alert('Failed to delete category')
    }
  }

  // ─── Subcategory CRUD ──────────────────────────────────────

  async function handleAddSubcategory(categoryId: string, name: string) {
    const subs = subcategories[categoryId] || []
    try {
      const created = await createEvidenceSubcategory(companyId, categoryId, name, subs.length)
      setSubcategories(prev => ({ ...prev, [categoryId]: [...(prev[categoryId] || []), created] }))
    } catch {
      alert('Failed to add subcategory')
    }
  }

  async function handleSaveSubEdit(subId: string) {
    if (!editingSubName.trim()) return
    try {
      await updateEvidenceSubcategory(subId, { name: editingSubName.trim() })
      // Update in state
      const updated = { ...subcategories }
      for (const catId of Object.keys(updated)) {
        updated[catId] = updated[catId].map(s => s.id === subId ? { ...s, name: editingSubName.trim() } : s)
      }
      setSubcategories(updated)
      setEditingSubId(null)
    } catch {
      alert('Failed to update subcategory')
    }
  }

  async function handleDeleteSubcategory(categoryId: string, subId: string) {
    if (!confirm('Delete this subcategory and all its template fields?')) return
    try {
      await deleteEvidenceSubcategory(subId)
      setSubcategories(prev => ({
        ...prev,
        [categoryId]: (prev[categoryId] || []).filter(s => s.id !== subId),
      }))
    } catch {
      alert('Failed to delete subcategory')
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-6">
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Settings
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Evidence Categories</h1>
        </div>
        <div className="text-sm text-slate-400 py-12 text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Settings
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Evidence Categories</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure job categories, subcategories, and default evidence questions.
          </p>
        </div>
        {!showAddCategory && (
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        )}
      </div>

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">New Category</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Certification, Inspection"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleAddCategory} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              Add
            </button>
            <button onClick={() => { setShowAddCategory(false); setNewCatName('') }} className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      {categories.length === 0 && !showAddCategory && (
        <div className="bg-white rounded-xl border border-slate-200 px-6 py-12 text-center">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No evidence categories yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add categories like "Certification" or "Inspection" to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {categories.map(cat => {
          const isExpanded = expandedCats.has(cat.id)
          const subs = subcategories[cat.id] || []

          return (
            <div key={cat.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Category Header */}
              <div className="flex items-center gap-3 px-6 py-4">
                <button onClick={() => toggleCat(cat.id)} className="flex-shrink-0">
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {editingCatId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingCatName}
                      onChange={e => setEditingCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveCatEdit(cat.id)}
                      autoFocus
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={() => handleSaveCatEdit(cat.id)} className="p-1.5 text-green-600 hover:text-green-700">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingCatId(null)} className="p-1.5 text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => toggleCat(cat.id)} className="flex-1 text-left">
                      <span className="text-sm font-semibold text-slate-800">{cat.name}</span>
                    </button>
                    <button
                      onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }}
                      className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteCategory(cat.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Subcategories */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {subs.map(sub => (
                    <SubcategoryRow
                      key={sub.id}
                      sub={sub}
                      categoryId={cat.id}
                      companyId={companyId}
                      isExpanded={expandedSubs.has(sub.id)}
                      onToggle={() => toggleSub(sub.id)}
                      fields={templateFields[sub.id] || []}
                      onFieldsChange={(fields) => setTemplateFields(prev => ({ ...prev, [sub.id]: fields }))}
                      editingSubId={editingSubId}
                      editingSubName={editingSubName}
                      onStartEdit={() => { setEditingSubId(sub.id); setEditingSubName(sub.name) }}
                      onSaveEdit={() => handleSaveSubEdit(sub.id)}
                      onCancelEdit={() => setEditingSubId(null)}
                      onEditNameChange={setEditingSubName}
                      onDelete={() => handleDeleteSubcategory(cat.id, sub.id)}
                    />
                  ))}

                  <AddSubcategoryRow categoryId={cat.id} onAdd={handleAddSubcategory} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Subcategory Row
// ─────────────────────────────────────────────────────────────

function SubcategoryRow({
  sub,
  categoryId,
  companyId,
  isExpanded,
  onToggle,
  fields,
  onFieldsChange,
  editingSubId,
  editingSubName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onDelete,
}: {
  sub: EvidenceSubcategory
  categoryId: string
  companyId: string
  isExpanded: boolean
  onToggle: () => void
  fields: EvidenceTemplateField[]
  onFieldsChange: (fields: EvidenceTemplateField[]) => void
  editingSubId: string | null
  editingSubName: string
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onEditNameChange: (name: string) => void
  onDelete: () => void
}) {
  const isEditing = editingSubId === sub.id

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-3 px-6 py-3 bg-slate-50/50 ml-6">
        <button onClick={onToggle} className="flex-shrink-0">
          <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
        </button>

        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editingSubName}
              onChange={e => onEditNameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSaveEdit()}
              autoFocus
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={onSaveEdit} className="p-1.5 text-green-600 hover:text-green-700">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onToggle} className="flex-1 text-left">
              <span className="text-sm font-medium text-slate-700">{sub.name}</span>
              <span className="text-xs text-slate-400 ml-2">{fields.length > 0 ? `${fields.length} fields` : ''}</span>
            </button>
            <button onClick={onStartEdit} className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={onDelete} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Template Fields */}
      {isExpanded && (
        <div className="ml-12 border-t border-slate-100">
          <TemplateFieldsEditor
            subcategoryId={sub.id}
            companyId={companyId}
            fields={fields}
            onFieldsChange={onFieldsChange}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Add Subcategory Row
// ─────────────────────────────────────────────────────────────

function AddSubcategoryRow({
  categoryId,
  onAdd,
}: {
  categoryId: string
  onAdd: (categoryId: string, name: string) => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onAdd(categoryId, name.trim())
      setName('')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-6 py-2.5 ml-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 transition-colors w-full"
      >
        <Plus className="w-3 h-3" /> Add Subcategory
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-6 py-2.5 ml-6 bg-slate-50">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Subcategory name..."
        autoFocus
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button onClick={handleAdd} disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
        {saving ? 'Adding...' : 'Add'}
      </button>
      <button onClick={() => { setShowForm(false); setName('') }} className="px-3 py-1.5 text-slate-500 text-xs hover:text-slate-700 transition-colors">
        Cancel
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Template Fields Editor (reuses setup-tab pattern)
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

function TemplateFieldsEditor({
  subcategoryId,
  companyId,
  fields,
  onFieldsChange,
}: {
  subcategoryId: string
  companyId: string
  fields: EvidenceTemplateField[]
  onFieldsChange: (fields: EvidenceTemplateField[]) => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<'text' | 'dropdown' | 'structure_level'>('text')
  const [newOptions, setNewOptions] = useState<string[]>([])
  const [newOptionInput, setNewOptionInput] = useState('')
  const [newRequired, setNewRequired] = useState(false)
  const [newDefaultValue, setNewDefaultValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
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

  async function handleAdd() {
    if (!newLabel.trim()) { setError('Label is required'); return }
    if (newType === 'dropdown' && newOptions.length === 0) { setError('Add at least one option'); return }
    setSaving(true)
    setError(null)
    try {
      const created = await createTemplateField(
        companyId, subcategoryId, newLabel.trim(), newType, newOptions, newRequired, fields.length,
        newDefaultValue.trim() || null,
      )
      onFieldsChange([...fields, created])
      resetForm()
    } catch {
      setError('Failed to add field')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this template field?')) return
    try {
      await deleteTemplateField(id)
      const updated = fields.filter(f => f.id !== id).map((f, i) => ({ ...f, sort_order: i }))
      onFieldsChange(updated)
      if (updated.length > 0) {
        await reorderTemplateFields(updated.map(f => ({ id: f.id, sort_order: f.sort_order })))
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
    const reindexed = newFields.map((f, i) => ({ ...f, sort_order: i }))
    onFieldsChange(reindexed)
    await reorderTemplateFields(reindexed.map(f => ({ id: f.id, sort_order: f.sort_order })))
  }

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Default Questions ({fields.length})
        </p>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-3 h-3" /> Add Field
          </button>
        )}
      </div>

      {fields.length > 0 && (
        <div className="divide-y divide-slate-100">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-3 px-6 py-2.5">
              <div className="flex flex-col gap-0.5 mt-0.5 flex-shrink-0">
                <button onClick={() => handleMove(index, 'up')} disabled={index === 0}
                  className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={() => handleMove(index, 'down')} disabled={index === fields.length - 1}
                  className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-800">{field.label}</span>
                {field.field_type === 'dropdown' && field.options && field.options.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{field.options.join(', ')}</p>
                )}
                {field.default_value && (
                  <p className="text-xs text-blue-500 mt-0.5">Default: {field.default_value}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FIELD_TYPE_COLOURS[field.field_type]}`}>
                  {FIELD_TYPE_LABELS[field.field_type]}
                </span>
                {field.required && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600">Required</span>
                )}
                <button onClick={() => handleDelete(field.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fields.length === 0 && !showAddForm && (
        <div className="px-6 py-6 text-center">
          <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1" />
          <p className="text-xs text-slate-400">No default questions yet.</p>
        </div>
      )}

      {showAddForm && (
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">New Field</p>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Label <span className="text-red-500">*</span>
            </label>
            <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Service Type, Barrier Type" autoFocus
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
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
          </div>

          {newType === 'dropdown' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Options <span className="text-red-500">*</span>
              </label>
              {newOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {newOptions.map(opt => (
                    <span key={opt} className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {opt}
                      <button type="button" onClick={() => setNewOptions(prev => prev.filter(o => o !== opt))}
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
            <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)}
              className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
            <span className="text-xs font-medium text-slate-600">Required field</span>
          </div>

          {/* Default Answer */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Default Answer <span className="text-xs font-normal text-slate-400">(optional)</span>
            </label>
            {newType === 'dropdown' && newOptions.length > 0 ? (
              <div className="relative">
                <select value={newDefaultValue} onChange={e => setNewDefaultValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10">
                  <option value="">No default</option>
                  {newOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            ) : newType === 'text' ? (
              <input type="text" value={newDefaultValue} onChange={e => setNewDefaultValue(e.target.value)}
                placeholder="Pre-filled value for workers"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            ) : null}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors">
              {saving ? 'Adding...' : 'Add Field'}
            </button>
            <button type="button" onClick={resetForm}
              className="px-4 py-2 text-slate-500 text-sm hover:text-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
