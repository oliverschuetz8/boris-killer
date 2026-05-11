import { requireAdminOrManager } from '@/lib/auth/require-role'
import NewJobForm from './new-job-form'

export default async function NewJobPage() {
  await requireAdminOrManager()
  return <NewJobForm />
}
