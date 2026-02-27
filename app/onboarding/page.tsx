'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function completeSetup() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('User error:', userError)
          setError(`Failed to get user: ${userError.message}`)
          return
        }

        if (!user) {
          console.error('No user found')
          router.push('/login')
          return
        }

        console.log('User metadata:', user.user_metadata)

        // Get metadata from signup
        const companyName = user.user_metadata.company_name
        const companySlug = user.user_metadata.company_slug
        const fullName = user.user_metadata.full_name

        if (!companyName || !companySlug) {
          setError('Missing company information from signup')
          setDebugInfo({ user_metadata: user.user_metadata })
          return
        }

        console.log('Calling complete_signup with:', {
          user_id: user.id,
          company_name: companyName,
          company_slug: companySlug,
          full_name: fullName,
        })

        // Call the function to create company
        const { data, error: rpcError } = await supabase.rpc('complete_signup', {
          user_id: user.id,
          company_name: companyName,
          company_slug: companySlug,
          full_name: fullName,
        })

        console.log('RPC response:', { data, error: rpcError })

        // Handle RPC errors (network/database errors)
        if (rpcError) {
          console.error('Complete signup RPC error:', rpcError)
          setError(`Database error: ${rpcError.message || JSON.stringify(rpcError)}`)
          setDebugInfo({ error: rpcError, data })
          return
        }

        // Handle business logic errors returned by the function
        if (data?.error) {
          console.error('Complete signup returned error:', data.error)
          setError(`Setup failed: ${data.error}`)
          setDebugInfo({ data })
          return
        }

        // Verify success
        if (!data?.success) {
          console.error('Unexpected response:', data)
          setError('Signup completion failed - unexpected response from server')
          setDebugInfo({ data })
          return
        }

        // Success!
        console.log('Success! Company created:', data.company_id)
        console.log('Redirecting to jobs...')
        router.push('/jobs')

      } catch (err: any) {
        console.error('Unexpected error in completeSetup:', err)
        setError(`Unexpected error: ${err.message}`)
        setDebugInfo({ err: err.toString() })
      }
    }

    completeSetup()
  }, [router, supabase])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-2xl">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Setup Failed</h1>
          <p className="text-gray-900 mb-4 font-mono text-sm bg-red-50 p-4 rounded">
            {error}
          </p>
          {debugInfo && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-gray-600 mb-2">
                Debug Info (click to expand)
              </summary>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
          <div className="mt-6 space-x-4">
            <a href="/signup" className="text-blue-600 hover:underline">
              Try signing up again
            </a>
            <a href="/login" className="text-blue-600 hover:underline">
              Or try logging in
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold text-gray-900">Setting up your account...</h1>
        <p className="text-gray-600 mt-2">This will only take a moment</p>
      </div>
    </div>
  )
}