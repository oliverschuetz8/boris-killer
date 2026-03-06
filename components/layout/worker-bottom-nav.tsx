'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Briefcase, User } from 'lucide-react'

const tabs = [
  { href: '/today', label: 'Today', icon: CalendarDays },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/profile', label: 'Profile', icon: User },
]

export default function WorkerBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 safe-area-pb">
      <div className="flex items-stretch h-16">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 h-0.5 w-12 bg-blue-600 rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}