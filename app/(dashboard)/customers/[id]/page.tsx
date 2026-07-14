import { notFound } from 'next/navigation'
import {
  getCustomer,
  getCustomerContacts,
  getCustomerJobs,
  getCustomerActivity,
  getCompanyUsers,
} from '@/app/actions/customers'
import { requireAdminOrManager } from '@/lib/auth/require-role'
import CustomerHub from './customer-hub'

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminOrManager()
  const { id } = await params

  const customer = await getCustomer(id)
  if (!customer) notFound()

  // Fetch the hub data in parallel
  const [contacts, jobs, activity, companyUsers] = await Promise.all([
    getCustomerContacts(id),
    getCustomerJobs(id),
    getCustomerActivity(id),
    getCompanyUsers(),
  ])

  return (
    <CustomerHub
      customer={customer}
      contacts={contacts}
      jobs={jobs}
      activity={activity}
      companyUsers={companyUsers}
    />
  )
}
