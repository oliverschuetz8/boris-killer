'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Get form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const companyName = formData.get('company_name') as string
  const companySlug = formData.get('company_slug') as string

  // Validate
  if (!email || !password || !fullName || !companyName || !companySlug) {
    return { error: 'All fields are required' }
  }

  // Sign up the user first (this creates auth.users + triggers user profile creation)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        company_name: companyName,
        company_slug: companySlug,
      },
    },
  })

  if (authError) {
    console.error('Signup error:', authError)
    return { error: authError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login error:', error)
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/jobs')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*, company:companies(*)')
    .eq('id', user.id)
    .single()

  return profile
}