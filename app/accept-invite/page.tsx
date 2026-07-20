'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { AuthShell } from '@/components/auth-shell'
import { friendlyAuthError, friendlyDbError } from '@/lib/errors'

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

type InviteStatus = 'loading' | 'valid' | 'invalid'

export default function AcceptInvitePage() {
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [firstName, setFirstName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace('#', ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError || !data.session) {
          setStatus('invalid')
          return
        }

        const fullName = data.session.user.user_metadata?.full_name as string | undefined
        if (fullName) setFirstName(fullName.split(' ')[0])
        setStatus('valid')
        return
      }

      // Session may already be set via the auth callback route.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const fullName = user.user_metadata?.full_name as string | undefined
        if (fullName) setFirstName(fullName.split(' ')[0])
        setStatus('valid')
      } else {
        setStatus('invalid')
      }
    }

    init()
  }, [supabase])

  const handleSubmit = async () => {
    setError(null)

    if (password.length < 8) {
      setError('Your password is shorter than 8 characters — pick a longer one.')
      return
    }

    if (password !== confirm) {
      setError("The two passwords don't match — check both fields and try again.")
      return
    }

    setSubmitting(true)

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(
        friendlyAuthError(
          updateError,
          "We couldn't set your password. Try again — if it keeps happening, ask your admin to resend the invite.",
        ),
      )
      setSubmitting(false)
      return
    }

    const user = updateData.user
    if (user) {
      const meta = user.user_metadata
      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        company_id: meta.company_id,
        full_name: meta.full_name,
        phone: meta.phone || null,
        role: meta.role || 'worker',
        email: user.email,
      })

      if (upsertError) {
        console.error('Accept-invite upsert error:', upsertError)
        setError(
          friendlyDbError(
            upsertError,
            "We saved your password, but couldn't finish activating your account. Try signing in directly — if that doesn't work, ask your admin to resend the invite.",
          ),
        )
        setSubmitting(false)
        return
      }
    }

    router.push('/today')
  }

  if (status === 'loading') {
    return (
      <AuthShell title="Loading your invite…">
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        </div>
      </AuthShell>
    )
  }

  if (status === 'invalid') {
    return (
      <AuthShell
        title="This invite link isn't valid"
        subtitle="It may have expired, or it was opened in a different browser than the one that received the email."
        footer={
          <>
            Already activated your account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in instead
            </Link>
          </>
        }
      >
        <div className="space-y-4 text-sm text-slate-600">
          <p>
            Ask your admin to send you a fresh invite, then open it from the same device and
            browser where you receive your email.
          </p>
          <Link
            href="/login"
            className="block w-full rounded-full border border-slate-200 bg-white px-6 py-3 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    )
  }

  const isValid = password.length >= 8 && confirm.length >= 8 && password === confirm
  const passwordMismatch = confirm.length > 0 && password !== confirm

  return (
    <AuthShell
      title={firstName ? `Welcome, ${firstName}.` : 'Welcome.'}
      subtitle="Set your password to activate your account."
    >
      <form
        onSubmit={e => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-5"
      >
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
          <p className="mt-1.5 text-xs text-slate-500">8 characters or more.</p>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
          {passwordMismatch && (
            <p className="mt-1.5 text-xs text-red-600">Passwords don&apos;t match.</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || submitting}
          className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {submitting ? 'Activating…' : 'Activate account'}
        </button>
      </form>
    </AuthShell>
  )
}
