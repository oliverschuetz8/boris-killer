import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to jobs
  if (user) {
    redirect('/jobs')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl text-center space-y-8">
        <h1 className="text-5xl font-bold text-gray-900">
          BORIS Killer
        </h1>
        <p className="text-xl text-gray-600">
          Simple, modern construction job management
        </p>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Everything BORIS does, but 10x simpler. No complexity, no confusion, no expensive jumps.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link 
            href="/signup"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition"
          >
            Start Free Trial
          </Link>
          <Link 
            href="/login"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-medium border-2 border-blue-600 hover:bg-blue-50 transition"
          >
            Sign In
          </Link>
        </div>

        <div className="pt-8 text-sm text-gray-500">
          30-day free trial • No credit card required
        </div>
      </div>
    </main>
  )
}