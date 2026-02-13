-- =====================================================
-- ROW LEVEL SECURITY (Multi-tenant isolation)
-- =====================================================

-- Enable RLS on all tables
alter table companies enable row level security;
alter table users enable row level security;
alter table customers enable row level security;
alter table customer_sites enable row level security;
alter table quotes enable row level security;
alter table jobs enable row level security;
alter table job_assignments enable row level security;
alter table job_photos enable row level security;
alter table job_forms enable row level security;
alter table time_entries enable row level security;
alter table invoices enable row level security;
alter table assets enable row level security;

-- =====================================================
-- HELPER FUNCTION: Get current user's company_id
-- =====================================================
create or replace function auth.user_company_id()
returns uuid as $$
  select company_id from users where id = auth.uid()
$$ language sql stable;

-- =====================================================
-- COMPANIES
-- =====================================================
-- Users can only see their own company
create policy "Users can view their own company"
  on companies for select
  using (id = auth.user_company_id());

-- Only admins can update company
create policy "Admins can update their company"
  on companies for update
  using (
    id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- USERS
-- =====================================================
-- Users can view users in their company
create policy "Users can view company users"
  on users for select
  using (company_id = auth.user_company_id());

-- Users can update their own profile
create policy "Users can update own profile"
  on users for update
  using (id = auth.uid());

-- Admins can insert/update/delete any user in their company
create policy "Admins can manage company users"
  on users for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users u
      where u.id = auth.uid()
      and u.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- CUSTOMERS
-- =====================================================
create policy "Company users can view customers"
  on customers for select
  using (company_id = auth.user_company_id());

create policy "Admins/Managers can manage customers"
  on customers for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- CUSTOMER SITES
-- =====================================================
create policy "Company users can view sites"
  on customer_sites for select
  using (company_id = auth.user_company_id());

create policy "Admins/Managers can manage sites"
  on customer_sites for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- QUOTES
-- =====================================================
create policy "Company users can view quotes"
  on quotes for select
  using (company_id = auth.user_company_id());

create policy "Admins/Managers can manage quotes"
  on quotes for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- JOBS
-- =====================================================
-- Workers can see jobs assigned to them
create policy "Workers can view assigned jobs"
  on jobs for select
  using (
    company_id = auth.user_company_id() and
    (
      -- Admins/Managers see all jobs
      exists (
        select 1 from users
        where users.id = auth.uid()
        and users.role in ('admin', 'manager')
      )
      or
      -- Workers see assigned jobs
      exists (
        select 1 from job_assignments
        where job_assignments.job_id = jobs.id
        and job_assignments.user_id = auth.uid()
      )
    )
  );

create policy "Admins/Managers can manage jobs"
  on jobs for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- Workers can update jobs they're assigned to (mark complete, add notes)
create policy "Workers can update assigned jobs"
  on jobs for update
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from job_assignments
      where job_assignments.job_id = jobs.id
      and job_assignments.user_id = auth.uid()
    )
  );

-- =====================================================
-- JOB ASSIGNMENTS
-- =====================================================
create policy "Company users can view assignments"
  on job_assignments for select
  using (company_id = auth.user_company_id());

create policy "Admins/Managers can manage assignments"
  on job_assignments for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- JOB PHOTOS
-- =====================================================
create policy "Users can view photos for accessible jobs"
  on job_photos for select
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from jobs
      where jobs.id = job_photos.job_id
      and (
        exists (
          select 1 from users
          where users.id = auth.uid()
          and users.role in ('admin', 'manager')
        )
        or
        exists (
          select 1 from job_assignments
          where job_assignments.job_id = jobs.id
          and job_assignments.user_id = auth.uid()
        )
      )
    )
  );

create policy "Users can upload photos to assigned jobs"
  on job_photos for insert
  with check (
    company_id = auth.user_company_id() and
    exists (
      select 1 from job_assignments
      where job_assignments.job_id = job_photos.job_id
      and job_assignments.user_id = auth.uid()
    )
  );

-- =====================================================
-- JOB FORMS
-- =====================================================
create policy "Users can view forms for accessible jobs"
  on job_forms for select
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from jobs
      where jobs.id = job_forms.job_id
      and (
        exists (
          select 1 from users
          where users.id = auth.uid()
          and users.role in ('admin', 'manager')
        )
        or
        exists (
          select 1 from job_assignments
          where job_assignments.job_id = jobs.id
          and job_assignments.user_id = auth.uid()
        )
      )
    )
  );

create policy "Workers can complete forms on assigned jobs"
  on job_forms for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from job_assignments
      where job_assignments.job_id = job_forms.job_id
      and job_assignments.user_id = auth.uid()
    )
  );

-- =====================================================
-- TIME ENTRIES
-- =====================================================
-- Users can see their own time entries
create policy "Users can view own time entries"
  on time_entries for select
  using (
    company_id = auth.user_company_id() and
    (
      user_id = auth.uid()
      or
      exists (
        select 1 from users
        where users.id = auth.uid()
        and users.role in ('admin', 'manager')
      )
    )
  );

-- Users can create their own time entries
create policy "Users can create own time entries"
  on time_entries for insert
  with check (
    company_id = auth.user_company_id() and
    user_id = auth.uid()
  );

-- Admins can manage all time entries
create policy "Admins can manage all time entries"
  on time_entries for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- INVOICES
-- =====================================================
create policy "Company users can view invoices"
  on invoices for select
  using (company_id = auth.user_company_id());

create policy "Admins/Managers can manage invoices"
  on invoices for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );

-- =====================================================
-- ASSETS
-- =====================================================
create policy "Company users can view assets"
  on assets for select
  using (company_id = auth.user_company_id());

create policy "Admins/Managers can manage assets"
  on assets for all
  using (
    company_id = auth.user_company_id() and
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.role in ('admin', 'manager')
    )
  );