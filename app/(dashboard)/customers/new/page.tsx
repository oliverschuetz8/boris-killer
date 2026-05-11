import { requireAdminOrManager } from '@/lib/auth/require-role'
import NewCustomerForm from './new-customer-form'

export default async function NewCustomerPage() {
  await requireAdminOrManager()
  return <NewCustomerForm />
}
