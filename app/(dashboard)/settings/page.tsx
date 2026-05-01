import Link from 'next/link'
import { Package, ChevronRight, Calculator, Layers, Plug, Webhook, Building2, ClipboardList } from 'lucide-react'

const SETTINGS_SECTIONS = [
  {
    href: '/settings/company',
    icon: Building2,
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    title: 'Company Profile',
    description: 'Company details, logo, ABN, and brand colours.',
  },
  {
    href: '/settings/evidence',
    icon: ClipboardList,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    title: 'Evidence Categories',
    description: 'Configure job categories, subcategories, and default evidence questions.',
  },
  {
    href: '/settings/parts',
    icon: Package,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Parts Catalogue',
    description: 'Manage individual parts — buy cost, sell price, margin, supplier.',
  },
  {
    href: '/settings/products',
    icon: Layers,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    title: 'Products',
    description: 'Create bundles of parts with auto-calculated costs and margins.',
  },
  {
    href: '/settings/pay-rules',
    icon: Calculator,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    title: 'Pay Rules',
    description: 'Configure your award package and overtime calculation rules.',
  },
  {
    href: '/settings/integrations',
    icon: Plug,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Integrations',
    description: 'Connect Xero for timesheets, invoices, and payroll sync.',
  },
  {
    href: '/settings/webhooks',
    icon: Webhook,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    title: 'Webhooks & API',
    description: 'Send real-time events to n8n, Zapier, or Make and manage API keys.',
  },
]

export default function SettingsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your company settings and preferences.</p>
      </div>

      <div className="space-y-3">
        {SETTINGS_SECTIONS.map(section => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-6 py-4 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className={`w-10 h-10 rounded-lg ${section.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${section.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{section.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
