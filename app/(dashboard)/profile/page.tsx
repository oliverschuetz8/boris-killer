import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, email, phone, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xl font-bold">
              {profile?.full_name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{profile?.full_name}</p>
            <p className="text-sm text-slate-500 capitalize">{profile?.role}</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="py-3">
            <p className="text-xs font-medium text-slate-400 mb-0.5">Email</p>
            <p className="text-sm text-slate-800">{profile?.email || user.email}</p>
          </div>
          {profile?.phone && (
            <div className="py-3">
              <p className="text-xs font-medium text-slate-400 mb-0.5">Phone</p>
              <p className="text-sm text-slate-800">{profile.phone}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}