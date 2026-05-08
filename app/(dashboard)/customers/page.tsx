import { getCustomers } from '@/app/actions/customers'
import CustomersList from './customers-list'

export default async function CustomersPage() {
  const customers = await getCustomers()
  return <CustomersList customers={customers} />
}
