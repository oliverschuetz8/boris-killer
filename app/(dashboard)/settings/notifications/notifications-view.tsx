'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Mail, Loader2, Send, CheckCircle2, XCircle,
  AlertCircle, Plus, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  upsertEmailPreference,
  sendTestEmail,
} from '@/lib/services/email'
import { EMAIL_EVENTS, type EmailEvent, type EmailLog, type EmailPreference } from '@/lib/email/types'

interface Props {
  initialPreferences: EmailPreference[]
  initialLogs: EmailLog[]
  currentUserEmail: string
}

type LocalPref = {
  event: EmailEvent
  is_enabled: boolean
  recipient_roles: string[]
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
    extra_emails: [],
    notify_customer: false,
  }
}

export default function NotificationsView({
  initialPreferences,
  initialLogs,
  currentUserEmail,
}: Props) {
  const initial: Record<EmailEvent, LocalPref> = EMAIL_EVENTS.reduce((acc, def) => {
    const found = initialPreferences.find(p => p.event === def.event)
    acc[def.event] = found
      ? {
          event: def.event,
          is_enabled: found.is_enabled,
          recipient_roles: found.recipient_roles,
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
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>

      <div className="mb-8 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
          <Mail className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Email Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Choose which events trigger emails and who receives them. Branding for emails is configured under <Link href="/settings/company" className="text-amber-700 hover:underline">Company Profile</Link>.
          </p>
        </div>
      </div>

      {/* Test email */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
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

      {/* Per-event preferences */}
      <div className="space-y-4">
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

              <div className={`p-6 space-y-4 ${pref.is_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
                {!isCustomerOnly && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">
                      Send to roles
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {ROLE_OPTIONS.map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(def.event, role)}
                          className={`px-3 py-1.5 text-xs rounded-lg border capitalize ${
                            pref.recipient_roles.includes(role)
                              ? 'bg-amber-50 border-amber-300 text-amber-800'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isCustomerOnly && (
                  <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    This email is sent directly to the customer's email address on the invoice.
                  </div>
                )}

                <ExtraEmailsField
                  emails={pref.extra_emails}
                  onChange={(extras) => update(def.event, { extra_emails: extras })}
                  label={isCustomerOnly ? 'Additional CC emails' : 'Additional recipients'}
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

                <div className="flex items-center justify-end gap-3 pt-2">
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
