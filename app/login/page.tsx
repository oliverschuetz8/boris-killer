'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { AuthShell } from '@/components/auth-shell'

const initialState = { error: '' }

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const [isValid, setIsValid] = useState(false)

  const checkValidity = () => {
    setIsValid(formRef.current?.checkValidity() ?? false)
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700">
            Start free trial
          </Link>
        </>
      }
    >
      <form
        ref={formRef}
        action={formAction}
        onInput={checkValidity}
        onChange={checkValidity}
        className="space-y-5"
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            placeholder="sarah@acmefire.com.au"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            placeholder="••••••••"
          />
        </div>

        {state?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || isPending}
          className="w-full rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  )
}
