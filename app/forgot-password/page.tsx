import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Self-serve reset is launching with us — it's not quite live yet."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Back to sign in
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          We&apos;re finishing the password-reset flow before public launch. In the meantime,
          ask your administrator to send you a fresh invite — your account will pick up
          right where you left off.
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
