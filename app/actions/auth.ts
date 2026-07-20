'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { slugify } from '@/lib/brand'
import { friendlyAuthError } from '@/lib/errors'

export async function signup(prevState: { error: string }, formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''
  const passwordConfirm = (formData.get('password_confirm') as string | null) ?? ''
  const firstName = (formData.get('first_name') as string | null)?.trim() ?? ''
  const lastName = (formData.get('last_name') as string | null)?.trim() ?? ''
  const companyName = (formData.get('company_name') as string | null)?.trim() ?? ''
  const termsAccepted = formData.get('terms_accepted') === 'on'

  if (!email || !firstName || !lastName || !companyName || !password) {
    return { error: 'Please fill in every field — none are optional.' }
  }

  if (password.length < 8) {
    return { error: 'Your password is shorter than 8 characters — pick a longer one.' }
  }

  if (password !== passwordConfirm) {
    return { error: "The two passwords don't match — check both fields and try again." }
  }

  if (!termsAccepted) {
    return { error: 'You need to accept the terms and privacy policy to create an account.' }
  }

  const fullName = `${firstName} ${lastName}`
  const companySlug = slugify(companyName)

  const { error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        company_slug: companySlug,
        terms_accepted_at: new Date().toISOString(),
      },
    },
  })

  if (authError) {
    console.error('Signup error:', authError)
    return {
      error: friendlyAuthError(
        authError,
        "We couldn't create your account. Refresh the page and try again — if it keeps happening, contact support.",
      ),
    }
  }

  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

export async function login(prevState: { error: string }, formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string | null)?.trim() ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: 'Email and password are both required.' }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('Login error:', error)
    return {
      error: friendlyAuthError(
        error,
        "We couldn't sign you in right now. Try again in a moment — if it keeps happening, contact support.",
      ),
    }
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
