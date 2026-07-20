-- ============================================================
-- Phase 1: Worker Time Tracking
-- ============================================================
-- Reuses existing empty `time_entries` table for in-app clock data
-- (day clock via entry_type='shift', job clock via entry_type='job').
-- Adds audit trail, company settings, and integrity constraints.
-- Payroll lock is per-row via existing approved_by / approved_at.

-- ---------- Clean up existing overlapping policies on time_entries ----------
drop policy if exists "Admin can delete time entries" on time_entries;
drop policy if exists "Admin/Manager can insert time entries" on time_entries;
drop policy if exists "Admin/Manager can update time entries" on time_entries;
drop policy if exists "Company users can view time entries" on time_entries;
drop policy if exists "Admins can manage all time entries" on time_entries;
drop policy if exists "Users can create own time entries" on time_entries;
drop policy if exists "Users can view own time entries" on time_entries;

-- ---------- New columns on time_entries ----------
alter table time_entries add column if not exists hourly_rate numeric(10, 2);
alter table time_entries add column if not exists source text not null default 'worker_clock';
alter table time_entries add column if not exists auto_closed boolean not null default false;

-- Tighten status: 'open' (active session) | 'closed' (ended)
alter table time_entries alter column status set default 'open';
alter table time_entries alter column status set not null;

-- ---------- Integrity constraints ----------
alter table time_entries drop constraint if exists time_entries_status_check;
alter table time_entries add constraint time_entries_status_check
  check (status in ('open', 'closed'));

alter table time_entries drop constraint if exists time_entries_entry_type_check;
alter table time_entries add constraint time_entries_entry_type_check
  check (entry_type in ('shift', 'job'));

alter table time_entries drop constraint if exists time_entries_source_check;
alter table time_entries add constraint time_entries_source_check
  check (source in ('worker_clock', 'admin_manual'));

alter table time_entries drop constraint if exists time_entries_type_job_match;
alter table time_entries add constraint time_entries_type_job_match
  check (
    (entry_type = 'shift' and job_id is null)
    or (entry_type = 'job' and job_id is not null)
  );

-- ---------- Active-session uniqueness (DB-level guard) ----------
create unique index if not exists idx_time_entries_one_open_shift_per_user
  on time_entries (user_id)
  where entry_type = 'shift' and ended_at is null;

create unique index if not exists idx_time_entries_one_open_job_per_user
  on time_entries (user_id)
  where entry_type = 'job' and ended_at is null;

-- ---------- Reconciliation + cost-query indexes ----------
create index if not exists idx_time_entries_company_user_started
  on time_entries (company_id, user_id, started_at);

create index if not exists idx_time_entries_company_job_started
  on time_entries (company_id, job_id, started_at)
  where job_id is not null;

-- ---------- Fresh RLS policies on time_entries ----------
create policy "time_entries_select" on time_entries for select
  using (
    company_id = (select company_id from users where id = auth.uid())
    and (
      user_id = auth.uid()
      or exists (
        select 1 from users
        where id = auth.uid()
        and role in ('admin', 'manager')
      )
    )
  );

create policy "time_entries_insert" on time_entries for insert
  with check (
    company_id = (select company_id from users where id = auth.uid())
    and (
      user_id = auth.uid()
      or exists (
        select 1 from users
        where id = auth.uid()
        and role in ('admin', 'manager')
      )
    )
  );

create policy "time_entries_update" on time_entries for update
  using (
    company_id = (select company_id from users where id = auth.uid())
    and (
      user_id = auth.uid()
      or exists (
        select 1 from users
        where id = auth.uid()
        and role in ('admin', 'manager')
      )
    )
  );

create policy "time_entries_delete" on time_entries for delete
  using (
    company_id = (select company_id from users where id = auth.uid())
    and exists (
      select 1 from users
      where id = auth.uid()
      and role in ('admin', 'manager')
    )
  );

-- ============================================================
-- time_entry_edits — immutable audit trail
-- ============================================================
create table if not exists time_entry_edits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  time_entry_id uuid not null references time_entries(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  edited_by uuid not null references users(id),
  edited_at timestamptz not null default now(),
  reason text
);

create index if not exists idx_time_entry_edits_company_id
  on time_entry_edits (company_id);
create index if not exists idx_time_entry_edits_entry_id
  on time_entry_edits (time_entry_id);
create index if not exists idx_time_entry_edits_edited_at
  on time_entry_edits (edited_at desc);

alter table time_entry_edits enable row level security;

create policy "time_entry_edits_select" on time_entry_edits for select
  using (company_id = (select company_id from users where id = auth.uid()));

create policy "time_entry_edits_insert" on time_entry_edits for insert
  with check (
    company_id = (select company_id from users where id = auth.uid())
    and edited_by = auth.uid()
  );

-- No update / delete policies — audit rows are immutable

-- ============================================================
-- Company settings: time-tracking sources + self-edit toggle
-- ============================================================
alter table companies add column if not exists day_hours_source text not null default 'in_app';
alter table companies add column if not exists job_attribution_source text not null default 'in_app';
alter table companies add column if not exists worker_self_edit_enabled boolean not null default true;

alter table companies drop constraint if exists companies_day_hours_source_check;
alter table companies add constraint companies_day_hours_source_check
  check (day_hours_source in ('in_app', 'xero', 'none'));

alter table companies drop constraint if exists companies_job_attribution_source_check;
alter table companies add constraint companies_job_attribution_source_check
  check (job_attribution_source in ('in_app', 'xero'));
