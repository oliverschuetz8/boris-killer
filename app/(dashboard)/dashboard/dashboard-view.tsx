'use client'

import Link from 'next/link'
import { Briefcase, CheckCircle2, Users, HardHat, ArrowRight, PieChart as PieChartIcon, BarChart3, DollarSign, UserCheck } from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import type {
  DashboardStats, RecentJob, JobStatusBreakdown, CompletionOverTime, RevenueSummary, WorkerJobCount,
} from '@/lib/services/dashboard'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-orange-100 text-orange-800',
  draft: 'bg-slate-100 text-slate-600',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#eab308',
  completed: '#22c55e',
  cancelled: '#6b7280',
  on_hold: '#f97316',
  draft: '#64748b',
}

interface Props {
  firstName: string
  companyName: string
  stats: DashboardStats
  recentJobs: RecentJob[]
  statusBreakdown: JobStatusBreakdown[]
  completionOverTime: CompletionOverTime[]
  revenueSummary: RevenueSummary
  jobsPerWorker: WorkerJobCount[]
}

function formatCurrency(amount: number): string {
  return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function DashboardView({
  firstName, companyName, stats, recentJobs,
  statusBreakdown, completionOverTime, revenueSummary, jobsPerWorker,
}: Props) {
  const statCards = [
    {
      label: 'Active Jobs',
      value: stats.activeJobs,
      icon: Briefcase,
      href: '/jobs',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Completed This Month',
      value: stats.completedThisMonth,
      icon: CheckCircle2,
      href: '/jobs',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Total Workers',
      value: stats.totalWorkers,
      icon: Users,
      href: '/settings/team',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Workers On Site',
      value: stats.workersOnSite,
      icon: HardHat,
      href: '/jobs',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  const totalJobs = statusBreakdown.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900" suppressHydrationWarning>
          Good {getTimeOfDay()}, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s what&apos;s happening at {companyName} today.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Job Status Breakdown — Donut */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Job Status Breakdown</h2>
          </div>
          <div className="px-6 py-4" aria-label="Job status breakdown pie chart">
            {statusBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px]">
                <Briefcase className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No jobs yet</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="status"
                    >
                      {statusBreakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [String(value), formatStatus(String(name))]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    />
                    {/* Centre label */}
                    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-2xl font-bold">
                      {totalJobs}
                    </text>
                    <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="fill-slate-400 text-xs">
                      Total Jobs
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {statusBreakdown.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[entry.status] || '#94a3b8' }} />
                      {formatStatus(entry.status)} ({entry.count})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Completion Rate — Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Jobs Completed (Last 6 Months)</h2>
          </div>
          <div className="px-6 py-4" aria-label="Jobs completed per month bar chart">
            {completionOverTime.every(m => m.count === 0) ? (
              <div className="flex flex-col items-center justify-center h-[250px]">
                <CheckCircle2 className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No jobs completed yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={completionOverTime} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    formatter={(value) => [String(value), 'Completed']}
                  />
                  <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {/* Revenue Summary — Mini Cards */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Revenue Summary</h2>
          </div>
          <div className="px-6 py-4" aria-label="Revenue summary by invoice status">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Draft', value: revenueSummary.draft, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
                { label: 'Sent', value: revenueSummary.sent, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                { label: 'Paid', value: revenueSummary.paid, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
                { label: 'Overdue', value: revenueSummary.overdue, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
              ].map((item) => (
                <div key={item.label} className={`${item.bg} rounded-lg border ${item.border} px-4 py-3`}>
                  <p className="text-xs font-medium text-slate-500 mb-1">{item.label}</p>
                  <p className={`text-lg font-bold ${item.color}`}>{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Jobs Per Worker — Horizontal Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-800">Jobs Per Worker</h2>
          </div>
          <div className="px-6 py-4" aria-label="Jobs per worker horizontal bar chart">
            {jobsPerWorker.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[250px]">
                <Users className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No workers assigned yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(250, jobsPerWorker.length * 40)}>
                <BarChart data={jobsPerWorker} layout="vertical" barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    formatter={(value) => [String(value), 'Jobs']}
                  />
                  <Bar dataKey="jobs" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recent Jobs</h2>
          <Link href="/jobs" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No jobs yet.</p>
            <Link href="/jobs/new" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              Create your first job
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Job #</th>
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled</th>
                  <th className="text-left px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/jobs/${job.id}`} className="text-blue-600 font-medium hover:underline">
                        {job.job_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-800">
                      <Link href={`/jobs/${job.id}`} className="hover:text-blue-600 transition-colors">
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {job.customer?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[job.status] || 'bg-gray-100 text-gray-800'}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {job.scheduled_start
                        ? new Date(job.scheduled_start).toLocaleDateString('en-AU', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            timeZone: 'Australia/Sydney',
                          })
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-6 py-3">
                      {job.assignments.length > 0 ? (
                        <div className="flex items-center -space-x-2">
                          {job.assignments.slice(0, 3).map(a => (
                            <div
                              key={a.id}
                              title={a.user.full_name || 'Unknown'}
                              className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center"
                            >
                              <span className="text-xs font-medium text-slate-600">
                                {a.user.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                          ))}
                          {job.assignments.length > 3 && (
                            <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center">
                              <span className="text-xs font-medium text-slate-500">
                                +{job.assignments.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Unassigned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
