'use client'

import { useState } from 'react'
import { UserPlus, Mail, Phone, Shield, User, X, Check, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  phone: string | null
  trade: string | null
  hourly_rate: number | null
}

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  worker: 'bg-slate-100 text-slate-700',
}

const TRADES = [
  'Passive Fire Protection',
  'Fire Services Active',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Carpentry',
  'General Construction',
  'Site Manager',
  'Project Manager',
  'Other',
]

export default function TeamManager({
  teamMembers: initial,
  currentUserId,
}: {
  teamMembers: TeamMember[]
  currentUserId: string
}) {
  const [teamMembers, setTeamMembers] = useState(initial)
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<TeamMember>>({})
  const [editSaving, setEditSaving] = useState(false)

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'worker',
    trade: '',
    hourly_rate: '',
  })

  async function handleInvite() {
    if (!form.email || !form.full_name) {
      setError('Email and full name are required')
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (data.error) {
      setError(data.error)
      return
    }

    setSuccess(true)
    setForm({ email: '', full_name: '', phone: '', role: 'worker', trade: '', hourly_rate: '' })
    setTimeout(() => {
      setSuccess(false)
      setShowInvite(false)
    }, 2000)
  }

  function startEdit(member: TeamMember) {
    setEditingId(member.id)
    setEditForm({
      trade: member.trade || '',
      hourly_rate: member.hourly_rate ?? undefined,
    })
  }

  async function handleSaveEdit(memberId: string) {
    setEditSaving(true)
    const supabase = createClient()
    await supabase
      .from('users')
      .update({
        trade: editForm.trade || null,
        hourly_rate: editForm.hourly_rate ? Number(editForm.hourly_rate) : null,
      })
      .eq('id', memberId)

    setTeamMembers(prev => prev.map(m =>
      m.id === memberId
        ? { ...m, trade: editForm.trade || null, hourly_rate: editForm.hourly_rate ? Number(editForm.hourly_rate) : null }
        : m
    ))
    setEditingId(null)
    setEditSaving(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your team members and invite new workers.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Invite Team Member</h2>
            <button onClick={() => { setShowInvite(false); setError(null) }} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  placeholder="jane@company.com.au"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="0412 345 678"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Trade / Category</label>
                <select
                  value={form.trade}
                  onChange={e => setForm(f => ({ ...f, trade: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select trade…</option>
                  {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Hourly Rate (A$)</label>
                <input
                  type="number"
                  placeholder="85"
                  min={0}
                  step={0.01}
                  value={form.hourly_rate}
                  onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleInvite}
                disabled={loading || success}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  success ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                }`}
              >
                {success ? <><Check className="w-4 h-4" /> Invite sent!</> : loading ? 'Sending…' : <><Mail className="w-4 h-4" /> Send Invite</>}
              </button>
              <button
                onClick={() => { setShowInvite(false); setError(null) }}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-4 py-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {teamMembers.length} Member{teamMembers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {teamMembers.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No team members yet.</p>
          </div>
        ) : (
          teamMembers.map(member => (
            <div key={member.id} className="px-4 py-3">
              {editingId === member.id ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-600">{member.full_name?.charAt(0) || '?'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{member.full_name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Trade</label>
                      <select
                        value={editForm.trade || ''}
                        onChange={e => setEditForm(f => ({ ...f, trade: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select trade…</option>
                        {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Hourly Rate (A$)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editForm.hourly_rate || ''}
                        onChange={e => setEditForm(f => ({ ...f, hourly_rate: Number(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(member.id)}
                      disabled={editSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-slate-500 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-slate-600">{member.full_name?.charAt(0) || '?'}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800">{member.full_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_STYLES[member.role] || ROLE_STYLES.worker}`}>
                          {member.role}
                        </span>
                        {member.trade && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
                            {member.trade}
                          </span>
                        )}
                        {member.id === currentUserId && (
                          <span className="text-xs text-slate-400">(you)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-slate-500">{member.email}</p>
                        {member.phone && <p className="text-xs text-slate-400">{member.phone}</p>}
                        {member.hourly_rate && (
                          <p className="text-xs font-medium text-slate-600">A${member.hourly_rate}/hr</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(member)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}