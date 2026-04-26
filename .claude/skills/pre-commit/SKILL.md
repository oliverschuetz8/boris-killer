---
name: pre-commit
description: Pre-commit quality checklist. Runs TypeScript check, scans for known failure patterns, and shows git status before committing.
disable-model-invocation: true
allowed-tools: Bash(npx tsc *) Bash(git status *) Bash(git diff *) Grep Read
---

# Pre-Commit Quality Check

Run all checks before committing code. Report results clearly.

## Step 1: TypeScript check

Run `npx tsc --noEmit 2>&1 | head -50`

If there are errors, list them and suggest fixes. Do NOT proceed to commit if there are TypeScript errors.

## Step 2: Scan for known failure patterns

Check all staged/modified `.tsx` and `.ts` files for these patterns:

1. **RLS violation** — Grep for `auth.user_company_id()` — should NOT exist. Must use subquery: `(SELECT company_id FROM users WHERE id = auth.uid())`
2. **Missing dropdown arrows** — Grep for `<select` and verify each has `appearance-none` + `pr-10` + a `ChevronDown` icon nearby
3. **Admin pages with max-w** — Check any new/modified admin pages under `app/(dashboard)/` for `max-w-` classes (admin pages should be `w-full`)
4. **Queries in page.tsx** — Check modified `page.tsx` files for direct Supabase queries (should be in `lib/services/`)
5. **Next.js Image with Supabase URLs** — Grep for `<Image` in modified files and check if used with Supabase signed URLs or blob URLs (should use `<img>`)
6. **Missing bottom padding on worker pages** — Check worker pages for `pb-24` on main content wrapper
7. **Content touching edges** — Spot check new components for missing padding in cards/containers

## Step 3: Git status

Run `git status` and `git diff --stat` to show what will be committed.

## Step 4: Report

Present results as a checklist:
- TypeScript: PASS / FAIL (with errors)
- Failure pattern scan: PASS / list of issues found
- Files to commit: list from git status

If everything passes, tell the user it's safe to commit. If there are issues, list them with file paths and line numbers.
