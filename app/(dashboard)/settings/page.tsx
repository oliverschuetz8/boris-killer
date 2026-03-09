import Link from 'next/link'
import { Package, ChevronRight } from 'lucide-react'

const SETTINGS_SECTIONS = [
  {
    href: '/settings/materials',
    icon: Package,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    title: 'Materials Catalogue',
    description: 'Manage materials and prices for job costing.',
  },
]

export default function SettingsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your company settings and preferences.</p>
      </div>

      <div className="space-y-3">
        {SETTINGS_SECTIONS.map(section => {
          const Icon = section.icon
          return (
            <Link
              key={section.href}
              href={section.href}
              className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-6 py-8 hover:border-slate-300 hover:shadow-sm transition-all group"
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
