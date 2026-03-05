import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getJob } from '@/app/actions/jobs'
import JobDetailView from './job-detail-view'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const job = await getJob(id)
  if (!job) notFound()

  return (
    <JobDetailView
      job={job}
      userId={user.id}
      userRole={profile?.role || 'worker'}
    />
  )
}