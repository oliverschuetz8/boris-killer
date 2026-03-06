'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Building2,
} from 'lucide-react'

const adminNavLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/schedule', label: 'Schedule', icon: Calendar },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/settings/team', label: 'Team', icon: Users },
  { href: '/settings/materials', label: 'Settings', icon: Settings },
]

const workerNavLinks = [
  { href: '/today', label: 'Today', icon: Calendar },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
]

interface TopNavProps {
  user: {
    full_name: string
    email: string
    role: string
    companies: {
      name: string
    } | null
  } | null
}

export default function TopNav({ user }: TopNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isWorker = user?.role === 'worker'
  const navLinks = isWorker ? workerNavLinks : adminNavLinks

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const companyName = user?.companies?.name ?? 'AUTONYX'
  const userName = user?.full_name ?? 'User'
  const userEmail = user?.email ?? ''

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: Logo + Company */}
          <div className="flex items-center gap-6">
          <Link href={isWorker ? '/today' : '/dashboard'} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-sm hidden sm:block">
                {companyName}
              </span>
            </Link>

            {/* Nav Links */}
            <nav className={`hidden ${isWorker ? '!hidden' : 'md:flex'} items-center gap-1`}>
              {navLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right: User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800 px-2"
              >
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm hidden sm:block">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{userName}</span>
                  <span className="text-xs text-slate-500 font-normal">{userEmail}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-2 text-red-600 cursor-pointer focus:text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  )
}