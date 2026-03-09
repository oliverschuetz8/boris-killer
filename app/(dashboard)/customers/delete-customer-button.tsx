'use client'

import { useRouter } from 'next/navigation'
import { deleteCustomer } from '@/app/actions/customers'

export default function DeleteCustomerButton({ id, name }: { id: string, name: string }) {
  const router = useRouter()

  async function handleDelete() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    try {
      await deleteCustomer(id)
      router.refresh()
    } catch {
      alert('Failed to delete customer.')
    }
  }

  return (
    <button onClick={handleDelete} className="text-red-600 hover:text-red-800">
      Delete
    </button>
  )
}
