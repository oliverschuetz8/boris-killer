'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, Send, CheckCircle2, XCircle,
  AlertCircle, Plus, X, ChevronDown, ChevronUp,
  UsersRound, Trash2, Pencil, Search, UserCircle,
} from 'lucide-react'
import {
  upsertEmailPreference,
  sendTestEmail,
} from '@/lib/services/email'
import { roleLabel } from '@/lib/utils'
import {
  createEmailGroup,
  updateEmailGroup,
  deleteEmailGroup,
} from '@/lib/services/email-groups'
import {
  EMAIL_EVENTS,
  type EmailEvent,
  type EmailLog,
  type EmailPreference,
  type EmailGroup,
  type CompanyUserSlim,
} from '@/lib/email/types'

interface Props {
  initialPreferences: EmailPreference[]
  initialLogs: EmailLog[]
  initialUsers: CompanyUserSlim[]
  initialGroups: EmailGroup[]
  currentUserEmail: string
}

type LocalPref = {
  event: EmailEvent
  is_enabled: boolean
  recipient_roles: string[]
  recipient_user_ids: string[]
  recipient_group_ids: string[]
  extra_emails: string[]
  notify_customer: boolean
}

const ROLE_OPTIONS = ['admin', 'manager', 'worker'] as const

function defaultPref(event: EmailEvent): LocalPref {
  const isCustomerOnly = event === 'invoice.sent'
  return {
    event,
    is_enabled: true,
    recipient_roles: isCustomerOnly ? [] : ['admin', 'manager'],
    recipient_user_ids: [],
    recipient_group_ids: [],
    extra_emails: [],
    notify_customer: false,
  }
}

export default function NotificationsView({
  initialPreferences,
  initialLogs,
  initialUsers,
  initialGroups,
  currentUserEmail,
}: Props) {
  const initial: Record<EmailEvent, LocalPref> = EMAIL_EVENTS.reduce((acc, def) => {
    const found = initialPreferences.find(p => p.event === def.event)
    acc[def.event] = found
      ? {
          event: def.event,
          is_enabled: found.is_enabled,
          recipient_roles: found.recipient_roles,
          recipient_user_ids: found.recipient_user_ids ?? [],
          recipient_group_ids: found.recipient_group_ids ?? [],
          extra_emails: found.extra_emails,
          notify_customer: found.notify_customer,
        }
      : defaultPref(def.event)
    return acc
  }, {} as Record<EmailEvent, LocalPref>)

  const [prefs, setPrefs] = useState(initial)
  const [savingEvent, setSavingEvent] = useState<EmailEvent | null>(null)
  const [savedEvent, setSavedEvent] = useState<EmailEvent | null>(null)
  const [errorEvent, setErrorEvent] = useState<{ event: EmailEvent; message: string } | null>(null)

  const [testEmail, setTestEmail] = useState(currentUserEmail)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  const [logsOpen, setLogsOpen] = useState(false)
  const [logs] = useState(initialLogs)

  // Groups state
  const [groups, setGroups] = useState<EmailGroup[]>(initialGroups)
  const users = initialUsers

  function update(event: EmailEvent, patch: Partial<LocalPref>) {
    setPrefs(prev => ({ ...prev, [event]: { ...prev[event], ...patch } }))
  }

  function toggleRole(event: EmailEvent, role: string) {
    const cur = prefs[event].recipient_roles
    const next = cur.includes(role) ? cur.filter(r => r !== role) : [...cur, role]
    update(event, { recipient_roles: next })
  }

  async function handleSave(event: EmailEvent) {
    setSavingEvent(event)
    setErrorEvent(null)
    try {
      await upsertEmailPreference(event, prefs[event])
      setSavedEvent(event)
      setTimeout(() => setSavedEvent(null), 2000)
    } catch (err: any) {
      setErrorEvent({ event, message: err?.message || 'Failed to save' })
    } finally {
      setSavingEvent(null)
    }
  }

  async function handleSendTest() {
    if (!testEmail.trim()) return
    setTestStatus('sending')
    setTestError(null)
    const result = await sendTestEmail(testEmail.trim())
    if (result.success) {
      setTestStatus('success')
      setTimeout(() => setTestStatus('idle'), 4000)
    } else {
      setTestStatus('error')
      setTestError(result.error || 'Unknown error')
    }
  }

  return (
    <div className="w-full p-8">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Settings
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Email Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Choose which events trigger emails and who receives them. Branding for emails is configured under <Link href="/settings/company" className="text-amber-700 hover:underline">Company Profile</Link>.
          </p>
        </div>
      </div>

      {/* Test email */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Send a test email</h2>
        <p className="text-xs text-slate-500 mb-4">
          Verify your branding and email service are working. Sends a "Job Created" template to the address below.
        </p>
        <div className="flex gap-2 items-stretch">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testStatus === 'sending' || !testEmail.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testStatus === 'sending' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send test
          </button>
        </div>
        {testStatus === 'success' && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            Test email sent — check your inbox.
          </div>
        )}
        {testStatus === 'error' && (
          <div className="mt-3 inline-flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{testError}</span>
          </div>
        )}
      </div>

      {/* Email Groups manager */}
      <EmailGroupsManager users={users} groups={groups} setGroups={setGroups} />

      {/* Per-event preferences */}
      <div className="space-y-4 mt-6">
        {EMAIL_EVENTS.map(def => {
          const pref = prefs[def.event]
          const isCustomerOnly = def.event === 'invoice.sent'
          const showCustomerToggle = def.event === 'invoice.overdue'
          return (
            <div
              key={def.event}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4 p-6 border-b border-slate-100">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-900">{def.label}</h3>
                    <code className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {def.event}
                    </code>
                  </div>
                  <p className="text-xs text-slate-500">{def.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={pref.is_enabled}
                    onChange={(e) => update(def.event, { is_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              <div className={`p-6 space-y-5 ${pref.is_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                {!isCustomerOnly && (
                  <>
                    {/* Roles */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-2">
                        Send to all users with role
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {ROLE_OPTIONS.map(role => {
                          const count = users.filter(u => u.role === role).length
                          const active = pref.recipient_roles.includes(role)
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => toggleRole(def.event, role)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border capitalize transition-colors ${
                                active
                                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                                  : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                              }`}
                            >
                              {role}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Sends to every active user with that role. Add specific people below for additional recipients.
                      </p>
                    </div>

                    {/* Specific people */}
                    <PeoplePicker
                      users={users}
                      selectedIds={pref.recipient_user_ids}
                      onChange={(ids) => update(def.event, { recipient_user_ids: ids })}
                    />

                    {/* Groups */}
                    <GroupsPicker
                      groups={groups}
                      selectedIds={pref.recipient_group_ids}
                      onChange={(ids) => update(def.event, { recipient_group_ids: ids })}
                    />
                  </>
                )}

                {isCustomerOnly && (
                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    This email is sent directly to the customer's email address on the invoice.
                  </div>
                )}

                <ExtraEmailsField
                  emails={pref.extra_emails}
                  onChange={(extras) => update(def.event, { extra_emails: extras })}
                  label={isCustomerOnly ? 'Additional CC emails' : 'Additional email addresses (free-text)'}
                />

                {showCustomerToggle && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pref.notify_customer}
                      onChange={(e) => update(def.event, { notify_customer: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-700">Also send a polite chase email to the customer</span>
                  </label>
                )}

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  {savedEvent === def.event && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Saved
                    </span>
                  )}
                  {errorEvent?.event === def.event && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-red-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errorEvent.message}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSave(def.event)}
                    disabled={savingEvent === def.event}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
                  >
                    {savingEvent === def.event && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Delivery log */}
      <div className="bg-white rounded-xl border border-slate-200 mt-8 overflow-hidden">
        <button
          type="button"
          onClick={() => setLogsOpen(o => !o)}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-base font-semibold text-slate-900">Recent deliveries</h2>
            <p className="text-xs text-slate-500 mt-0.5">Last {logs.length} email sends.</p>
          </div>
          {logsOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        {logsOpen && (
          <div className="border-t border-slate-100">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                No emails sent yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">When</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Recipient</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td className="px-6 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </td>
                        <td className="px-6 py-3">
                          <code className="text-[11px] font-mono text-slate-700">{log.event}</code>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-700">{log.recipient_email}</td>
                        <td className="px-6 py-3 text-xs text-slate-700 max-w-md truncate">{log.subject}</td>
                        <td className="px-6 py-3">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Sent
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700" title={log.error_message || ''}>
                              <XCircle className="w-3.5 h-3.5" /> Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =========================================================================
// PeoplePicker — chip list + searchable add menu of company users
// =========================================================================

function PeoplePicker({
  users,
  selectedIds,
  onChange,
}: {
  users: CompanyUserSlim[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selectedUsers = users.filter(u => selectedIds.includes(u.id))
  const availableUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users
      .filter(u => !selectedIds.includes(u.id))
      .filter(u => !term || u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
  }, [users, selectedIds, search])

  function add(id: string) {
    onChange([...selectedIds, id])
    setSearch('')
  }

  function remove(id: string) {
    onChange(selectedIds.filter(x => x !== id))
  }

  return (
    <div ref={wrapperRef}>
      <label className="block text-xs font-medium text-slate-700 mb-2">
        Specific people (additive — these always receive it)
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {selectedUsers.map(u => (
          <span
            key={u.id}
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-slate-100 text-slate-700 text-xs rounded-md"
          >
            <UserCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium">{u.full_name}</span>
            <span className="text-slate-400">· {roleLabel(u.role)}</span>
            <button
              type="button"
              onClick={() => remove(u.id)}
              className="ml-0.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              aria-label={`Remove ${u.full_name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-dashed border-slate-300 text-slate-600 text-xs rounded-md hover:border-slate-400 hover:bg-slate-50"
        >
          <Plus className="w-3 h-3" />
          Add person
        </button>
      </div>

      {open && (
        <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="px-3 py-4 text-xs text-slate-500 text-center">
                {search ? 'No matches.' : 'Everyone is already added.'}
              </div>
            ) : (
              availableUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => add(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <UserCircle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">{u.full_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{u.email} · <span>{roleLabel(u.role)}</span></div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// GroupsPicker — chip list + dropdown of email_groups
// =========================================================================

function GroupsPicker({
  groups,
  selectedIds,
  onChange,
}: {
  groups: EmailGroup[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selected = groups.filter(g => selectedIds.includes(g.id))
  const available = groups.filter(g => !selectedIds.includes(g.id))

  function add(id: string) {
    onChange([...selectedIds, id])
    setOpen(false)
  }

  function remove(id: string) {
    onChange(selectedIds.filter(x => x !== id))
  }

  if (groups.length === 0) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-2">
          Distribution groups
        </label>
        <p className="text-[11px] text-slate-400">
          No groups yet. <span className="text-slate-500">Create one in the "Distribution Groups" section above.</span>
        </p>
      </div>
    )
  }

  return (
    <div ref={wrapperRef}>
      <label className="block text-xs font-medium text-slate-700 mb-2">
        Distribution groups
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {selected.map(g => (
          <span
            key={g.id}
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-indigo-50 text-indigo-800 text-xs rounded-md border border-indigo-100"
          >
            <UsersRound className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-medium">{g.name}</span>
            <span className="text-indigo-400">· {g.member_user_ids.length + g.member_emails.length}</span>
            <button
              type="button"
              onClick={() => remove(g.id)}
              className="ml-0.5 p-0.5 text-indigo-400 hover:text-indigo-700 rounded"
              aria-label={`Remove group ${g.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-dashed border-slate-300 text-slate-600 text-xs rounded-md hover:border-slate-400 hover:bg-slate-50"
          >
            <Plus className="w-3 h-3" />
            Add group
          </button>
        )}
      </div>

      {open && available.length > 0 && (
        <div className="mt-2 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <div className="max-h-56 overflow-y-auto">
            {available.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => add(g.id)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
              >
                <UsersRound className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate">{g.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {g.member_user_ids.length + g.member_emails.length} member{g.member_user_ids.length + g.member_emails.length === 1 ? '' : 's'}
                    {g.description ? ` · ${g.description}` : ''}
                  </div>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// EmailGroupsManager — CRUD section for distribution groups
// =========================================================================

function EmailGroupsManager({
  users,
  groups,
  setGroups,
}: {
  users: CompanyUserSlim[]
  groups: EmailGroup[]
  setGroups: (g: EmailGroup[]) => void
}) {
  const [open, setOpen] = useState(groups.length > 0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(input: GroupFormState) {
    setBusy('create')
    setError(null)
    try {
      const created = await createEmailGroup({
        name: input.name,
        description: input.description,
        member_user_ids: input.member_user_ids,
        member_emails: input.member_emails,
      })
      setGroups([...groups, created])
      setCreating(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to create group')
    } finally {
      setBusy(null)
    }
  }

  async function handleUpdate(id: string, input: GroupFormState) {
    setBusy(id)
    setError(null)
    try {
      const updated = await updateEmailGroup(id, {
        name: input.name,
        description: input.description,
        member_user_ids: input.member_user_ids,
        member_emails: input.member_emails,
      })
      setGroups(groups.map(g => g.id === id ? updated : g))
      setEditingId(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to update group')
    } finally {
      setBusy(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this group? Any events using it will lose this group as a recipient.')) return
    setBusy(id)
    setError(null)
    try {
      await deleteEmailGroup(id)
      setGroups(groups.filter(g => g.id !== id))
    } catch (err: any) {
      setError(err?.message || 'Failed to delete group')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
      >
        <div className="text-left flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
            <UsersRound className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Distribution Groups</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {groups.length === 0
                ? 'Create reusable groups (e.g. "Leadership", "Operations") and target them from any event.'
                : `${groups.length} group${groups.length === 1 ? '' : 's'}. Create reusable lists you can target from any event.`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-6 space-y-3">
          {error && (
            <div className="inline-flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {groups.length === 0 && !creating && (
            <p className="text-sm text-slate-500">
              No groups yet. Create one to reuse the same recipient list across multiple events.
            </p>
          )}

          {groups.map(g => editingId === g.id ? (
            <GroupEditor
              key={g.id}
              users={users}
              initial={{
                name: g.name,
                description: g.description ?? '',
                member_user_ids: g.member_user_ids,
                member_emails: g.member_emails,
              }}
              busy={busy === g.id}
              onCancel={() => setEditingId(null)}
              onSave={(input) => handleUpdate(g.id, input)}
            />
          ) : (
            <div key={g.id} className="flex items-start justify-between gap-3 p-4 border border-slate-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{g.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {g.member_user_ids.length + g.member_emails.length} member{g.member_user_ids.length + g.member_emails.length === 1 ? '' : 's'}
                  </span>
                </div>
                {g.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {g.member_user_ids.map(uid => {
                    const u = users.find(x => x.id === uid)
                    if (!u) return null
                    return (
                      <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded">
                        <UserCircle className="w-3 h-3 text-slate-400" />
                        {u.full_name}
                      </span>
                    )
                  })}
                  {g.member_emails.map(email => (
                    <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded">
                      {email}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingId(g.id)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(g.id)}
                  disabled={busy === g.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  title="Delete"
                >
                  {busy === g.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}

          {creating && (
            <GroupEditor
              users={users}
              initial={{ name: '', description: '', member_user_ids: [], member_emails: [] }}
              busy={busy === 'create'}
              onCancel={() => setCreating(false)}
              onSave={handleCreate}
            />
          )}

          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              New group
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// =========================================================================
// GroupEditor — form for create/edit of one group
// =========================================================================

interface GroupFormState {
  name: string
  description: string
  member_user_ids: string[]
  member_emails: string[]
}

function GroupEditor({
  users,
  initial,
  busy,
  onCancel,
  onSave,
}: {
  users: CompanyUserSlim[]
  initial: GroupFormState
  busy: boolean
  onCancel: () => void
  onSave: (input: GroupFormState) => void
}) {
  const [form, setForm] = useState<GroupFormState>(initial)
  const [search, setSearch] = useState('')

  const selectedUsers = users.filter(u => form.member_user_ids.includes(u.id))
  const availableUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users
      .filter(u => !form.member_user_ids.includes(u.id))
      .filter(u => !term || u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
  }, [users, form.member_user_ids, search])

  function toggleUser(id: string) {
    if (form.member_user_ids.includes(id)) {
      setForm({ ...form, member_user_ids: form.member_user_ids.filter(x => x !== id) })
    } else {
      setForm({ ...form, member_user_ids: [...form.member_user_ids, id] })
    }
  }

  return (
    <div className="border border-amber-200 bg-amber-50/30 rounded-lg p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Group name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Leadership Team, Operations Managers"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Description (optional)</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="When should this group receive emails?"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-2">Members from your team</label>
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selectedUsers.map(u => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-white border border-slate-200 text-slate-700 text-xs rounded-md"
              >
                <UserCircle className="w-3.5 h-3.5 text-slate-400" />
                {u.full_name}
                <span className="text-slate-400">· {roleLabel(u.role)}</span>
                <button
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className="ml-0.5 p-0.5 text-slate-400 hover:text-slate-700"
                  aria-label={`Remove ${u.full_name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative border border-slate-200 rounded-lg bg-white">
          <div className="relative border-b border-slate-100">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search to add users…"
              className="w-full pl-9 pr-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {availableUsers.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 text-center">
                {search ? 'No matches.' : 'All users added.'}
              </div>
            ) : (
              availableUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                >
                  <UserCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-800 truncate">{u.full_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{u.email} · <span>{roleLabel(u.role)}</span></div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <ExtraEmailsField
        emails={form.member_emails}
        onChange={(emails) => setForm({ ...form, member_emails: emails })}
        label="Additional email addresses (people not in your team)"
      />

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={busy || !form.name.trim()}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save group
        </button>
      </div>
    </div>
  )
}

// =========================================================================
// ExtraEmailsField — free-text email input with chip list
// =========================================================================

function ExtraEmailsField({
  emails,
  onChange,
  label,
}: {
  emails: string[]
  onChange: (emails: string[]) => void
  label: string
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (!trimmed || !trimmed.includes('@')) return
    if (emails.includes(trimmed)) return
    onChange([...emails, trimmed])
    setDraft('')
  }

  function remove(email: string) {
    onChange(emails.filter(e => e !== email))
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="extra@example.com"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
      {emails.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2">
          {emails.map(email => (
            <span
              key={email}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs rounded-md"
            >
              {email}
              <button
                type="button"
                onClick={() => remove(email)}
                className="text-slate-400 hover:text-slate-600"
                aria-label={`Remove ${email}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
