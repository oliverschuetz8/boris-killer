'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace('#', ''))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
  
    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ data: { session } }) => {
        const user = session?.user
        if (user?.user_metadata?.full_name) {
          setName(user.user_metadata.full_name.split(' ')[0])
        }
      })
    } else {
      // Session may already be set via callback route
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user?.user_metadata?.full_name) {
          setName(user.user_metadata.full_name.split(' ')[0])
        }
      })
    }
  }, [])

  async function handleSetPassword() {
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user }, error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    if (user) {
      const meta = user.user_metadata
      // Create users record
      await supabase.from('users').upsert({
        id: user.id,
        company_id: meta.company_id,
        full_name: meta.full_name,
        phone: meta.phone || null,
        role: meta.role || 'worker',
        email: user.email,
      })
    }

    router.push('/today')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-slate-200 p-8 w-full max-w-sm">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-5">
          <span className="text-white font-bold text-lg">A</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1">
          {name ? `Welcome, ${name}!` : 'Welcome!'}
        </h1>
        <p className="text-sm text-slate-500 mb-6">Set a password to activate your account.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
            <input
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Confirm Password</label>
            <input
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            onClick={handleSetPassword}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? 'Activating...' : 'Activate Account →'}
          </button>
        </div>
      </div>
    </div>
  )
}