# Technical Stack & Architecture

---

## Technology Choices

### Frontend
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript (strict mode enabled)
- **Styling:** Tailwind CSS
- **UI Components:** Building custom (no UI library chosen yet)
- **State Management:** React hooks and Server Actions

### Backend
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage (for file uploads)
- **API Layer:** Next.js Server Actions (not REST API routes)

### Deployment & Hosting
- **Frontend:** Vercel
- **Database:** Supabase (hosted PostgreSQL)
- **Version Control:** GitHub
- **CI/CD:** Automatic deployment via Vercel + GitHub integration

### Development Tools
- **Code Editor:** VS Code (planning to use Cursor for AI-assisted coding)
- **AI Assistant:** Claude (via claude.ai and Claude Code)
- **Database Management:** Supabase Dashboard + SQL Editor
- **Package Manager:** npm

---

## Architecture Decisions

### Multi-Tenant Architecture
Every table (except auth.users) includes `company_id` for data isolation. This ensures Company A never sees Company B's data.

**Pattern:**
```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  -- other fields
);
```

### Row Level Security (RLS)
Security enforced at database level, not application level. Every table has RLS policies that automatically filter data by `company_id`.

**Benefits:**
- Security bugs in application code don't leak data
- Consistent permissions across all access methods
- Impossible to accidentally query wrong company's data

### Server-First Architecture
- Default to Server Components (renders on server)
- Use `'use client'` only when absolutely necessary (forms, interactivity)
- Data fetching happens on server
- Server Actions for mutations (create, update, delete)

**Why:** Better performance, smaller bundle size, automatic data freshness

### Type Safety Strategy
- Generate TypeScript types from database schema
- All database queries are type-safe
- No runtime type errors from database operations
- Types live in `lib/types/database.ts`

---

## Project Structure

```
boris-killer/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth routes (public)
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/        # Protected routes
│   │   ├── jobs/
│   │   ├── customers/
│   │   ├── invoices/
│   │   └── page.tsx        # Dashboard home
│   ├── actions/            # Server Actions
│   │   ├── jobs.ts
│   │   ├── customers.ts
│   │   └── auth.ts
│   ├── api/                # API routes (if needed)
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # Reusable UI components
│   ├── jobs/               # Job-specific components
│   ├── customers/          # Customer components
│   └── layout/             # Layout components
├── lib/                    # Utilities & config
│   ├── supabase/
│   │   ├── client.ts       # Client-side Supabase
│   │   ├── server.ts       # Server-side Supabase
│   │   └── middleware.ts   # Auth middleware
│   ├── types/
│   │   └── database.ts     # Generated types
│   └── utils/              # Helper functions
├── supabase/               # Supabase config
│   ├── migrations/         # SQL migration files
│   └── seed.sql            # Development seed data
├── public/                 # Static assets
└── middleware.ts            # Next.js middleware (auth)
```

---

## Naming Conventions

### Database (PostgreSQL)
- **Tables:** snake_case plural (e.g., `customer_sites`, `job_assignments`)
- **Columns:** snake_case (e.g., `created_at`, `customer_id`)
- **Foreign Keys:** `{table_singular}_id` (e.g., `company_id`, `job_id`)

### TypeScript/JavaScript
- **Variables:** camelCase (e.g., `customerId`, `jobNumber`)
- **Components:** PascalCase (e.g., `JobForm`, `CustomerList`)
- **Files:** kebab-case (e.g., `job-form.tsx`, `customer-list.tsx`)
- **Types/Interfaces:** PascalCase (e.g., `Job`, `Customer`, `JobWithRelations`)

---

## Key Technical Patterns

### Server Action Pattern
```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createResource(formData: FormData) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get company_id from user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Insert with company_id
  const { data, error } = await supabase
    .from('table_name')
    .insert({
      company_id: userProfile.company_id,
      // other fields
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/path')
  return data
}
```

### Database Query Pattern
```ts
// Query with relations
const { data, error } = await supabase
  .from('jobs')
  .select(`
    *,
    customer:customers(*),
    site:customer_sites(*),
    assignments:job_assignments(
      id,
      role,
      user:users(id, full_name)
    )
  `)
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
```

### Authentication Check Pattern
```ts
// In middleware or server components
const supabase = createServerClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/login')
}
```

---

## Security Considerations

### Authentication Flow
- Email/password authentication via Supabase Auth
- No email confirmation required (disabled for easier development)
- Session cookies with HTTP-only flags
- Automatic session refresh in middleware

### Data Access Control
- All queries automatically scoped to user's company via RLS
- Role-based permissions (admin, manager, worker) in RLS policies
- No way to accidentally query other companies' data
- Database enforces security (not application code)

### API Security
- All API routes protected by Supabase Auth middleware
- Server Actions automatically check authentication
- No public API endpoints (everything requires auth)
- Rate limiting handled by Vercel and Supabase

---

## Performance Optimizations

### Database Indexes
All foreign keys are indexed:
- `company_id` on every table
- `customer_id`, `site_id`, `job_id` on related tables
- Composite indexes on frequently queried combinations

### Caching Strategy
- Server Components cache by default
- Use `revalidatePath()` to invalidate cache after mutations
- No client-side state management needed for most data

### Bundle Size
- Server Components don't add to client bundle
- Client components only where needed
- Code splitting automatic with App Router

---

## Development Workflow

### Local Development
```bash
npm run dev              # Start Next.js dev server
npx supabase start       # Start local Supabase (if using local dev)
```

### Database Changes
```bash
npx supabase migration new <name>   # Create new migration
# Edit the SQL file
npx supabase db reset                # Apply migrations locally
npx supabase db push                 # Apply to remote
```

### Deployment
```bash
git add .
git commit -m "message"
git push                 # Auto-deploys to Vercel
```

### Environment Variables
Required environment variables (set in Vercel and `.env.local`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...   # For server-side admin access

# Optional
DATABASE_URL=postgresql://postgres:[password]@xxx.supabase.co:5432/postgres
```

---

## Technical Debt & Future Considerations

### Known Issues
- Email confirmation disabled (should enable for production)
- No automated testing yet
- No error tracking/monitoring setup
- No analytics integration

### Planned Improvements
- Add automated tests (unit + integration)
- Set up error tracking (Sentry or similar)
- Add usage analytics
- Implement email notifications
- Add file upload functionality (Supabase Storage)
- Consider adding Redis for caching if needed

### Scalability Considerations
- Current architecture supports up to ~10,000 companies
- Database can handle millions of jobs/invoices
- May need CDN for uploaded files at scale
- Consider separate database instances for large customers
