# Complete Database Schema

---

## Schema Overview

The database uses a multi-tenant architecture where every table (except auth.users) includes `company_id` to isolate data between companies. All tables have Row Level Security (RLS) policies enforced at the database level.

---

## Core Tables

### 1. companies
The root table for multi-tenancy. Every other table references this.

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postcode text,
  country text default 'Australia',
  plan text not null default 'trial',
  subscription_status text,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settings jsonb default '{}'::jsonb
);

create index idx_companies_slug on companies(slug);
```

**Fields Explanation:**
- `slug`: URL-friendly identifier (e.g., "acme-construction")
- `plan`: 'trial', 'basic', 'pro', 'enterprise'
- `subscription_status`: 'active', 'cancelled', 'past_due'
- `settings`: Flexible JSON for company-specific config

### 2. users
User profiles linked to auth.users (Supabase Auth) and companies.

```sql
create table users (
  id uuid primary key references auth.users(id),
  company_id uuid references companies(id),
  email text unique not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null default 'worker',
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  settings jsonb default '{}'::jsonb
);

create index idx_users_company_id on users(company_id);
create index idx_users_email on users(email);
```

**Roles:**
- `admin`: Full access, manages company settings
- `manager`: Manages jobs, customers, invoices
- `worker`: Views assigned jobs, logs time
- `client`: Customer portal access (future)

**Important:**
- `company_id` can be NULL initially during signup
- The signup flow creates auth user first, then updates `company_id`

### 3. customers
Construction clients who request jobs.

```sql
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,
  email text,
  phone text,
  customer_type text default 'individual',
  company_name text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postcode text,
  billing_country text default 'Australia',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  notes text,
  tags text[],
  portal_access boolean default false,
  portal_user_id uuid references users(id)
);

create index idx_customers_company_id on customers(company_id);
create index idx_customers_email on customers(email);
```

**Customer Types:**
- `individual`: Homeowner, single person
- `business`: Company or organization
- `government`: Government entity

### 4. customer_sites
Physical locations where jobs are performed.

```sql
create table customer_sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  customer_id uuid not null references customers(id),
  site_name text,
  address_line1 text not null,
  address_line2 text,
  city text,
  state text,
  postcode text,
  country text default 'Australia',
  latitude numeric,
  longitude numeric,
  access_instructions text,
  created_at timestamptz not null default now(),
  is_active boolean default true
);

create index idx_customer_sites_company_id on customer_sites(company_id);
create index idx_customer_sites_customer_id on customer_sites(customer_id);
```

**Usage:**
- One customer can have multiple sites
- Jobs link to specific sites
- `access_instructions`: Gate codes, parking info, etc.

### 5. jobs
The core entity - construction jobs/projects.

```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  customer_id uuid not null references customers(id),
  site_id uuid references customer_sites(id),
  quote_id uuid references quotes(id),
  job_number text not null,
  title text not null,
  description text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'scheduled',
  priority text default 'normal',
  completed_at timestamptz,
  completed_by uuid references users(id),
  customer_approval boolean default false,
  customer_signature_url text,
  customer_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  notes text,
  internal_notes text
);

create index idx_jobs_company_id on jobs(company_id);
create index idx_jobs_customer_id on jobs(customer_id);
create index idx_jobs_status on jobs(company_id, status);
create unique index idx_jobs_job_number on jobs(company_id, job_number);
```

**Job Statuses:**
- `scheduled`: Job is planned but not started
- `in_progress`: Work is happening
- `completed`: Work finished, pending approval
- `approved`: Customer approved work
- `invoiced`: Invoice sent to customer
- `paid`: Customer paid invoice
- `cancelled`: Job cancelled
- `on_hold`: Temporarily paused

**Priority Levels:**
- `low`, `normal`, `high`, `urgent`

### 6. job_assignments
Links workers to jobs.

```sql
create table job_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  job_id uuid not null references jobs(id),
  user_id uuid not null references users(id),
  role text,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references users(id)
);

create index idx_job_assignments_company_id on job_assignments(company_id);
create index idx_job_assignments_job_id on job_assignments(job_id);
create index idx_job_assignments_user_id on job_assignments(user_id);
```

**Assignment Roles:**
- `lead`: Team lead/supervisor
- `worker`: Regular crew member
- `specialist`: Electrician, plumber, etc.

### 7. job_photos
Photos taken during job (before/after, progress, issues).

```sql
create table job_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  job_id uuid not null references jobs(id),
  uploaded_by uuid not null references users(id),
  file_url text not null,
  caption text,
  photo_type text default 'progress',
  taken_at timestamptz not null default now(),
  latitude numeric,
  longitude numeric
);

create index idx_job_photos_company_id on job_photos(company_id);
create index idx_job_photos_job_id on job_photos(job_id);
```

**Photo Types:**
- `before`: Before work started
- `progress`: During work
- `after`: Work completed
- `issue`: Problem documentation
- `quote`: For quote/estimate

### 8. job_forms
Custom forms/checklists completed during jobs.

```sql
create table job_forms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  job_id uuid not null references jobs(id),
  form_type text not null,
  form_data jsonb not null,
  completed_by uuid not null references users(id),
  completed_at timestamptz not null default now(),
  signature_url text
);

create index idx_job_forms_company_id on job_forms(company_id);
create index idx_job_forms_job_id on job_forms(job_id);
```

**Form Types:**
- `safety_checklist`
- `quality_inspection`
- `customer_walkthrough`
- `completion_sign_off`

### 9. time_entries
Worker time tracking for jobs.

```sql
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  job_id uuid not null references jobs(id),
  user_id uuid not null references users(id),
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes integer,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_time_entries_company_id on time_entries(company_id);
create index idx_time_entries_job_id on time_entries(job_id);
create index idx_time_entries_user_id on time_entries(user_id);
```

**Usage:**
- Workers clock in/out for jobs
- `duration_minutes` calculated from start/end
- Can be used for payroll or job costing

### 10. quotes
Estimates/proposals before jobs start.

```sql
create table quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  customer_id uuid not null references customers(id),
  site_id uuid references customer_sites(id),
  quote_number text not null,
  title text not null,
  description text,
  status text not null default 'draft',
  valid_until date,
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  notes text
);

create index idx_quotes_company_id on quotes(company_id);
create index idx_quotes_customer_id on quotes(customer_id);
create unique index idx_quotes_quote_number on quotes(company_id, quote_number);
```

**Quote Statuses:**
- `draft`: Being prepared
- `sent`: Sent to customer
- `accepted`: Customer accepted
- `rejected`: Customer declined
- `expired`: Past `valid_until` date

### 11. invoices
Billing customers for completed work.

```sql
create table invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  customer_id uuid not null references customers(id),
  job_id uuid references jobs(id),
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date not null,
  status text not null default 'draft',
  subtotal numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  notes text
);

create index idx_invoices_company_id on invoices(company_id);
create index idx_invoices_customer_id on invoices(customer_id);
create index idx_invoices_status on invoices(company_id, status);
create unique index idx_invoices_invoice_number on invoices(company_id, invoice_number);
```

**Invoice Statuses:**
- `draft`: Being prepared
- `sent`: Sent to customer
- `partial`: Partially paid
- `paid`: Fully paid
- `overdue`: Past due date, unpaid
- `cancelled`: Cancelled

### 12. invoice_items
Line items on invoices.

```sql
create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  invoice_id uuid not null references invoices(id),
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index idx_invoice_items_company_id on invoice_items(company_id);
create index idx_invoice_items_invoice_id on invoice_items(invoice_id);
```

### 13. assets
Company equipment/vehicles tracking.

```sql
create table assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  asset_type text not null,
  name text not null,
  description text,
  serial_number text,
  purchase_date date,
  purchase_price numeric(10,2),
  current_value numeric(10,2),
  status text not null default 'available',
  assigned_to uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_company_id on assets(company_id);
```

**Asset Types:**
- `vehicle`: Trucks, vans
- `tool`: Power tools, equipment
- `machinery`: Large equipment

**Asset Status:**
- `available`
- `in_use`
- `maintenance`
- `retired`

### 14. documents
File storage references (contracts, permits, etc.)

```sql
create table documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  related_to_type text,
  related_to_id uuid,
  document_type text not null,
  file_name text not null,
  file_url text not null,
  file_size integer,
  uploaded_by uuid not null references users(id),
  uploaded_at timestamptz not null default now()
);

create index idx_documents_company_id on documents(company_id);
create index idx_documents_related on documents(related_to_type, related_to_id);
```

**Document Types:**
- `contract`
- `permit`
- `insurance`
- `certification`
- `other`

---

## Row Level Security (RLS) Policies

Every table has RLS policies enforcing company-based isolation and role-based permissions.

### Helper Function

```sql
create or replace function public.user_company_id()
returns uuid as $$
  select company_id from public.users where id = auth.uid()
$$ language sql stable security definer;
```

### Example Policies (Jobs Table)

```sql
-- View: All company users can view jobs
create policy "Company users can view jobs"
  on jobs for select
  using (company_id = public.user_company_id());

-- Create: Admins and managers can create jobs
create policy "Admins/Managers can create jobs"
  on jobs for insert
  with check (
    company_id = public.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- Update: Admins and managers can update jobs
create policy "Admins/Managers can update jobs"
  on jobs for update
  using (
    company_id = public.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- Delete: Only admins can delete jobs
create policy "Admins can delete jobs"
  on jobs for delete
  using (
    company_id = public.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role = 'admin'
    )
  );
```

---

## Triggers & Functions

### Auto-update Timestamps

```sql
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
create trigger update_companies_updated_at
  before update on companies
  for each row execute function update_updated_at_column();

-- Repeat for jobs, customers, users, etc.
```

### Auto-generate Job Numbers

```sql
create or replace function generate_job_number()
returns trigger as $$
begin
  if new.job_number is null then
    new.job_number := 'JOB-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad(nextval('job_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create sequence job_number_seq;

create trigger set_job_number
  before insert on jobs
  for each row execute function generate_job_number();
```

---

## Seed Data (Development)

```sql
-- Demo company
insert into companies (id, name, slug, plan, subscription_status)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Construction Ltd',
  'demo-construction',
  'pro',
  'active'
);

-- Demo customer
insert into customers (id, company_id, name, email, phone, customer_type)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'John Smith',
  'john@example.com',
  '+61 400 000 000',
  'individual'
);

-- Demo site
insert into customer_sites (company_id, customer_id, site_name, address_line1, city, postcode)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'Main Residence',
  '123 George Street',
  'Sydney',
  '2000'
);
```

---

### 15. xero_connections
One Xero OAuth connection per company.

```sql
create table xero_connections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  xero_tenant_id text not null,
  xero_tenant_name text,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  connected_by uuid not null references users(id),
  last_sync_at timestamptz,
  sync_status text default 'idle',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id)
);

create index idx_xero_connections_company_id on xero_connections(company_id);
```

**Fields:**
- `xero_tenant_id`: The Xero organisation ID
- `sync_status`: 'idle', 'syncing', 'error'
- `token_expires_at`: Checked before every API call, auto-refreshed if within 5 minutes

### 16. job_time_entries
Labour hours from Xero timesheets, mapped to jobs.

```sql
create table job_time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  job_id uuid references jobs(id),
  user_id uuid references users(id),
  xero_timesheet_id text,
  xero_employee_id text,
  employee_name text not null,
  date date not null,
  hours numeric(6,2) not null,
  hourly_rate numeric(10,2),
  cost numeric(10,2),
  status text not null default 'unassigned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_job_time_entries_company_id on job_time_entries(company_id);
create index idx_job_time_entries_job_id on job_time_entries(job_id);
create index idx_job_time_entries_user_id on job_time_entries(user_id);
create index idx_job_time_entries_status on job_time_entries(company_id, status);
```

**Statuses:**
- `unassigned`: Imported from Xero but not yet linked to a job
- `assigned`: Linked to a job (auto or manual)
- `ignored`: Admin chose to ignore this entry

**Additional column on users table:**
- `labour_rate_part_id uuid references parts(id)` — links worker to their labour rate part

---

## Database Relationships Diagram

```
companies (root)
  ├─── users (employees, labour_rate_part_id → parts)
  ├─── customers
  │      └─── customer_sites
  ├─── jobs
  │      ├─── job_assignments → users
  │      ├─── job_photos → users
  │      ├─── job_forms → users
  │      ├─── time_entries → users
  │      └─── job_time_entries → users (from Xero)
  ├─── quotes → customers, customer_sites
  ├─── invoices → customers, jobs
  │      └─── invoice_items
  ├─── xero_connections → users (connected_by)
  ├─── assets → users (assigned_to)
  └─── documents
```

---

## Planned Schema Changes (Not Yet Built)

### Floor Plan Drawings

```sql
-- Drawings uploaded per level (one drawing per building level)
create table level_drawings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  level_id uuid not null references levels(id),
  file_url text not null,
  file_name text not null,
  uploaded_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- Pin coordinates on penetrations table (ALTER TABLE)
-- penetrations.pin_x numeric  -- X coordinate on drawing (0-100 percentage)
-- penetrations.pin_y numeric  -- Y coordinate on drawing (0-100 percentage)
```

### Parts & Products (Materials Rework)

The current `materials` table will be replaced/extended with a Parts + Products system:

```sql
-- Parts = individual purchasable items (replaces current materials table)
create table parts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,              -- Smart naming: "Screw - M6 x 30mm Hex"
  subcategory text,                -- For filtering and bulk editing
  unit text not null default 'each',
  buy_cost numeric(10,2),          -- What we pay supplier
  sell_price numeric(10,2),        -- What we charge customer
  margin numeric(5,2),             -- Percentage margin
  supplier text,
  part_number text,                -- SKU / supplier part number
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products = bundles of parts
create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  name text not null,              -- "Fire Collar Kit - 110mm"
  description text,
  total_buy_cost numeric(10,2),    -- Calculated from parts
  total_sell_price numeric(10,2),  -- Calculated or overridden
  margin numeric(5,2),
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product parts = which parts make up a product
create table product_parts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id),
  part_id uuid not null references parts(id),
  quantity numeric(10,2) not null default 1,
  created_at timestamptz not null default now()
);
```

**Migration note:** The existing `materials` table and `room_materials` table will need to be migrated to the new parts system. The `room_materials` table will reference `part_id` or `product_id` instead of `material_id`.

### leads
Lead/inquiry tracking from website forms or manual entry. Full status lifecycle with conversion tracking.

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  company_name text,
  source text not null default 'website',
  status text not null default 'new',
  message text,
  metadata jsonb default '{}'::jsonb,
  converted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leads_company_id on leads(company_id);
create index idx_leads_status on leads(status);
create index idx_leads_source on leads(source);
create index idx_leads_created_at on leads(created_at desc);
```

**Fields Explanation:**
- `source`: 'website', 'referral', 'phone', 'email', 'social', 'other'
- `status`: 'new', 'contacted', 'qualified', 'proposal', 'converted', 'lost'
- `metadata`: Flexible JSON for extra form fields from website
- `converted_at`: Auto-set when status changes to 'converted'

**RLS Policies:** Standard 4-policy pattern (select, insert, update, delete) using `(SELECT company_id FROM users WHERE id = auth.uid())` subquery.

---

## Performance Considerations

### Indexes
All foreign keys are indexed for query performance:
- `company_id` on every table (most important)
- `customer_id`, `job_id`, `user_id` on related tables
- Composite indexes on common query patterns (e.g., `company_id` + `status`)

### Query Optimization
- Use `select` with specific columns instead of `select *`
- Leverage RLS automatic filtering (no need to manually add `where company_id = ...`)
- Use indexed columns in WHERE clauses
- Consider materialized views for complex reports (future)

### Migration Strategy
All schema changes are managed via SQL migration files in `supabase/migrations/`.

**Creating a new migration:**
```bash
npx supabase migration new add_new_feature
```

**Applying migrations:**
```bash
npx supabase db reset    # Local (drops and recreates)
npx supabase db push     # Remote (applies new migrations)
```
