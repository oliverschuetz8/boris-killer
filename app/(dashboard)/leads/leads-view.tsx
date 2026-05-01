'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target, Plus, Trash2, Loader2, Search, X, ChevronDown,
  Users, UserCheck, TrendingUp, AlertCircle, Percent,
} from 'lucide-react'
import {
  createLead, updateLead, deleteLead,
  type Lead, type LeadStats,
} from '@/lib/services/leads'

// ---------------------------------------------------------------------------
// Status & source badge config
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  qualified: 'bg-amber-100 text-amber-800',
  converted: 'bg-green-100 text-green-800',
  lost: 'bg-gray-100 text-gray-600',
}

const SOURCE_STYLES: Record<string, string> = {
  website: 'bg-blue-50 text-blue-700',
  referral: 'bg-purple-50 text-purple-700',
  manual: 'bg-slate-100 text-slate-600',
  zapier: 'bg-orange-50 text-orange-700',
  n8n: 'bg-red-50 text-red-700',
}

const STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const
const SOURCES = ['website', 'referral', 'manual', 'zapier', 'n8n'] as const

function formatStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  leads: Lead[]
  stats: LeadStats
  userRole: string
}

export default function LeadsView({
  leads: initialLeads,
  stats: initialStats,
  userRole,
}: Props) {
  const router = useRouter()

  // Data state
  const [leads, setLeads] = useState(initialLeads)
  const [stats, setStats] = useState(initialStats)

  // Filter state
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [search, setSearch] = useState('')

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [busy, setBusy] = useState(false)

  // Add form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formCompany, setFormCompany] = useState('')
  const [formSource, setFormSource] = useState('manual')
  const [formMessage, setFormMessage] = useState('')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editMessage, setEditMessage] = useState('')

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  const filteredLeads = leads.filter(lead => {
    if (filterStatus && lead.status !== filterStatus) return false
    if (filterSource && lead.source !== filterSource) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !lead.name.toLowerCase().includes(q) &&
        !lead.email.toLowerCase().includes(q) &&
        !(lead.company_name || '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  // -------------------------------------------------------------------------
  // Add lead
  // -------------------------------------------------------------------------

  function resetAddForm() {
    setFormName('')
    setFormEmail('')
    setFormPhone('')
    setFormCompany('')
    setFormSource('manual')
    setFormMessage('')
  }

  async function handleAddLead() {
    if (!formName.trim() || !formEmail.trim()) return
    setBusy(true)
    try {
      const lead = await createLead({
        name: formName.trim(),
        email: formEmail.trim(),
        phone: formPhone.trim() || undefined,
        company_name: formCompany.trim() || undefined,
        source: formSource,
        message: formMessage.trim() || undefined,
      })
      setLeads(prev => [lead, ...prev])
      setStats(prev => ({
        ...prev,
        total: prev.total + 1,
        new: prev.new + 1,
      }))
      resetAddForm()
      setShowAddModal(false)
    } catch (err: any) {
      alert(err.message || 'Failed to add lead')
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------------------
  // Edit lead
  // -------------------------------------------------------------------------

  function openEditModal(lead: Lead) {
    setEditingLead(lead)
    setEditName(lead.name)
    setEditEmail(lead.email)
    setEditPhone(lead.phone || '')
    setEditCompany(lead.company_name || '')
    setEditStatus(lead.status)
    setEditMessage(lead.message || '')
  }

  async function handleUpdateLead() {
    if (!editingLead) return
    setBusy(true)
    try {
      await updateLead(editingLead.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        company_name: editCompany.trim(),
        status: editStatus,
        message: editMessage.trim(),
      })
      setLeads(prev =>
        prev.map(l =>
          l.id === editingLead.id
            ? { ...l, name: editName.trim(), email: editEmail.trim(), phone: editPhone.trim() || null, company_name: editCompany.trim() || null, status: editStatus, message: editMessage.trim() || null, converted_at: editStatus === 'converted' ? new Date().toISOString() : l.converted_at }
            : l
        )
      )
      // Refresh stats from server
      router.refresh()
      setEditingLead(null)
    } catch (err: any) {
      alert(err.message || 'Failed to update lead')
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------------------
  // Delete lead
  // -------------------------------------------------------------------------

  async function handleDeleteLead(id: string) {
    if (!confirm('Delete this lead? This cannot be undone.')) return
    setBusy(true)
    try {
      await deleteLead(id)
      setLeads(prev => prev.filter(l => l.id !== id))
      router.refresh()
      if (editingLead?.id === id) setEditingLead(null)
    } catch (err: any) {
      alert(err.message || 'Failed to delete lead')
    } finally {
      setBusy(false)
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const statCards = [
    { label: 'Total Leads', value: stats.total, icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'New', value: stats.new, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Qualified', value: stats.qualified, icon: UserCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Converted', value: stats.converted, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: Percent, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ]

  return (
    <div className="w-full px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Leads</h1>
        <button
          onClick={() => { resetAddForm(); setShowAddModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="appearance-none pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">All Statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{formatStatus(s)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Source filter */}
        <div className="relative">
          <select
            value={filterSource}
            onChange={e => setFilterSource(e.target.value)}
            className="appearance-none pl-3 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">All Sources</option>
            {SOURCES.map(s => (
              <option key={s} value={s}>{formatStatus(s)}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>

        {(filterStatus || filterSource || search) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterSource(''); setSearch('') }}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Target className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No leads found</p>
            <p className="text-xs mt-1">
              {leads.length === 0
                ? 'Add your first lead or connect your website form via the API.'
                : 'Try adjusting your filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Email</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Company</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Source</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Created</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map(lead => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => openEditModal(lead)}
                  >
                    <td className="px-6 py-3 font-medium text-slate-900">{lead.name}</td>
                    <td className="px-6 py-3 text-slate-600">{lead.email}</td>
                    <td className="px-6 py-3 text-slate-600">{lead.company_name || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_STYLES[lead.source] || 'bg-slate-100 text-slate-600'}`}>
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                        {formatStatus(lead.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{formatDate(lead.created_at)}</td>
                    <td className="px-6 py-3 text-right">
                      {userRole === 'admin' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteLead(lead.id) }}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          title="Delete lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* Add Lead Modal */}
      {/* ================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Add Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Contact name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={e => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+61 400 000 000"
                />
              </div>

              {/* Company name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={e => setFormCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Their business name"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                <div className="relative">
                  <select
                    value={formSource}
                    onChange={e => setFormSource(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {SOURCES.map(s => (
                      <option key={s} value={s}>{formatStatus(s)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message / Notes</label>
                <textarea
                  value={formMessage}
                  onChange={e => setFormMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Inquiry details, notes, etc."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLead}
                disabled={busy || !formName.trim() || !formEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Edit Lead Modal */}
      {/* ================================================================= */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Edit Lead</h2>
              <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <div className="relative">
                  <select
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                    className="w-full appearance-none px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{formatStatus(s)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Company name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={e => setEditCompany(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message / Notes</label>
                <textarea
                  value={editMessage}
                  onChange={e => setEditMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Metadata (read-only) */}
              {editingLead.metadata && Object.keys(editingLead.metadata).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Metadata</label>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 overflow-x-auto">
                    {JSON.stringify(editingLead.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
              <div>
                {userRole === 'admin' && (
                  <button
                    onClick={() => handleDeleteLead(editingLead.id)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateLead}
                  disabled={busy || !editName.trim() || !editEmail.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
