import { notFound } from 'next/navigation'
import { getCustomer, getCompanyUsers } from '@/app/actions/customers'
import { requireAdminOrManager } from '@/lib/auth/require-role'
import CustomerEditForm from './customer-edit-form'

export default async function CustomerEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminOrManager()
  const { id } = await params
  const [customer, companyUsers] = await Promise.all([
    getCustomer(id),
    getCompanyUsers(),
  ])

  if (!customer) notFound()

  return <CustomerEditForm customer={customer} companyUsers={companyUsers} />
}
