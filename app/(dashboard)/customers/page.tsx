import { getCustomers } from '@/app/actions/customers'
import { requireAdminOrManager } from '@/lib/auth/require-role'
import CustomersList from './customers-list'

export default async function CustomersPage() {
  await requireAdminOrManager()
  const customers = await getCustomers()
  return <CustomersList customers={customers} />
}
