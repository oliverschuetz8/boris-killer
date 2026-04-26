---
name: new-table
description: Scaffold a new database table with SQL migration, RLS policies, TypeScript types, and a lib/services/ CRUD file. Use when adding a new table to the database.
disable-model-invocation: true
arguments: [table-name]
---

# Scaffold New Database Table

Create everything needed for a new table: **$ARGUMENTS**

## Step 1: Read existing patterns (run in parallel)

1. Read `CLAUDE_REFERENCE/database-schema.md` — understand existing schema and naming conventions
2. Read one existing service file from `lib/services/` to match the pattern (e.g., `lib/services/jobs.ts` or similar)
3. Read `CLAUDE_REFERENCE/recurring-failures.md` — especially failure #1 (RLS subquery pattern)

## Step 2: Ask the user for table details

Before generating anything, ask the user to confirm:
- Column names and types
- Which columns are required vs optional
- Foreign key relationships
- Any unique constraints
- Whether workers, admins, or both access this table

If the user already provided these details in their message, skip this step.

## Step 3: Generate the SQL migration

Write a complete SQL migration that includes:

```sql
-- Create table
CREATE TABLE table_name (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  -- ... columns ...
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- RLS policies (ALWAYS use subquery pattern, NEVER auth.user_company_id())
CREATE POLICY "Users can view own company data"
  ON table_name FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own company data"
  ON table_name FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own company data"
  ON table_name FOR UPDATE
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own company data"
  ON table_name FOR DELETE
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_table_name_company_id ON table_name(company_id);
```

**Output the SQL but DO NOT run it.** Tell the user: "Run this migration manually in Supabase SQL editor."

## Step 4: Generate the service file

Create `lib/services/table-name.ts` with:
- Supabase client import (server-side)
- TypeScript interface for the table row
- CRUD functions: `getAll`, `getById`, `create`, `update`, `delete`
- All functions follow existing patterns in `lib/services/`
- Functions use the authenticated Supabase client (RLS handles company isolation)

## Step 5: Update reference files

Add the new table to `CLAUDE_REFERENCE/database-schema.md` in the appropriate section.

## Step 6: Summary

Tell the user:
1. The SQL migration to run manually
2. The service file that was created
3. Any next steps (e.g., "now create the page that uses this table")
