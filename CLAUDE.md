# Claude Code Briefing File — BORIS Killer App
> Parent company: AUTONYX | App codename: BORIS Killer (final name TBD)
> Last updated: April 2026
> **READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE.**

---

## 0. FIRST THING TO DO EVERY SESSION

Before doing anything else, orient yourself:

```bash
# 1. See all source files
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | sort

# 2. Check recent commits to understand what was last worked on
git log --oneline -20

# 3. Check for TypeScript errors before starting
npx tsc --noEmit 2>&1 | head -50
```

Then read through `lib/services/` and the main page files to understand current patterns. Build your own mental model of how this codebase works before touching anything. Look for:
- How data is fetched (always in `lib/services/`, never in `page.tsx`)
- How mutations are handled (Server Actions)
- How RLS is applied (subquery pattern — see `CLAUDE_REFERENCE/architecture.md`)
- Naming conventions across existing files

Only after this orientation should you start writing code.

---

## 1. COMPANY & APP STRUCTURE

**AUTONYX** is the parent company — an AI company that builds AI automations, AI software, and multiple applications. AUTONYX is NOT the name of this app or any single product.

**This app** (repo: `boris-killer`) is AUTONYX's first application. Internal codename: **BORIS Killer**. Final product name is TBD. Do NOT refer to this app as "AUTONYX" in UI copy, file names, or comments.

**What this app does:** Field service and job management SaaS for Australian SMB construction and trade companies. Direct competitor to BORIS Software.

**Go-to-market:** Passive fire protection first (penetration sealing, fire collars, mastic, fire boards). We have real industry experience, existing contacts, and AS1851 compliance workflows deep enough that generic tools can't compete. 10 happy fire clients = strong referral engine, then expand to HVAC → plumbing/electrical → general construction.

**What this means for building:**
- Architecture stays **trade-agnostic** (buildings, levels, rooms, evidence fields, materials — all work for any trade, don't change that)
- All feature decisions, terminology, default settings, and onboarding flows should be **optimised for passive fire protection companies first**
- Never build fire-protection-specific things that can't work for other trades — just make sure fire protection companies feel completely at home

**Founders:** Oliver Schuetz + girlfriend. Oliver is the decision-maker on product. Growing developer — always explain before coding, give complete file rewrites, never partial snippets.

---

## 2. REFERENCE FILES — YOUR SOURCE OF TRUTH

**`CLAUDE_REFERENCE/` is your knowledge base.** Before building anything, read the relevant files below. If you're unsure about architecture, schema, styling, pricing, what's already built, or what mistakes to avoid — the answer is in these files. Don't guess. Don't assume. Check the reference first.

**When to read these files:**
- **Before every coding task** — check `recurring-failures.md` and `build-status.md` at minimum
- **When unsure about anything** — schema, table names, column names, UI patterns, RLS, routing
- **Before writing SQL migrations** — check `database-schema.md` for exact table/column names
- **Before writing UI code** — check `design-rules.md` for padding, layout, and component standards
- **Before making product decisions** — check `mvp-checklist.md`, `pricing-model.md`, `competitor-analysis-boris.md`

| File | What it covers |
|---|---|
| [`recurring-failures.md`](CLAUDE_REFERENCE/recurring-failures.md) | **READ FIRST EVERY SESSION.** 20 documented failure patterns with wrong vs correct code |
| [`build-status.md`](CLAUDE_REFERENCE/build-status.md) | What's complete (~65% MVP), what's remaining, database tables list, architecture rules |
| [`database-schema.md`](CLAUDE_REFERENCE/database-schema.md) | Table structure, exact column names, relationship rules, RLS policies |
| [`technical-stack.md`](CLAUDE_REFERENCE/technical-stack.md) | Tech stack, Supabase config, auth details, project structure |
| [`authentication.md`](CLAUDE_REFERENCE/authentication.md) | Two-phase signup flow, login, middleware, RLS auth patterns |
| [`design-rules.md`](CLAUDE_REFERENCE/design-rules.md) | Padding standards, full-width admin, select styling, image rules, design style |
| [`pricing-model.md`](CLAUDE_REFERENCE/pricing-model.md) | Tier pricing, feature breakdown, AroFlo/Uptick comparison |
| [`mvp-checklist.md`](CLAUDE_REFERENCE/mvp-checklist.md) | Must-have features checklist, MVP cut rule, phase priorities |
| [`build-roadmap.md`](CLAUDE_REFERENCE/build-roadmap.md) | Build sequence and implementation roadmap |
| [`ai-features-roadmap.md`](CLAUDE_REFERENCE/ai-features-roadmap.md) | Planned AI features and automation capabilities |
| [`competitor-analysis-boris.md`](CLAUDE_REFERENCE/competitor-analysis-boris.md) | Detailed BORIS Software competitor analysis |
| [`project-overview.md`](CLAUDE_REFERENCE/project-overview.md) | High-level project context, company info, GTM strategy |
| [`project-knowledge-base.md`](CLAUDE_REFERENCE/project-knowledge-base.md) | Accumulated project knowledge and decisions |

---

## 3. KNOWN FAILURES — CHECK EVERY ONE BEFORE CODING

| # | Failure | Rule |
|---|---|---|
| 1 | RLS uses `auth.user_company_id()` | Subquery only: `(SELECT company_id FROM users WHERE id = auth.uid())` |
| 2 | Router pushes to `/invoices/undefined` | `if (!invoiceId) throw new Error(...)` before routing |
| 3 | Dropdown arrows broken | Every `<select>`: `appearance-none` + `ChevronDown` overlay + `pr-10` |
| 4 | Admin pages get `max-w-` | Admin = `w-full` only |
| 5 | Queries in `page.tsx` | All queries in `lib/services/` only |
| 6 | Worker assignments always empty | Fetch from `job_assignments` — `job.assignments` doesn't exist |
| 7 | Duplicate variable declarations | Always deliver complete file rewrites |
| 8 | Content touching container edges | Trace every edge — padding required everywhere |
| 9 | Search icon overlaps input | Wrapper: `relative` — input: `pl-10` |
| 10 | Next.js Image for Supabase URLs | Use plain `<img>` tag |
| 11 | Wrong siteId to BuildingStructure | Pass `job.id`, NOT `job.site.id` |
| 12 | Querying `job_materials` | Table doesn't exist — use `room_materials` |
| 13 | Wrong column names in inserts | Always verify schema first — `issued_date` not `issue_date` |
| 14 | Worker back button goes to admin | Worker back = `href="/today"` not `/jobs` |
| 15 | zsh fails on `?` in terminal URLs | Wrap URLs with `?` in double quotes |
| 16 | Bottom nav overlaps content | Worker pages: `pb-24` on main content wrapper |
| 17 | Insert into `line_items` JSONB | This column was never created — do not use it |

---

## 4. HOW TO WORK WITH OLIVER

1. **Complete file rewrites only** — never "change line X". Full file, every time.
2. **Exact file paths always** — state the full path before every file
3. **One numbered action per step** — never combine multiple changes in one instruction
4. **State what to expect** — after each step, say what browser/terminal should show
5. **Explain before coding** — plain-English summary before any code block
6. **Say when creating new files/folders** — always explicitly state this
7. **SQL migrations before code** — confirm schema exists before writing code that uses it
8. **Run `npx tsc --noEmit` before every commit** — never push TypeScript errors

---

## 5. COMMIT WORKFLOW

```bash
git add .
git commit -m "descriptive message"
git push
# Vercel auto-deploys
```

---

## 6. REUSABLE WORKFLOWS

Oliver can trigger these by name (e.g. "run orient", "run pre-commit", "generate opening prompt for Customer Portal"). Follow the steps exactly.

### ORIENT (run at session start)

1. Run in parallel:
   - `find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | sort`
   - `git log --oneline -20`
   - `npx tsc --noEmit 2>&1 | head -50`
2. Read in parallel: `CLAUDE_REFERENCE/build-status.md` and `CLAUDE_REFERENCE/recurring-failures.md`
3. Scan `lib/services/` directory listing and `app/(dashboard)/` structure
4. Report to Oliver in bullet points: recent work, TypeScript status, current state (% complete, what's done, what's next), any notable issues

### OPENING PROMPT (generate handoff prompt for a new session)

Oliver says which feature. Then:
1. Read: `build-roadmap.md`, `build-status.md`, `mvp-checklist.md`, `database-schema.md`, `design-rules.md`
2. Find and read existing code files the feature depends on or integrates with
3. Generate a complete, self-contained prompt inside a code block that includes:
   - File reading instructions (CLAUDE.md + relevant CLAUDE_REFERENCE files + specific code files)
   - Orientation commands from section 0
   - Clear description of what to build
   - Numbered detailed requirements (database, routes, components, services, access control, design)
   - SQL migration note: "Write the migration SQL but DO NOT run it — give me the SQL to run manually"
   - Plan-first instruction: "Do NOT build yet — first explain your full plan and wait for approval"

### UPDATE REFS (after completing a feature)

1. Run `git log --oneline -10` and `git diff HEAD~5 --stat` to understand what changed
2. Read: `build-status.md`, `mvp-checklist.md`, `build-roadmap.md`
3. Update each file:
   - **build-status.md**: Move items from "Not Yet Built" to "Completed Components", update date, update % estimate, add new tables if any
   - **mvp-checklist.md**: Change `- [ ]` to `- [x]` for completed items
   - **build-roadmap.md**: Move items from "IMMEDIATE NEXT" to "ALREADY COMPLETE", update build order table, update date
4. Summarise changes for Oliver to verify

### PRE-COMMIT (run before every commit)

1. Run `npx tsc --noEmit 2>&1 | head -50` — stop if errors
2. Scan all staged/modified `.tsx`/`.ts` files for known failure patterns:
   - `auth.user_company_id()` (must be subquery)
   - `<select` without `appearance-none` + `pr-10` + `ChevronDown`
   - Admin pages with `max-w-` (should be `w-full`)
   - Queries directly in `page.tsx` (should be in `lib/services/`)
   - `<Image` with Supabase/blob URLs (should be `<img>`)
   - Worker pages missing `pb-24`
   - New components missing padding in cards/containers
3. Run `git status` and `git diff --stat`
4. Report: TypeScript PASS/FAIL, pattern scan PASS/issues, files to commit

### NEW TABLE (scaffold a database table)

Oliver provides the table name. Then:
1. Read `database-schema.md` and one existing `lib/services/` file for patterns
2. Ask Oliver for columns, types, FKs, constraints, and access level (unless already provided)
3. Generate SQL migration with: table, RLS enabled, all 4 RLS policies using subquery pattern `(SELECT company_id FROM users WHERE id = auth.uid())`, indexes on company_id and FKs
4. Output SQL but DO NOT run it — tell Oliver to run manually in Supabase SQL editor
5. Create `lib/services/<table-name>.ts` with TypeScript interface + CRUD functions matching existing patterns
6. Add the new table to `CLAUDE_REFERENCE/database-schema.md`

---

*This file + `CLAUDE_REFERENCE/` are the single source of truth for all Claude Code sessions. If anything in the codebase conflicts with these files, flag it — do not silently override it.*
