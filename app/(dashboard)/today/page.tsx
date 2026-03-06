import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TodayView from './today-view'

export default async function TodayPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, company_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Admins don't need Today view
  if (profile.role === 'admin' || profile.role === 'manager') {
    redirect('/dashboard')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get jobs assigned to this worker that are in_progress OR scheduled for today
  const { data: assignments } = await supabase
    .from('job_assignments')
    .select(`
      job:jobs (
        id,
        title,
        job_number,
        status,
        priority,
        site_manager,
        scheduled_start,
        started_at,
        customer:customers (name, phone),
        site:customer_sites (site_name, address_line1, city, postcode)
      )
    `)
    .eq('user_id', user.id)

  const jobs = (assignments || [])
    .map((a: any) => a.job)
    .filter((job: any) => {
      if (!job) return false
      if (job.status === 'in_progress') return true
      if (job.status === 'scheduled') {
        if (!job.scheduled_start) return true
        const start = new Date(job.scheduled_start)
        return start >= today && start < tomorrow
      }
      return false
    })

  return (
    <TodayView
      jobs={jobs}
      workerName={profile.full_name}
      userId={user.id}
    />
  )
}