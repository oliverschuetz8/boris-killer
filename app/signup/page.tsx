'use client'

import { useActionState, useRef, useState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { AuthShell } from '@/components/auth-shell'

const initialState = { error: '' }

const inputClass =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, initialState)
  const formRef = useRef<HTMLFormElement>(null)
  const [isValid, setIsValid] = useState(false)
  const [passwordMismatch, setPasswordMismatch] = useState(false)

  const checkValidity = () => {
    const form = formRef.current
    if (!form) {
      setIsValid(false)
      setPasswordMismatch(false)
      return
    }
    const password = (form.elements.namedItem('password') as HTMLInputElement | null)?.value ?? ''
    const passwordConfirm =
      (form.elements.namedItem('password_confirm') as HTMLInputElement | null)?.value ?? ''
    const passwordsMatch = password === passwordConfirm
    setIsValid(form.checkValidity() && passwordsMatch)
    setPasswordMismatch(passwordConfirm.length > 0 && !passwordsMatch)
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="30-day trial. No card."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-slate-700">
              First name
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              autoComplete="given-name"
              required
              className={inputClass}
              placeholder="Sarah"
            />
          </div>
          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-slate-700">
              Last name
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              autoComplete="family-name"
              required
              className={inputClass}
              placeholder="Davies"
            />
          </div>
        </div>

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
          <label htmlFor="company_name" className="block text-sm font-medium text-slate-700">
            Company name
          </label>
          <input
            id="company_name"
            name="company_name"
            type="text"
            autoComplete="organization"
            required
            className={inputClass}
            placeholder="Acme Fire Protection Pty Ltd"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
            placeholder="••••••••"
          />
          <p className="mt-1.5 text-xs text-slate-500">8 characters or more.</p>
        </div>

        <div>
          <label htmlFor="password_confirm" className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="password_confirm"
            name="password_confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className={inputClass}
            placeholder="••••••••"
          />
          {passwordMismatch && (
            <p className="mt-1.5 text-xs text-red-600">Passwords don&apos;t match.</p>
          )}
        </div>

        <label className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            name="terms_accepted"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
          />
          <span className="text-sm text-slate-600">
            I agree to the{' '}
            <Link href="/terms" className="font-medium text-slate-900 underline underline-offset-2 hover:text-blue-600">
              terms of service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-slate-900 underline underline-offset-2 hover:text-blue-600">
              privacy policy
            </Link>
            .
          </span>
        </label>

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
          {isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  )
}
