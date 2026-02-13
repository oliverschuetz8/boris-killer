-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- COMPANIES (Multi-tenant root)
-- =====================================================
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null, -- for URLs: app.com/acme-construction
  
  -- Contact
  email text,
  phone text,
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postcode text,
  country text default 'UK',
  
  -- Subscription
  plan text not null default 'trial', -- trial, basic, pro, enterprise
  subscription_status text default 'active', -- active, past_due, cancelled
  trial_ends_at timestamptz,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Settings (JSONB for flexibility)
  settings jsonb default '{}'::jsonb
);

-- =====================================================
-- USERS (Employees + Auth)
-- =====================================================
create table users (
  id uuid primary key references auth.users on delete cascade,
  company_id uuid not null references companies on delete cascade,
  
  -- Profile
  email text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  
  -- Role
  role text not null default 'worker', -- admin, manager, worker
  
  -- Status
  is_active boolean default true,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz,
  
  -- Preferences
  settings jsonb default '{}'::jsonb
);

-- =====================================================
-- CUSTOMERS (The construction company's clients)
-- =====================================================
create table customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  
  -- Basic info
  name text not null,
  email text,
  phone text,
  
  -- Type
  customer_type text default 'individual', -- individual, business
  company_name text,
  
  -- Billing
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_postcode text,
  billing_country text default 'UK',
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users,
  
  -- Notes
  notes text,
  tags text[], -- ['vip', 'repeat-customer']
  
  -- Portal access
  portal_access boolean default false,
  portal_user_id uuid references auth.users -- if they have login
);

-- =====================================================
-- CUSTOMER SITES (Job locations)
-- =====================================================
create table customer_sites (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  customer_id uuid not null references customers on delete cascade,
  
  -- Location
  site_name text, -- "Main Office", "Warehouse 2"
  address_line1 text not null,
  address_line2 text,
  city text,
  state text,
  postcode text,
  country text default 'UK',
  
  -- Geocoding (for maps later)
  latitude decimal,
  longitude decimal,
  
  -- Access notes
  access_instructions text,
  
  -- Metadata
  created_at timestamptz not null default now(),
  is_active boolean default true
);

-- =====================================================
-- QUOTES (Estimates)
-- =====================================================
create table quotes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  customer_id uuid not null references customers on delete cascade,
  
  -- Quote details
  quote_number text unique not null, -- QT-2024-001
  title text not null,
  description text,
  
  -- Pricing
  line_items jsonb not null default '[]'::jsonb,
  /*
  [
    {
      "description": "Kitchen renovation",
      "quantity": 1,
      "unit": "job",
      "rate": 5000,
      "amount": 5000
    }
  ]
  */
  subtotal decimal(10,2) not null default 0,
  tax_rate decimal(5,2) default 0,
  tax_amount decimal(10,2) default 0,
  total decimal(10,2) not null default 0,
  
  -- Status
  status text not null default 'draft', -- draft, sent, approved, rejected, expired
  
  -- Dates
  issued_date date,
  valid_until date,
  approved_at timestamptz,
  
  -- Signature
  customer_signature_url text,
  signed_at timestamptz,
  
  -- Conversion
  converted_to_job_id uuid, -- references jobs, but can't create FK yet
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users,
  
  -- Notes
  notes text,
  terms text
);

-- =====================================================
-- JOBS (Work Orders)
-- =====================================================
create table jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  customer_id uuid not null references customers on delete cascade,
  site_id uuid references customer_sites,
  quote_id uuid references quotes,
  
  -- Job details
  job_number text unique not null, -- JOB-2024-001
  title text not null,
  description text,
  
  -- Scheduling
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  
  -- Status
  status text not null default 'scheduled', 
  -- scheduled, in_progress, completed, cancelled, on_hold
  
  priority text default 'normal', -- low, normal, high, urgent
  
  -- Completion
  completed_at timestamptz,
  completed_by uuid references users,
  
  -- Customer interaction
  customer_approval boolean default false,
  customer_signature_url text,
  customer_signed_at timestamptz,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users,
  
  -- Notes
  notes text,
  internal_notes text -- not visible to customer
);

-- =====================================================
-- JOB ASSIGNMENTS (Which workers on which jobs)
-- =====================================================
create table job_assignments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  job_id uuid not null references jobs on delete cascade,
  user_id uuid not null references users on delete cascade,
  
  -- Role on this job
  role text default 'worker', -- lead, worker, supervisor
  
  -- Metadata
  assigned_at timestamptz not null default now(),
  assigned_by uuid references users,
  
  -- Unique constraint: one worker assigned once per job
  unique(job_id, user_id)
);

-- =====================================================
-- JOB PHOTOS (Evidence, before/after)
-- =====================================================
create table job_photos (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  job_id uuid not null references jobs on delete cascade,
  
  -- File
  storage_path text not null, -- Supabase storage path
  file_name text not null,
  file_size integer,
  mime_type text,
  
  -- Photo metadata
  caption text,
  photo_type text, -- before, during, after, issue, other
  
  -- GPS
  latitude decimal,
  longitude decimal,
  
  -- Metadata
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references users
);

-- =====================================================
-- JOB FORMS (Checklists, signatures, compliance)
-- =====================================================
create table job_forms (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  job_id uuid not null references jobs on delete cascade,
  
  -- Form
  form_type text not null, -- safety_checklist, completion_form, risk_assessment
  form_data jsonb not null default '{}'::jsonb,
  /*
  {
    "fields": [
      {
        "label": "Site safe?",
        "type": "checkbox",
        "value": true
      }
    ],
    "signature": "data:image/png;base64...",
    "signed_by": "John Smith"
  }
  */
  
  -- Completion
  completed boolean default false,
  completed_at timestamptz,
  completed_by uuid references users,
  
  -- Metadata
  created_at timestamptz not null default now()
);

-- =====================================================
-- TIME ENTRIES (Worker hours tracking)
-- =====================================================
create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  job_id uuid references jobs,
  user_id uuid not null references users on delete cascade,
  
  -- Time
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer, -- computed or manual
  
  -- Entry type
  entry_type text default 'job', -- job, travel, break, admin
  
  -- Status
  status text default 'draft', -- draft, submitted, approved, rejected
  approved_by uuid references users,
  approved_at timestamptz,
  
  -- Metadata
  created_at timestamptz not null default now(),
  notes text
);

-- =====================================================
-- INVOICES (Billing)
-- =====================================================
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  customer_id uuid not null references customers on delete cascade,
  job_id uuid references jobs,
  
  -- Invoice details
  invoice_number text unique not null, -- INV-2024-001
  
  -- Line items (copied from quote or generated from job)
  line_items jsonb not null default '[]'::jsonb,
  subtotal decimal(10,2) not null default 0,
  tax_rate decimal(5,2) default 0,
  tax_amount decimal(10,2) default 0,
  total decimal(10,2) not null default 0,
  
  -- Status
  status text not null default 'draft', -- draft, sent, paid, overdue, cancelled
  
  -- Dates
  issued_date date not null,
  due_date date,
  paid_date date,
  
  -- Payment
  payment_method text, -- cash, card, bank_transfer, stripe
  payment_reference text,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users,
  
  notes text
);

-- =====================================================
-- ASSETS (Basic equipment/tool tracking)
-- =====================================================
create table assets (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies on delete cascade,
  
  -- Asset details
  asset_number text,
  name text not null,
  description text,
  asset_type text, -- vehicle, tool, equipment
  
  -- Identification
  serial_number text,
  qr_code text,
  
  -- Status
  status text default 'active', -- active, maintenance, retired
  
  -- Maintenance
  last_service_date date,
  next_service_date date,
  
  -- Location
  current_location text,
  assigned_to uuid references users,
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users,
  
  notes text
);

-- =====================================================
-- INDEXES (Performance)
-- =====================================================
create index users_company_id_idx on users(company_id);
create index users_email_idx on users(email);

create index customers_company_id_idx on customers(company_id);
create index customer_sites_company_id_idx on customer_sites(company_id);
create index customer_sites_customer_id_idx on customer_sites(customer_id);

create index quotes_company_id_idx on quotes(company_id);
create index quotes_customer_id_idx on quotes(customer_id);
create index quotes_status_idx on quotes(status);

create index jobs_company_id_idx on jobs(company_id);
create index jobs_customer_id_idx on jobs(customer_id);
create index jobs_status_idx on jobs(status);
create index jobs_scheduled_start_idx on jobs(scheduled_start);

create index job_assignments_company_id_idx on job_assignments(company_id);
create index job_assignments_job_id_idx on job_assignments(job_id);
create index job_assignments_user_id_idx on job_assignments(user_id);

create index job_photos_company_id_idx on job_photos(company_id);
create index job_photos_job_id_idx on job_photos(job_id);

create index job_forms_company_id_idx on job_forms(company_id);
create index job_forms_job_id_idx on job_forms(job_id);

create index time_entries_company_id_idx on time_entries(company_id);
create index time_entries_job_id_idx on time_entries(job_id);
create index time_entries_user_id_idx on time_entries(user_id);

create index invoices_company_id_idx on invoices(company_id);
create index invoices_customer_id_idx on invoices(customer_id);
create index invoices_status_idx on invoices(status);

create index assets_company_id_idx on assets(company_id);

-- =====================================================
-- TRIGGERS (Auto-update timestamps)
-- =====================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger companies_updated_at before update on companies
  for each row execute function update_updated_at();

create trigger users_updated_at before update on users
  for each row execute function update_updated_at();

create trigger customers_updated_at before update on customers
  for each row execute function update_updated_at();

create trigger quotes_updated_at before update on quotes
  for each row execute function update_updated_at();

create trigger jobs_updated_at before update on jobs
  for each row execute function update_updated_at();

create trigger invoices_updated_at before update on invoices
  for each row execute function update_updated_at();

create trigger assets_updated_at before update on assets
  for each row execute function update_updated_at();