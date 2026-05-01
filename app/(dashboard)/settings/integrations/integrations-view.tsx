'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft, Plug, CheckCircle2, XCircle, RefreshCw, Loader2,
  Clock, AlertCircle, ChevronDown, X,
} from 'lucide-react'
import {
  deleteXeroConnection,
  syncTimesheets,
  assignTimeEntry,
  ignoreTimeEntry,
  syncEmployeePayRates,
  type XeroConnection,
  type XeroTimeEntry,
} from '@/lib/services/xero'

interface Props {
  xeroConnection: XeroConnection | null
  unassignedEntries: XeroTimeEntry[]
  jobs: { id: string; job_number: string; title: string }[]
  userRole: string
}

export default function IntegrationsView({
  xeroConnection,
  unassignedEntries: initialEntries,
  jobs,
  userRole,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [entries, setEntries] = useState(initialEntries)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string>('')

  const successMsg = searchParams.get('success')
  const errorMsg = searchParams.get('error')

  async function handleConnect() {
    window.location.href = '/api/xero/connect'
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect Xero? You can reconnect later.')) return
    setBusy('disconnect')
    try {
      await deleteXeroConnection()
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleSync() {
    setBusy('sync')
    setSyncResult(null)
    try {
      const result = await syncTimesheets()
      setSyncResult(result)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleSyncPayRates() {
    setBusy('payrates')
    try {
      const result = await syncEmployeePayRates()
      alert(`Updated ${result.updated} employee pay rate(s) from Xero.`)
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleAssign(entryId: string) {
    if (!selectedJobId) return
    setBusy(`assign-${entryId}`)
    try {
      await assignTimeEntry(entryId, selectedJobId)
      setEntries(prev => prev.filter(e => e.id !== entryId))
      setAssigningId(null)
      setSelectedJobId('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function handleIgnore(entryId: string) {
    setBusy(`ignore-${entryId}`)
    try {
      await ignoreTimeEntry(entryId)
      setEntries(prev => prev.filter(e => e.id !== entryId))
    } catch (err: any) {
      alert(err.message)
    } finally {
      setBusy(null)
    }
  }

  const isConnected = !!xeroConnection

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
        <h1 className="text-xl font-bold text-slate-900">Integrations</h1>
        <p className="text-sm text-slate-500 mt-0.5">Connect external services to your account.</p>
      </div>

      {/* Status messages */}
      {successMsg === 'connected' && (
        <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Xero connected successfully!
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Connection failed: {errorMsg.replace(/_/g, ' ')}
        </div>
      )}

      {/* Xero Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Plug className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">Xero</h2>
                <p className="text-xs text-slate-500">Accounting, payroll, and invoicing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  Not connected
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          {isConnected ? (
            <div className="space-y-4">
              {/* Connection info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Organisation:</span>
                  <span className="ml-2 font-medium text-slate-800">
                    {xeroConnection.xero_tenant_name || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Last synced:</span>
                  <span className="ml-2 font-medium text-slate-800">
                    {xeroConnection.last_sync_at
                      ? new Date(xeroConnection.last_sync_at).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })
                      : 'Never'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handleSync}
                  disabled={busy === 'sync'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {busy === 'sync' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Sync Timesheets
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={handleSyncPayRates}
                    disabled={busy === 'payrates'}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
                  >
                    {busy === 'payrates' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Sync Pay Rates
                  </button>
                )}

                {userRole === 'admin' && (
                  <button
                    onClick={handleDisconnect}
                    disabled={busy === 'disconnect'}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    {busy === 'disconnect' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Disconnect
                  </button>
                )}
              </div>

              {/* Sync result */}
              {syncResult && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                  Imported {syncResult.imported} timesheet entries.
                  {syncResult.errors.length > 0 && (
                    <div className="mt-1 text-red-600">
                      {syncResult.errors.length} error(s): {syncResult.errors[0]}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Connect your Xero account to sync timesheets, push invoices, and pull employee pay rates automatically.
              </p>
              {userRole === 'admin' ? (
                <button
                  onClick={handleConnect}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plug className="w-4 h-4" />
                  Connect Xero
                </button>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  Only admins can connect Xero. Ask your admin to set this up.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unassigned Hours Queue */}
      {isConnected && entries.length > 0 && (
        <div className="mt-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-semibold text-slate-900">
                Unassigned Hours ({entries.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              These timesheet entries couldn't be auto-matched to a job. Assign them manually or ignore.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {entries.map(entry => (
              <div key={entry.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-800">{entry.employee_name}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(entry.date).toLocaleDateString('en-AU', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {entry.hours}h
                      {entry.hourly_rate != null && ` @ A$${Number(entry.hourly_rate).toFixed(2)}/hr`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {assigningId === entry.id ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <select
                            value={selectedJobId}
                            onChange={e => setSelectedJobId(e.target.value)}
                            className="appearance-none text-sm border border-slate-300 rounded-lg px-3 py-1.5 pr-10 bg-white"
                          >
                            <option value="">Select job...</option>
                            {jobs.map(j => (
                              <option key={j.id} value={j.id}>
                                {j.job_number} — {j.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        <button
                          onClick={() => handleAssign(entry.id)}
                          disabled={!selectedJobId || busy === `assign-${entry.id}`}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {busy === `assign-${entry.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </button>
                        <button
                          onClick={() => { setAssigningId(null); setSelectedJobId('') }}
                          className="p-1.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setAssigningId(entry.id)}
                          className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                        >
                          Assign to Job
                        </button>
                        <button
                          onClick={() => handleIgnore(entry.id)}
                          disabled={busy === `ignore-${entry.id}`}
                          className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          {busy === `ignore-${entry.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Ignore'
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
