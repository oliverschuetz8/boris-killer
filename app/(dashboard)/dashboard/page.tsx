import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats } from '@/lib/services/dashboard'
import { redirect } from 'next/navigation'
import { Briefcase, Calendar, FileText, Users, ArrowRight } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, full_name, companies(name)')
    .eq('id', user.id)
    .single()

    if (!profile?.company_id) redirect('/onboarding')

    const { data: roleData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (roleData?.role === 'worker') redirect('/today')

  const stats = await getDashboardStats(profile.company_id)

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
      label: 'Scheduled Today',
      value: stats.scheduledToday,
      icon: Calendar,
      href: '/jobs',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Pending Invoices',
      value: stats.pendingInvoices,
      icon: FileText,
      href: '/invoices',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Customers',
      value: stats.totalCustomers,
      icon: Users,
      href: '/customers',
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ]

  const companyName = (profile.companies as any)?.name ?? 'your company'
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900" suppressHydrationWarning>
          Good {getTimeOfDay()}, {firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's what's happening at {companyName} today.</p>
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

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/jobs/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            New Job
          </Link>
          <Link
            href="/customers/new"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Users className="w-4 h-4" />
            New Customer
          </Link>
        </div>
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