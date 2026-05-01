import { notFound } from 'next/navigation'
import { getJob, getCustomers } from '@/app/actions/jobs'
import JobEditForm from './job-edit-form'

export default async function JobEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
