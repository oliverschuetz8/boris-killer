'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Webhook, Plus, Trash2, Loader2, Copy, Check,
  ChevronDown, ChevronUp, Eye, EyeOff, Key, Send, AlertCircle,
  CheckCircle2, XCircle, X,
} from 'lucide-react'
import {
  createWebhook, updateWebhook, deleteWebhook, fireWebhookEvent,
  type Webhook as WebhookType, type WebhookLog,
} from '@/lib/services/webhooks'

const WEBHOOK_EVENTS = [
  'job.created',
  'job.completed',
  'job.status_changed',
  'job.assigned',
  'invoice.created',
  'invoice.status_changed',
  'invoice.overdue',
  'hours.submitted',
  'room.completed',
  'lead.created',
] as const
import {
  createApiKey, deleteApiKey, type ApiKey,
} from '@/lib/services/api-keys'

interface Props {
  webhooks: WebhookType[]
  logs: WebhookLog[]
  apiKeys: ApiKey[]
  userRole: string
}

export default function WebhooksView({
  webhooks: initialWebhooks,
  logs: initialLogs,
  apiKeys: initialApiKeys,
  userRole,
}: Props) {
  const router = useRouter()

  // Webhooks state
  const [webhooks, setWebhooks] = useState(initialWebhooks)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editEvents, setEditEvents] = useState<string[]>([])

  // API keys state
  const [apiKeys, setApiKeys] = useState(initialApiKeys)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)

  // Logs state
  const [logs] = useState(initialLogs)
  const [showLogs, setShowLogs] = useState(false)
  const [showSecret, setShowSecret] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Webhook handlers
  // -------------------------------------------------------------------------

  async function handleAddWebhook() {
    if (!newUrl.trim() || newEvents.length === 0) return
    setBusy('add')
    try {
      const webhook = await createWebhook(newUrl.trim(), newEvents, newDescription.trim() || undefined)
      setWebhooks(prev => [webhook, ...prev])
      setNewUrl('')
      setNewDescription('')
      setNewEvents([])
      setShowAddForm(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleDeleteWebhook(id: string) {
    if (!confirm('Delete this webhook? This cannot be undone.')) return
    setBusy(`delete-${id}`)
    try {
      await deleteWebhook(id)
      setWebhooks(prev => prev.filter(w => w.id !== id))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleToggleActive(webhook: WebhookType) {
    setBusy(`toggle-${webhook.id}`)
    try {
      await updateWebhook(webhook.id, { is_active: !webhook.is_active })
      setWebhooks(prev =>
        prev.map(w => w.id === webhook.id ? { ...w, is_active: !w.is_active } : w)
      )
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  function startEdit(webhook: WebhookType) {
    setEditingId(webhook.id)
    setEditUrl(webhook.url)
    setEditDescription(webhook.description || '')
    setEditEvents([...webhook.events])
  }

  async function handleSaveEdit(id: string) {
    if (!editUrl.trim() || editEvents.length === 0) return
    setBusy(`edit-${id}`)
    try {
      await updateWebhook(id, {
        url: editUrl.trim(),
        description: editDescription.trim() || undefined,
        events: editEvents,
      })
      setWebhooks(prev =>
        prev.map(w => w.id === id ? {
          ...w,
          url: editUrl.trim(),
          description: editDescription.trim() || null,
          events: editEvents,
        } : w)
      )
      setEditingId(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleTestWebhook(webhook: WebhookType) {
    setBusy(`test-${webhook.id}`)
    try {
      await fireWebhookEvent(webhook.company_id, 'webhook.test', {
        message: 'This is a test event from your app.',
        webhook_id: webhook.id,
      })
      router.refresh()
      alert('Test event sent! Check your endpoint and the delivery log below.')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  function toggleEvent(event: string, list: string[], setList: (v: string[]) => void) {
    if (list.includes(event)) {
      setList(list.filter(e => e !== event))
    } else {
      setList([...list, event])
    }
  }

  // -------------------------------------------------------------------------
  // API key handlers
  // -------------------------------------------------------------------------

  async function handleCreateApiKey() {
    if (!newKeyName.trim()) return
    setBusy('create-key')
    try {
      const { key, rawKey } = await createApiKey(newKeyName.trim())
      setApiKeys(prev => [key, ...prev])
      setGeneratedKey(rawKey)
      setNewKeyName('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleDeleteApiKey(id: string) {
    if (!confirm('Delete this API key? Any integrations using it will stop working.')) return
    setBusy(`delete-key-${id}`)
    try {
      await deleteApiKey(id)
      setApiKeys(prev => prev.filter(k => k.id !== id))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  function handleCopyKey() {
    if (!generatedKey) return
    navigator.clipboard.writeText(generatedKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  // -------------------------------------------------------------------------
  // Event checkboxes component
  // -------------------------------------------------------------------------

  function EventCheckboxes({ selected, onChange }: { selected: string[]; onChange: (events: string[]) => void }) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {WEBHOOK_EVENTS.map(event => (
          <label key={event} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(event)}
              onChange={() => toggleEvent(event, selected, onChange)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-slate-700">{event}</span>
          </label>
        ))}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="w-full px-8 py-8">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Settings
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-slate-900">Webhooks & API</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Send real-time events to external tools and manage API access keys.
        </p>
      </div>

      {/* ================================================================= */}
      {/* WEBHOOKS SECTION */}
      {/* ================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Webhook className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Webhooks</h2>
              <p className="text-xs text-slate-500">
                HTTP POST notifications when events happen in your account.
              </p>
            </div>
          </div>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Webhook
            </button>
          )}
        </div>

        {/* Add webhook form */}
        {showAddForm && (
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Endpoint URL
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://your-n8n-instance.com/webhook/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="e.g. n8n production, Zapier workflow"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Events
                </label>
                <EventCheckboxes selected={newEvents} onChange={setNewEvents} />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleAddWebhook}
                  disabled={!newUrl.trim() || newEvents.length === 0 || busy === 'add'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {busy === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create Webhook
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewUrl(''); setNewDescription(''); setNewEvents([]) }}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Webhook list */}
        <div className="divide-y divide-slate-100">
          {webhooks.length === 0 && !showAddForm && (
            <div className="px-6 py-10 text-center text-sm text-slate-400">
              No webhooks configured yet. Add one to start receiving events.
            </div>
          )}
          {webhooks.map(webhook => (
            <div key={webhook.id} className="px-6 py-4">
              {editingId === webhook.id ? (
                /* Edit mode */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={e => setEditUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Events</label>
                    <EventCheckboxes selected={editEvents} onChange={setEditEvents} />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSaveEdit(webhook.id)}
                      disabled={busy === `edit-${webhook.id}`}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy === `edit-${webhook.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Status indicator */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          !webhook.is_active
                            ? 'bg-slate-300'
                            : webhook.failure_count >= 3
                              ? 'bg-red-500'
                              : 'bg-green-500'
                        }`}
                      />
                      <span className="text-sm font-medium text-slate-800 truncate">
                        {webhook.url}
                      </span>
                    </div>
                    {webhook.description && (
                      <p className="text-xs text-slate-500 mb-2 ml-4">{webhook.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 ml-4 mb-2">
                      {webhook.events.map(event => (
                        <span
                          key={event}
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 ml-4 text-xs text-slate-400">
                      {webhook.last_triggered_at && (
                        <span>
                          Last triggered: {new Date(webhook.last_triggered_at).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      )}
                      {webhook.last_status_code && (
                        <span className={webhook.last_status_code < 400 ? 'text-green-600' : 'text-red-500'}>
                          HTTP {webhook.last_status_code}
                        </span>
                      )}
                      {webhook.failure_count > 0 && (
                        <span className="text-red-500">{webhook.failure_count} failures</span>
                      )}
                    </div>
                    {/* Secret display */}
                    <div className="flex items-center gap-2 ml-4 mt-2">
                      <span className="text-xs text-slate-400">Secret:</span>
                      <code className="text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded font-mono">
                        {showSecret === webhook.id ? webhook.secret : '************************************'}
                      </code>
                      <button
                        onClick={() => setShowSecret(showSecret === webhook.id ? null : webhook.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {showSecret === webhook.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleTestWebhook(webhook)}
                      disabled={busy === `test-${webhook.id}` || !webhook.is_active}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
                      title="Send test event"
                    >
                      {busy === `test-${webhook.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleToggleActive(webhook)}
                      disabled={busy === `toggle-${webhook.id}`}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                        webhook.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {busy === `toggle-${webhook.id}` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : webhook.is_active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      onClick={() => startEdit(webhook)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook.id)}
                      disabled={busy === `delete-${webhook.id}`}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      {busy === `delete-${webhook.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* API KEYS SECTION (admin only) */}
      {/* ================================================================= */}
      {userRole === 'admin' && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                <Key className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">API Keys</h2>
                <p className="text-xs text-slate-500">
                  Generate keys for n8n, Zapier, Make, or custom integrations.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setShowKeyModal(true); setGeneratedKey(null); setNewKeyName('') }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate Key
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {apiKeys.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                No API keys yet. Generate one to connect external tools.
              </div>
            )}
            {apiKeys.map(key => (
              <div key={key.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{key.name}</span>
                    {!key.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                    <code className="font-mono bg-slate-50 px-2 py-0.5 rounded">{key.key_prefix}...</code>
                    <span>
                      Created {new Date(key.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                    {key.last_used_at && (
                      <span>
                        Last used {new Date(key.last_used_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteApiKey(key.id)}
                  disabled={busy === `delete-key-${key.id}`}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete key"
                >
                  {busy === `delete-key-${key.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* GENERATE KEY MODAL */}
      {/* ================================================================= */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {generatedKey ? 'API Key Generated' : 'Generate New API Key'}
              </h3>
              <button
                onClick={() => { setShowKeyModal(false); setGeneratedKey(null) }}
                className="p-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5">
              {generatedKey ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Copy this key now. It will not be shown again.</span>
                  </div>
                  <div className="relative">
                    <code className="block w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono break-all text-slate-800">
                      {generatedKey}
                    </code>
                    <button
                      onClick={handleCopyKey}
                      className="absolute right-2 top-2 p-1.5 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      {keyCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    </button>
                  </div>
                  <button
                    onClick={() => { setShowKeyModal(false); setGeneratedKey(null) }}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Key Name
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={e => setNewKeyName(e.target.value)}
                      placeholder="e.g. n8n production, Zapier"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCreateApiKey}
                      disabled={!newKeyName.trim() || busy === 'create-key'}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {busy === 'create-key' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      Generate
                    </button>
                    <button
                      onClick={() => setShowKeyModal(false)}
                      className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* RECENT DELIVERIES */}
      {/* ================================================================= */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Recent Deliveries</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {logs.length}
            </span>
          </div>
          {showLogs ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showLogs && (
          <div className="border-t border-slate-100">
            {logs.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                No deliveries yet. Events will appear here once webhooks fire.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase">
                      <th className="px-6 py-3 text-left font-medium">Event</th>
                      <th className="px-6 py-3 text-left font-medium">Status</th>
                      <th className="px-6 py-3 text-left font-medium">Time</th>
                      <th className="px-6 py-3 text-left font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {log.event}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {log.response_status ? (
                            <span className={`text-xs font-medium ${log.response_status < 400 ? 'text-green-600' : 'text-red-500'}`}>
                              HTTP {log.response_status}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No response</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-3">
                          {log.success ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                              <XCircle className="w-3.5 h-3.5" />
                              Failed
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
