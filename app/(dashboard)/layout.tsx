import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNav from '@/components/layout/top-nav'
import WorkerBottomNav from '@/components/layout/worker-bottom-nav'
import WorkerClockBar from '@/components/layout/worker-clock-bar'
import { getUpcomingSummary } from '@/lib/services/notifications'
import { getCurrentClockState } from '@/lib/services/time-tracking'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*, companies(*)')
    .eq('id', user.id)
    .single()

  const isWorker = userData?.role === 'worker'
  const upcoming = await getUpcomingSummary()

  // Workers get the sticky clock bar; admins/managers don't
  let clockState = null
  if (isWorker) {
    clockState = await getCurrentClockState(supabase, user.id)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav user={userData} upcomingCount={upcoming.count} />
      {isWorker && clockState && <WorkerClockBar initialState={clockState} />}
     <main className={`w-full px-4 sm:px-6 lg:px-8 py-8 ${isWorker ? 'pb-24' : ''}`}>
        {children}
      </main>
      {isWorker && <WorkerBottomNav />}
    </div>
  )
}
