# Authentication Implementation

---

## Overview

Authentication is handled by Supabase Auth with a custom two-phase signup flow that creates both an authentication user and a company profile. This was a complex implementation due to Row Level Security (RLS) conflicts.

---

## The Challenge

**Problem:** Standard Supabase signup creates a user in `auth.users`, but our application requires:
1. Creating a company record in `companies` table
2. Creating a user profile in `users` table with `company_id`
3. Both operations must happen atomically during signup

**Conflict:** RLS policies on `companies` table prevent users from creating companies unless they already have a `company_id` in their user profile. But they can't have a `company_id` until the company is created. Classic chicken-and-egg problem.

**Solution: Two-Phase Signup**

**Phase 1: Create Auth User**
Create the authentication account in Supabase Auth with company metadata.

**Phase 2: Complete Signup**
Use a PostgreSQL function with elevated privileges (`security definer`) to:
1. Create the company
2. Update the user profile with `company_id`

This bypasses RLS policies during the critical signup process.

---

## Implementation Details

### 1. Database Function (Elevated Privileges)

```sql
create or replace function complete_signup(
  p_user_id uuid,
  p_company_name text,
  p_company_slug text,
  p_user_full_name text,
  p_user_email text
)
returns jsonb
language plpgsql
security definer -- This runs with elevated privileges
as $$
declare
  v_company_id uuid;
begin
  -- Create the company
  insert into companies (name, slug, plan, subscription_status)
  values (p_company_name, p_company_slug, 'trial', 'active')
  returning id into v_company_id;

  -- Update user with company_id
  update users
  set
    company_id = v_company_id,
    full_name = p_user_full_name,
    email = p_user_email,
    role = 'admin' -- First user is always admin
  where id = p_user_id;

  -- Return success with company_id
  return jsonb_build_object(
    'success', true,
    'company_id', v_company_id
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$$;
```

**Key Points:**
- `security definer`: Runs with function creator's permissions (bypasses RLS)
- Returns JSON with success status and `company_id`
- Atomic transaction (all or nothing)
- Error handling returns structured error messages

### 2. Signup Server Action

`app/actions/auth.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const companyName = formData.get('company_name') as string

  // Generate slug from company name
  const companySlug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  try {
    // PHASE 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
          company_slug: companySlug,
        }
      }
    })

    if (authError) throw authError

    if (!authData.user) throw new Error('No user created')

    // PHASE 2: Complete signup (creates company and updates user profile)
    const { data: completeData, error: completeError } = await supabase.rpc(
      'complete_signup',
      {
        p_user_id: authData.user.id,
        p_company_name: companyName,
        p_company_slug: companySlug,
        p_user_full_name: fullName,
        p_user_email: email,
      }
    )

    if (completeError) throw completeError

    const result = completeData as { success: boolean; error?: string; company_id?: string }

    if (!result.success) {
      throw new Error(result.error || 'Failed to complete signup')
    }

    return { success: true, message: 'Account created successfully!' }

  } catch (error) {
    console.error('Signup error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Signup failed'
    }
  }
}
```

### 3. Signup Page Component

`app/(auth)/signup/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup } from '@/app/actions/auth'

export default function SignupPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      const result = await signup(formData)

      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Create Account</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Company Name
            </label>
            <input
              type="text"
              name="company_name"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

### 4. Login Implementation

`app/actions/auth.ts` (login function):

```ts
export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, message: error.message }
  }

  redirect('/dashboard')
}
```

Login is straightforward since the company and user profile already exist.

### 5. Logout Implementation

```ts
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

### 6. Middleware (Auth Protection)

`middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if accessing protected route without auth
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect to dashboard if accessing auth pages while logged in
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## Database Schema Changes for Auth

### Make company_id Nullable

```sql
-- Allow company_id to be NULL initially during signup
alter table users alter column company_id drop not null;
```

This was required because:
1. Auth user is created first (via Supabase Auth)
2. Database trigger creates user profile with `company_id = NULL`
3. `complete_signup` function fills in `company_id` afterward

### Database Trigger (User Profile Creation)

When a user signs up via Supabase Auth, a trigger automatically creates their profile:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**Important:** `company_id` is NOT set here — it's set by `complete_signup()`.

---

## Authentication Configuration

### Supabase Auth Settings

**Email Confirmation: DISABLED**
- Reason: Faster development/testing
- TODO: Enable for production

**Password Requirements:**
- Minimum 6 characters
- No complexity requirements (for now)

**Session Duration:**
- Access token: 1 hour
- Refresh token: 7 days
- Auto-refresh handled by Supabase client

---

## Security Considerations

### What's Secure
- ✅ Passwords hashed by Supabase Auth (bcrypt)
- ✅ Session tokens HTTP-only cookies
- ✅ CSRF protection via Supabase client
- ✅ RLS policies enforce data isolation after signup
- ✅ `security definer` function only does necessary operations

### What Could Be Improved
- ⚠️ Email confirmation disabled (enable for production)
- ⚠️ No rate limiting on signup (could add Supabase functions or edge middleware)
- ⚠️ Password requirements weak (could strengthen)
- ⚠️ No 2FA (future feature)

---

## Debugging Authentication Issues

### Common Issues

**Issue 1: "company_id violates not-null constraint"**
- Cause: `company_id` was required but signup didn't set it
- Fix: Made `company_id` nullable, use `complete_signup` to set it

**Issue 2: "RLS policy prevents company creation"**
- Cause: User tried to create company but RLS policy blocked it
- Fix: Use `security definer` function to bypass RLS

**Issue 3: "Failed to close prepared statement"**
- Cause: Transaction conflict during signup
- Fix: Ensure `complete_signup` handles errors gracefully

### Debugging Commands

Check if user exists:
```sql
select * from auth.users where email = 'test@example.com';
```

Check if user profile exists:
```sql
select * from users where email = 'test@example.com';
```

Check if company was created:
```sql
select * from companies where slug = 'test-company';
```

Check RLS policies:
```sql
select * from pg_policies where tablename = 'companies';
```

---

## Testing Authentication

### Manual Test Flow

1. Visit signup page: `http://localhost:3000/signup`
2. Fill form:
   - Full Name: Test User
   - Company Name: Test Company
   - Email: test@example.com
   - Password: password123
3. Submit form
4. Check logs for any errors
5. Verify redirect to dashboard
6. Check database:
   - User in `auth.users` ✓
   - User in `users` with `company_id` ✓
   - Company in `companies` ✓

### Automated Testing (Future)

```ts
// Example test (not implemented yet)
describe('Authentication', () => {
  it('should create user and company on signup', async () => {
    const result = await signup({
      email: 'test@example.com',
      password: 'password123',
      full_name: 'Test User',
      company_name: 'Test Company',
    })

    expect(result.success).toBe(true)

    // Check database
    const user = await supabase
      .from('users')
      .select('*, company:companies(*)')
      .eq('email', 'test@example.com')
      .single()

    expect(user.company_id).toBeDefined()
    expect(user.company.name).toBe('Test Company')
  })
})
```

---

## Authentication Flow Diagrams

### Signup Flow

```
User fills signup form
  ↓
Submit form (client)
  ↓
signup() server action
  ↓
PHASE 1: supabase.auth.signUp()
  ├─ Creates user in auth.users
  ├─ Trigger creates profile in users (company_id = NULL)
  └─ Returns user.id
  ↓
PHASE 2: complete_signup(user.id, ...)
  ├─ Creates company in companies
  ├─ Updates users.company_id
  └─ Returns success
  ↓
Redirect to /dashboard
```

### Login Flow

```
User fills login form
  ↓
Submit form (client)
  ↓
login() server action
  ↓
supabase.auth.signInWithPassword()
  ├─ Validates credentials
  ├─ Creates session
  └─ Sets auth cookie
  ↓
Redirect to /dashboard
```

### Protected Route Access

```
User visits /dashboard
  ↓
Middleware checks auth
  ↓
Is user authenticated?
  Yes → Allow access
  No  → Redirect to /login
```

---

## Future Authentication Features

### Planned Enhancements
- Email confirmation for production
- Password reset flow
- Change password functionality
- Two-factor authentication (2FA)
- Social login (Google, Microsoft)
- Invite users to company
- Role-based dashboard views
- Session management page
- Login activity log

### Invite Users Flow (Future)

```
Admin invites new user
  ↓
Create invitation record
  ↓
Send invitation email
  ↓
User clicks invitation link
  ↓
User sets password
  ↓
User profile created with existing company_id
  ↓
User logs in
```

This will be simpler than signup since company already exists.
