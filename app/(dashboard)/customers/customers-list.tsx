'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import SearchFilter, { type FilterDef } from '@/components/ui/search-filter'
import DeleteCustomerButton from './delete-customer-button'

interface CustomerSite {
  id: string
  city?: string | null
  address_line1?: string | null
  site_name?: string | null
}

interface Customer {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  city?: string | null
  billing_city?: string | null
  billing_address_line1?: string | null
  customer_sites?: CustomerSite[]
}

interface CustomersListProps {
  customers: Customer[]
}

export default function CustomersList({ customers }: CustomersListProps) {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
    city: '',
    sites: '',
  })

  // Build dynamic city options from billing city + every site city
  const cityOptions = useMemo(() => {
    const set = new Set<string>()
    customers.forEach(c => {
      const billing = (c.city || c.billing_city || '').trim()
      if (billing) set.add(billing)
      ;(c.customer_sites || []).forEach(s => {
        const sc = (s.city || '').trim()
        if (sc) set.add(sc)
      })
    })
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b))
    return [
      { value: '', label: 'All cities' },
      ...sorted.map(c => ({ value: c.toLowerCase(), label: c })),
    ]
  }, [customers])

  const filters: FilterDef[] = [
    {
      key: 'city',
      label: 'City',
      options: cityOptions,
    },
    {
      key: 'sites',
      label: 'Sites',
      options: [
        { value: '', label: 'Any' },
        { value: 'has', label: 'With sites' },
        { value: 'none', label: 'No sites yet' },
      ],
    },
  ]

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const cityFilter = activeFilters.city
    const sitesFilter = activeFilters.sites

    return customers.filter(c => {
      // City filter — match billing city OR any site city
      if (cityFilter) {
        const billing = (c.city || c.billing_city || '').toLowerCase()
        const siteCities = (c.customer_sites || [])
          .map(s => (s.city || '').toLowerCase())
        if (billing !== cityFilter && !siteCities.includes(cityFilter)) {
          return false
        }
      }

      // Sites filter
      if (sitesFilter === 'has' && (c.customer_sites?.length ?? 0) === 0) return false
      if (sitesFilter === 'none' && (c.customer_sites?.length ?? 0) > 0) return false

      // Text search across name, email, phone, city, billing address, all site cities + addresses
      if (q) {
        const haystack = [
          c.name,
          c.email,
          c.phone,
          c.city,
          c.billing_city,
          c.billing_address_line1,
          ...(c.customer_sites || []).flatMap(s => [s.city, s.address_line1, s.site_name]),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [customers, search, activeFilters])

  function handleFilterChange(key: string, value: string) {
    setActiveFilters(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">
            {filtered.length === customers.length
              ? `${customers.length} total`
              : `${filtered.length} of ${customers.length}`}
          </p>
        </div>
        <Link href="/customers/new">
          <Button>+ New Customer</Button>
        </Link>
      </div>

      {/* Search + filter */}
      {customers.length > 0 && (
        <div className="mb-5">
          <SearchFilter
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search customers by name, email, city…"
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        </div>
      )}

      {/* List */}
      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-sm">No customers yet.</p>
          <Link href="/customers/new">
            <Button className="mt-4">Create your first customer</Button>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-sm">No customers match your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sites</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/customers/${customer.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {customer.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.email || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{customer.city || customer.billing_city || '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {customer.customer_sites?.length ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-6">
                      <Link href={`/customers/${customer.id}`} className="text-blue-600 hover:text-blue-800">
                        View
                      </Link>
                      <Link href={`/customers/${customer.id}/edit`} className="text-blue-600 hover:text-blue-800">
                        Edit
                      </Link>
                      <DeleteCustomerButton id={customer.id} name={customer.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
