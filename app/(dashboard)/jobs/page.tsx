import Link from 'next/link'
import { getJobs } from '@/app/actions/jobs'
import { JobsList } from './jobs-list'

export default async function JobsPage() {
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