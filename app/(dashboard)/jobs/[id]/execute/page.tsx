import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getJob } from '@/app/actions/jobs'
import ExecutionView from './execution-view'

export default async function JobExecutePage({
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
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  const job = await getJob(id)
  if (!job) notFound()

  // Don't allow execution of cancelled or already-completed jobs
  if (job.status === 'cancelled') redirect(`/jobs/${id}`)

  return <ExecutionView job={job} userId={user.id} userName={profile?.full_name ?? 'Tech'} />
}