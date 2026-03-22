import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getJobs } from '@/app/actions/jobs'
import { JobsList } from './jobs-list'
import WorkerJobsView from './worker-jobs-view'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id')
    .eq('id', user.id)
    .single()

  const isWorker = profile?.role === 'worker'

  // Worker: only fetch jobs assigned to them
  if (isWorker) {
    const { data: assignments } = await supabase
      .from('job_assignments')
      .select('job_id')
      .eq('user_id', user.id)

    const assignedJobIds = (assignments || []).map(a => a.job_id)

    if (assignedJobIds.length === 0) {
      return <WorkerJobsView jobs={[]} />
    }

    const { data: jobs } = await supabase
      .from('jobs')
      .select(`
        id, title, job_number, status, priority,
        scheduled_start, started_at, site_manager,
        customer:customers(name, phone),
        site:customer_sites(site_name, address_line1, city, state, postcode)
      `)
      .in('id', assignedJobIds)
      .in('status', ['in_progress', 'scheduled'])
      .order('status', { ascending: false })
      .order('scheduled_start', { ascending: true })

    const typedJobs = (jobs || []).map((j: any) => ({
      ...j,
      customer: Array.isArray(j.customer) ? j.customer[0] ?? null : j.customer,
      site: Array.isArray(j.site) ? j.site[0] ?? null : j.site,
    }))

    return <WorkerJobsView jobs={typedJobs} />
  }

  // Admin/manager: full jobs list
  const jobs = await getJobs()

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Jobs</h1>
        <Link
          href="/jobs/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + New Job
        </Link>
      </div>
      <JobsList initialJobs={jobs} />
    </div>
  )
}