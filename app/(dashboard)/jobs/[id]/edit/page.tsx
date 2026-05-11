import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getJob, getCustomers } from '@/app/actions/jobs'
import JobEditForm from './job-edit-form'

export default async function JobEditPage({
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
  if (profile?.role === 'worker') redirect(`/today`)

  const [job, customers] = await Promise.all([
    getJob(id),
    getCustomers(),
  ])

  if (!job) notFound()

  return (
    <JobEditForm
      job={job}
      customers={customers}
    />
  )
}
