import Link from 'next/link'
import { Package, ChevronRight, Calculator, Layers, Plug, Webhook, Building2, ClipboardList, Mail } from 'lucide-react'
import { requireAdminOrManager } from '@/lib/auth/require-role'

// Pastel category palette per CLAUDE_REFERENCE/brand.md §6.1.
// Parts+Products share Slate-blue (paired concept); Pay Rules+Integrations share Mint (admin/system grouping).
const SETTINGS_SECTIONS = [
  {
    href: '/settings/company',
    icon: Building2,
    iconBg: '#ddd6fe', // Lavender
    iconColor: '#8b5cf6',
    title: 'Company Profile',
    description: 'Company details, logo, ABN, and brand colours.',
  },
  {
    href: '/settings/evidence',
    icon: ClipboardList,
    iconBg: '#fed7aa', // Peach
    iconColor: '#f97316',
    title: 'Evidence Categories',
    description: 'Configure job categories, subcategories, and default evidence questions.',
  },
  {
    href: '/settings/parts',
    icon: Package,
    iconBg: '#e0e7ff', // Slate-blue
    iconColor: '#6366f1',
    title: 'Parts Catalogue',
    description: 'Manage individual parts — buy cost, sell price, margin, supplier.',
  },
  {
    href: '/settings/products',
    icon: Layers,
    iconBg: '#e0e7ff', // Slate-blue (paired with Parts)
    iconColor: '#6366f1',
    title: 'Products',
    description: 'Create bundles of parts with auto-calculated costs and margins.',
  },
  {
    href: '/settings/pay-rules',
    icon: Calculator,
    iconBg: '#d1fae5', // Mint
    iconColor: '#10b981',
    title: 'Pay Rules',
    description: 'Configure your award package and overtime calculation rules.',
  },
  {
    href: '/settings/integrations',
    icon: Plug,
    iconBg: '#d1fae5', // Mint (paired with Pay Rules — admin/system)
    iconColor: '#10b981',
    title: 'Integrations',
    description: 'Connect Xero for timesheets, invoices, and payroll sync.',
  },
  {
    href: '/settings/notifications',
    icon: Mail,
    iconBg: '#fef3c7', // Butter
    iconColor: '#f59e0b',
    title: 'Email Notifications',
    description: 'Choose which events trigger emails and who receives them.',
  },
  {
    href: '/settings/webhooks',
    icon: Webhook,
    iconBg: '#fef9c3', // Lemon
    iconColor: '#eab308',
    title: 'Webhooks & API',
    description: 'Send real-time events to n8n, Zapier, or Make and manage API keys.',
  },
]

export default async function SettingsPage() {
  await requireAdminOrManager()
  return (
    <div className="w-full p-8">
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
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: section.iconBg }}
              >
                <Icon className="w-5 h-5" style={{ color: section.iconColor }} />
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
