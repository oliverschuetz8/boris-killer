'use client'

import Link from 'next/link'
import { Briefcase, CheckCircle2, Users, HardHat, ArrowRight } from 'lucide-react'
import type { DashboardStats, RecentJob } from '@/lib/services/dashboard'

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-orange-100 text-orange-800',
  draft: 'bg-slate-100 text-slate-600',
}

interface Props {
  firstName: string
  companyName: string
  stats: DashboardStats
  recentJobs: RecentJob[]
}

export default function DashboardView({ firstName, companyName, stats, recentJobs }: Props) {
  const cards = [
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
        {cards.map(({ label, value, icon: Icon, href, color, bg }) => (
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
