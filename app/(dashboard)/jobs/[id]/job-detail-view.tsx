'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, User, Calendar, Users, FileText, Camera, Package, Building2, DollarSign, ClipboardList } from 'lucide-react'
import MaterialLog from './execute/material-log'
import JobCostSummary from './job-cost-summary'
import BuildingStructure from './building-structure'
import EvidenceTab from './evidence-tab'
import JobCostTab from './job-cost-tab'
import ReportTab from './report-tab'

type Tab = 'overview' | 'evidence' | 'materials' | 'structure' | 'cost' | 'report'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-orange-100 text-orange-800',
}

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  urgent: 'text-red-600',
}

interface Props {
  job: any
  userId: string
  userRole: string
}

export default function JobDetailView({ job, userId, userRole }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const statusStyle = STATUS_STYLES[job.status] || 'bg-gray-100 text-gray-800'
  const priorityStyle = PRIORITY_STYLES[job.priority] || 'text-gray-600'
  const canExecute = job.status === 'scheduled' || job.status === 'in_progress'

  const isAdminOrManager = userRole === 'admin' || userRole === 'manager'

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: FileText },
    { id: 'evidence' as Tab, label: 'Evidence', icon: Camera },
    { id: 'materials' as Tab, label: 'Materials', icon: Package },
    { id: 'structure' as Tab, label: 'Structure', icon: Building2 },
    ...(isAdminOrManager ? [{ id: 'cost' as Tab, label: 'Cost', icon: DollarSign }] : []),
    ...(isAdminOrManager ? [{ id: 'report' as Tab, label: 'Report', icon: ClipboardList }] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="bg-slate-50 pt-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-xl border border-slate-200 px-6 pt-5 pb-0">

            {/* Back arrow + breadcrumb */}
            <div className="flex items-center gap-2 mt-3 mb-3">
              <Link
                href="/jobs"
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              </Link>
              <Link href="/jobs" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
                Jobs
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-sm text-slate-500">{job.job_number}</span>
            </div>

            {/* Title row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusStyle}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                  <span className={`text-sm font-medium capitalize ${priorityStyle}`}>
                    {job.priority} priority
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-shrink-0">
                {canExecute && (
                  <Link
                    href={`/jobs/${job.id}/execute`}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ▶ {job.status === 'in_progress' ? 'Continue Job' : 'Start Job'}
                  </Link>
                )}
                <Link
                  href={`/jobs/${job.id}/edit`}
                  className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900 transition-colors"
                >
                  Edit Job
                </Link>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4 border-b border-slate-200 -mx-6 px-1">
              {tabs.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">

                {/* Customer */}
                <div className="flex gap-4 p-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-0.5">Customer</p>
                    <p className="text-sm font-semibold text-slate-800">{job.customer?.name}</p>
                    {job.customer?.email && (
                      <p className="text-xs text-slate-500">{job.customer.email}</p>
                    )}
                    {job.customer?.phone && (
                      <p className="text-xs text-slate-500">{job.customer.phone}</p>
                    )}
                  </div>
                </div>

                {/* Site */}
                {(job.site_address_line1 || job.site_name) && (
                  <div className="flex gap-4 p-4">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Site</p>
                      {job.site_name && (
                        <p className="text-sm font-semibold text-slate-800">{job.site_name}</p>
                      )}
                      {job.site_address_line1 && (
                        <p className="text-xs text-slate-500">
                          {[job.site_address_line1, job.site_city, job.site_state, job.site_postcode]
                            .filter(Boolean).join(', ')}
                        </p>
                      )}
                      {job.site_manager && (
                        <p className="text-xs text-slate-500 mt-1">
                          Site Manager: <span className="font-medium text-slate-700">{job.site_manager}</span>
                          {job.site_manager_phone && ` · ${job.site_manager_phone}`}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Schedule */}
                <div className="flex gap-4 p-4">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Scheduled Start</p>
                      <p className="text-sm text-slate-800">
                        {job.scheduled_start
                          ? new Date(job.scheduled_start).toLocaleString('en-AU', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : 'Not scheduled'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-0.5">Scheduled End</p>
                      <p className="text-sm text-slate-800">
                        {job.scheduled_end
                          ? new Date(job.scheduled_end).toLocaleString('en-AU', {
                              day: 'numeric', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })
                          : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned Workers */}
                {job.assignments && job.assignments.length > 0 && (
                  <div className="flex gap-4 p-4">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1.5">Assigned Workers</p>
                      <div className="space-y-1">
                        {job.assignments.map((a: any) => (
                          <div key={a.id} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                              <span className="text-xs font-medium text-slate-600">
                                {a.user.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <span className="text-sm text-slate-700">{a.user.full_name}</span>
                            {a.role && (
                              <span className="text-xs text-slate-400 capitalize">({a.role})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {job.description && (
                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.description}</p>
                  </div>
                )}

                {/* Notes */}
                {job.notes && (
                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{job.notes}</p>
                  </div>
                )}

              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {(job.started_at || job.completed_at) && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Times</p>
                  {job.started_at && (
                    <div>
                      <p className="text-xs text-slate-500">Started</p>
                      <p className="text-sm font-medium text-slate-800">
                        {new Date(job.started_at).toLocaleString('en-AU', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                  {job.completed_at && (
                    <div>
                      <p className="text-xs text-slate-500">Completed</p>
                      <p className="text-sm font-medium text-slate-800">
                        {new Date(job.completed_at).toLocaleString('en-AU', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <JobCostSummary jobId={job.id} compact />
            </div>
          </div>
        )}

        {/* Evidence Tab */}
        {activeTab === 'evidence' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Evidence</h2>
              {canExecute && (
                <Link href={`/jobs/${job.id}/execute`} className="text-xs text-blue-600 hover:underline">
                  + Log penetrations →
                </Link>
              )}
            </div>
            <EvidenceTab jobId={job.id} userRole={userRole} />
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Materials Log</h2>
                {canExecute && (
                  <Link href={`/jobs/${job.id}/execute`} className="text-xs text-blue-600 hover:underline">
                    + Log materials →
                  </Link>
                )}
              </div>
              <MaterialLog jobId={job.id} userRole={userRole} />
            </div>
            <JobCostSummary jobId={job.id} />
          </div>
        )}

        {/* Structure Tab */}
        {activeTab === 'structure' && (
          <div className="mt-4">
            <BuildingStructure
              siteId={job.id}
              companyId={job.company_id}
              userRole={userRole}
            />
          </div>
        )}

        {/* Cost Tab (admin/manager only) */}
        {activeTab === 'cost' && isAdminOrManager && (
          <JobCostTab jobId={job.id} />
        )}

        {/* Report Tab (admin/manager only) */}
        {activeTab === 'report' && isAdminOrManager && (
          <ReportTab jobId={job.id} jobNumber={job.job_number} />
        )}

      </div>
    </div>
  )
}
