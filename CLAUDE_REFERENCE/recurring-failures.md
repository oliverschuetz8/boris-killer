# 06 — Recurring Failures to Prevent

This file documents every bug, error, and mistake that occurred repeatedly across all AUTONYX development sessions. Before writing any code, Claude must read this file and verify each failure pattern is actively avoided. Each entry includes: what went wrong, why it happened, and the exact correct pattern to use.

---

## Failure #1 — RLS Policy Uses auth.user_company_id() — Function Does Not Exist

Claude Code repeatedly generated RLS policies using `auth.user_company_id()`, which is not a function in this Supabase project. This caused every SQL migration to fail with: `ERROR 42883: function auth.user_company_id() does not exist`.

Affected: job_assignments, invoices, invoice_line_items, and other new tables.

**WRONG:**
```sql
USING (company_id = auth.user_company_id())
```

**CORRECT:**
```sql
USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()))
```

**Rule:** Always use the subquery pattern. Never use `auth.user_company_id()`. It does not exist in this project.

---

## Failure #2 — Invoice Insert Fails Silently — Router Pushes to /invoices/undefined

The `createInvoiceFromJob` function inserted into the invoices table with column names that did not exist. Supabase returned an error but the code did not throw — it swallowed the error. `invoice.id` was undefined.

`router.push(`/invoices/${invoiceId}`)` sent the user to `/invoices/undefined`, showing "page not found".

**Root causes found:**
- Inserting `line_items` column — this JSONB column was never created in the table
- Using `issue_date` column name — actual column was `issued_date`
- Querying `job_materials` table — this table does not exist (correct table: `room_materials`)
- Querying `job_time_entries` table — this table does not exist (labour from Xero, not yet built)
- Not checking if `invoice.id` exists before calling `router.push`

**Prevention rules:**
- Always query the actual database schema before writing insert statements — never assume column names
- Always check if `invoice?.id` exists before routing: `if (!invoiceId) throw new Error("No invoice ID returned")`
- Throw errors with descriptive messages: `if (invError) throw new Error(`Failed: ${invError.message}`)`
- The correct materials table is `room_materials` — not `job_materials`
- Labour lines now populated from `job_time_entries` (Xero sync) with sell_price from labour rate parts

**WRONG:**
```ts
const invoiceId = await createInvoiceFromJob(jobId)
router.push(`/invoices/${invoiceId}`)
```

**CORRECT:**
```ts
const invoiceId = await createInvoiceFromJob(jobId)
if (!invoiceId) throw new Error("No invoice ID returned")
router.push(`/invoices/${invoiceId}`)
```

---

## Failure #3 — Dropdown Arrows Broken — Missing appearance-none or ChevronDown Overlay

Every `<select>` element in the app must have `appearance-none` applied AND a ChevronDown icon overlaid on the right side. Without `appearance-none`, the browser renders its own native arrow which cannot be styled and looks inconsistent. Without the ChevronDown overlay, the right side of the dropdown looks empty.

This mistake happened on Status, Priority, State, and Worker selects across multiple sessions.

**WRONG:**
```tsx
<select className="w-full px-3 py-2 ... border-slate-300">
```

**CORRECT:**
```tsx
<div className="relative">
  <select className="w-full appearance-none px-3 py-2 pr-10 ... border-slate-300">
    ...
  </select>
  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
</div>
```

**Required checklist for every select element:**
- Wrapper div must have `className="relative"`
- Select must have `appearance-none` in className
- Select must have `pr-10` so text does not overlap the icon
- ChevronDown icon must have: `absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none`

---

## Failure #4 — Admin Pages Get max-w- Width Constraints — Always Wrong

Claude Code repeatedly added `max-w-xl`, `max-w-2xl`, `max-w-4xl`, or `max-w-screen-xl` on admin page wrappers. Admin pages in AUTONYX must always use the full available width. Width constraints create a narrow column in the centre with wasted space on both sides.

This happened on: invoices page, invoice detail page, job edit page, settings pages.

**WRONG:**
```tsx
<div className="max-w-4xl mx-auto px-6 py-8">
<div className="max-w-2xl mx-auto space-y-6 pb-12">
```

**CORRECT:**
```tsx
<div className="w-full px-8 py-8">
<div className="w-full space-y-6 pb-12">
```

**Rule:** The ONLY pages that get `max-w-` are worker/mobile pages (`max-w-lg mx-auto`). Every admin page uses `w-full` with px padding only.

---

## Failure #5 — Database Queries Written Directly in page.tsx

Multiple times Claude wrote Supabase queries directly inside `page.tsx` server components instead of in `lib/services/`. This violates the architecture rule and makes code untestable, un-reusable, and hard to maintain.

**WRONG:**
```ts
// inside page.tsx
const { data } = await supabase.from("jobs").select("*").eq("id", id)
```

**CORRECT:**
```ts
// lib/services/jobs.ts
export async function getJob(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from("jobs").select("*").eq("id", id).single()
  return data
}

// inside page.tsx
const job = await getJob(id)
```

**Rule:** `page.tsx` does three things only: (1) auth check, (2) call `lib/services/` functions, (3) pass data as props to client component. Nothing else.

---

## Failure #6 — Worker Assignments Always Empty — job.assignments Does Not Exist

The job edit page was passing `initialAssignments={job.assignments || []}` to the AssignmentsSection component. The `getJob` function does not fetch assignments — `job.assignments` is always undefined. This meant the Worker Assignments section always showed "No workers assigned" even when workers were assigned.

**WRONG:**
```tsx
// page.tsx — job.assignments does not exist
initialAssignments={job.assignments || []}
```

**CORRECT:**
```tsx
// page.tsx — fetch assignments separately
const { data: initialAssignments } = await supabase
  .from("job_assignments")
  .select("id, job_id, user_id, company_id, role, user:users!job_assignments_user_id_fkey(id, full_name, email, role, trade)")
  .eq("job_id", id)
  .order("assigned_at")

initialAssignments={initialAssignments || []}
```

**Rule:** Never assume a joined relation exists on a fetched object. Always fetch related data explicitly and pass it separately.

---

## Failure #7 — Duplicate Variable Declarations After Partial Rewrites

When replacing a section of code, Claude sometimes wrote the new code but left the old code still in the file. This caused TypeScript error `TS2451: Cannot redeclare block-scoped variable`. This happened with `materialLines` in `invoices.ts` — the old declaration remained after the new one was added.

**Prevention rules:**
- After rewriting any variable or function, search the entire file for any remaining old version
- When delivering a partial rewrite, explicitly state: "delete lines X to Y first, then add this"
- When possible, deliver complete file rewrites instead of partial changes to avoid this entirely
- Before submitting, always check: does this variable name appear more than once in the file?

---

## Failure #8 — Text and Icons Pressing Against Container Edges — No Padding

This was the most frequent visual bug across all sessions. Text, icons, table cell content, headings, and input placeholders repeatedly appeared with no gap between them and the edge of their container.

Affected pages: invoices list, invoice detail, job edit, materials catalogue, evidence tab, cost tab, team page.

**Specific instances found:**
- Table cells with no px padding — text starts at the very edge of the cell border
- Search input placeholder touching left edge — icon missing `pointer-events-none` or wrapper missing `relative`
- Status dropdown text with no left padding
- Headings inside cards with no left padding on the card
- Evidence field badges pressing against the border of their container
- Materials list rows with content touching left and right edges

**Required padding standards:**
- Cards: always `p-4` minimum inside, or `px-6 py-4` for section cards
- Table cells: always `px-6 py-3` on `<th>` and `<td>` — never less
- Inputs: `px-3 py-2` minimum — if icon present, use `pl-10` on the input
- Section headers inside cards: `px-6 py-4`
- List rows inside cards: `px-6 py-3`
- Page wrapper: `px-8 py-8` for admin pages

**GLOBAL RULE:** Before delivering any UI code, visually trace every edge of every container and confirm content has breathing room from every border.

---

## Failure #9 — Search Icon Overlaps Input Text — Missing relative or pointer-events-none

The search input on the invoices page had the Search icon visually overlapping the placeholder text. The fix requires the wrapper div to have `relative` positioning AND the input to have enough left padding to clear the icon.

**WRONG:**
```tsx
<div className="flex-1 max-w-sm"> {/* missing relative */}
  <input className="pl-4 ..." /> {/* pl-4 not enough */}
</div>
```

**CORRECT:**
```tsx
<div className="relative flex-1 max-w-sm"> {/* relative required */}
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
  <input className="pl-10 ..." /> {/* pl-10 clears the icon */}
</div>
```

**Rule:** Icon width ~16px + left-3 (12px) = ~28px. Use `pl-10` (40px) on input to give the text comfortable space after the icon.

---

## Failure #10 — Using Next.js Image Component for Supabase Signed URLs

Next.js `Image` component requires configured domains in `next.config.js`. Supabase signed URLs and `blob:` URLs from camera capture are not in the allowed domains list and will throw an error or show a broken image.

**WRONG:**
```tsx
import Image from "next/image"
<Image src={photoUrl} width={400} height={300} />
```

**CORRECT:**
```tsx
<img src={photoUrl} className="w-full h-full object-cover" />
```

**Rule:** Always use a plain `<img>` tag for Supabase storage URLs and `blob:` URLs from camera capture. Never use Next.js `Image` for these.

---

## Failure #11 — Structure Tab Shows "No Site Assigned" — Wrong siteId Prop

The `BuildingStructure` component receives a `siteId` prop. The buildings table stores `site_id` as a job UUID (since site data was moved from `customer_sites` onto jobs). Passing `job.site.id` caused "no site assigned" because `job.site.id` does not exist — site data lives directly on the job object.

**WRONG:**
```tsx
<BuildingStructure siteId={job.site.id} /> {/* job.site does not exist */}
```

**CORRECT:**
```tsx
<BuildingStructure siteId={job.id} /> {/* buildings.site_id = jobs.id */}
```

**Rule:** The buildings table uses `site_id` to store the `job.id` directly. Always pass `job.id` as siteId to BuildingStructure. There is no separate site object.

---

## Failure #12 — Querying Tables That Do Not Exist in the Database

Claude Code queried `job_materials` and `job_time_entries` in the invoice generation function. Neither of these tables exists. The correct table for logged materials is `room_materials`. There is no time entries table — labour comes from Xero (not yet integrated).

**Tables that DO NOT exist (do not query these):**
- `job_materials` — does not exist (use `room_materials`)
- `job_time_entries` — NOW EXISTS (created for Xero timesheet sync, status: unassigned/assigned/ignored)
- `customer_sites` — does not exist (site data lives on jobs table)
- `job_photos` — does not exist (photos in `penetration_photos`, storage in `job-photos` bucket)

**Tables that DO exist for related data:**
- `room_materials` — materials logged per room by workers during job execution
- `penetration_photos` — photos attached to penetration evidence records
- `job_assignments` — worker → job assignments
- `job_evidence_fields` — admin-configured evidence fields per job
- `job_material_defaults` — materials pre-configured per job by admin

**Rule:** Before writing any Supabase query, check the database tables list in build-status.md. Never assume a table exists.

---

## Failure #13 — Material Prices Shown to Workers — Must Be Hidden

Workers must never see material unit prices or cost totals. This information is admin-only. The materials log component receives a `userRole` prop which must be checked before rendering any price or cost data.

**WRONG:**
```tsx
<td>{currency(mat.unit_price)}</td> {/* visible to everyone */}
```

**CORRECT:**
```tsx
{userRole !== "worker" && <td>{currency(mat.unit_price)}</td>}
```

**Rule:** Any price, `unit_price`, `total_cost`, or cost data must be gated with `userRole !== "worker"`. Workers see: material name, quantity, unit. Nothing else.

---

## Failure #14 — Two Nav Items Highlighted Simultaneously

The Team and Settings nav items were both highlighted at the same time when on the Team page. This happens when the active state check uses `pathname.startsWith()` and both paths share a common prefix. `/settings` and `/settings/team` both start with `/settings`, so both match.

**WRONG:**
```ts
isActive = pathname.startsWith(item.href) // /settings matches /settings/team
```

**CORRECT:**
```ts
isActive = pathname === item.href || (item.href !== "/settings" && pathname.startsWith(item.href))
```

**Rule:** Use exact pathname match for top-level nav items like `/settings`. Only use `startsWith` for items that intentionally own a whole sub-tree.

---

## Failure #15 — Worker Back Button Routes to Admin Job Detail Instead of Worker Jobs List

The back button on the worker execute page was pointing to `/jobs/[id]` which is the admin job detail page. Workers should never land on admin pages. The worker job detail (site briefing card) is at `/today/[id]` and the worker jobs list is at `/today`.

**Route separation rules:**
- `/jobs/[id]` — admin job detail (admin and manager only)
- `/today` — worker jobs list (worker only)
- `/today/[id]` — worker job detail / site briefing card (worker only)
- `/jobs/[id]/execute` — worker execution page (worker only, accessed from `/today/[id]`)

**WRONG:**
```tsx
router.back() {/* could go anywhere */}
href={`/jobs/${jobId}`} {/* admin page */}
```

**CORRECT:**
```tsx
href={`/today/${jobId}`} {/* worker job detail */}
```

---

## Failure #16 — Terminal Command Fails — zsh Interprets ? in URLs as Wildcard

When running `claude mcp add` commands with URLs containing query parameters (`?key=value`), zsh interprets the `?` as a filename wildcard and throws: `zsh: no matches found`. This happened when connecting the Supabase MCP server.

**WRONG:**
```bash
claude mcp add supabase-boris --transport http https://mcp.supabase.com/mcp?project_ref=xyz
```

**CORRECT:**
```bash
claude mcp add supabase-boris --transport http "https://mcp.supabase.com/mcp?project_ref=xyz"
```

**Rule:** Always wrap URLs containing `?` or `&` in double quotes when using them in zsh terminal commands.

---

## Failure #17 — Insert Fails — Column Names Do Not Match Schema

Invoice insert failed because the code used column names that did not match the actual database schema. The invoices table had `issued_date` but code used `issue_date`. The table did not have a `line_items` JSONB column but the insert tried to write to it. The table did not have `created_by`, `paid_date`, `payment_method`, or `payment_reference` at creation time.

**Prevention rules:**
- Always verify exact column names in Supabase Table Editor before writing insert statements
- Never insert into a column without confirming it exists in the schema
- If a column is needed but does not exist, write the ALTER TABLE migration first
- After running a migration, confirm it succeeded before writing the insert code
- Check: `issued_date` (not `issue_date`), `paid_date`, `payment_method`, `payment_reference`, `created_by` all need ALTER TABLE if adding later

---

## Failure #18 — Bottom Nav Bar Overlaps Page Content on Worker Mobile Views

The fixed bottom navigation bar on worker mobile pages overlapped the bottom of the page content. Buttons, form elements, and key actions at the bottom of the screen were hidden behind the nav bar.

**WRONG:**
```tsx
<div className="pb-4"> {/* not enough bottom padding */}
```

**CORRECT:**
```tsx
<div className="pb-24"> {/* pb-24 clears the fixed bottom nav bar */}
```

**Rule:** All worker/mobile pages that have a fixed bottom nav must have `pb-24` on the main content wrapper to prevent the nav bar from hiding content.

---

## Failure #19 — git push Fails — GitHub Personal Access Token Expired

`git push` prompted for username and password. The existing personal access token had expired. Git uses the token as the password for HTTPS-based GitHub authentication.

**Fix:**
1. Go to github.com > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token (classic) — not fine-grained
3. Set expiration to 90 days or No expiration
4. Check the `repo` scope only
5. Copy the token immediately (only shown once)
6. Use it as the password when git prompts
7. Run: `git config --global credential.helper osxkeychain` to save it

---

## Failure #20 — Complete Job Button Left in Worker Execute View — Should Not Exist There

The Complete Job button was showing on the worker execution page. Job completion is handled from the worker job detail (site briefing) page, not the execute page. The execute page is for logging penetrations, photos, and materials only.

**Execute page contains only:**
- Location picker (building > level > room)
- Penetration logging form with evidence fields and photo upload
- Materials log per room
- Mark room done button
- Overview panel of rooms in current level

**Execute page must NOT contain:**
- Complete Job button
- Job status change controls
- Admin-only information (prices, costs, internal notes)

---

## Quick Reference — Most Common Mistakes

| Mistake | Correct Pattern |
|---|---|
| `auth.user_company_id()` | `SELECT company_id FROM users WHERE id = auth.uid()` |
| `max-w-` on admin pages | `w-full` with px padding only |
| `job.assignments` | Fetch from `job_assignments` table separately |
| `<Image>` for Supabase URLs | Plain `<img>` tag |
| `job.site.id` as siteId | `job.id` as siteId |
| `job_materials` table | `room_materials` table |
| `job_time_entries` table | Now exists — populated by Xero timesheet sync |
| Select without `appearance-none` | `appearance-none` + ChevronDown overlay |
| Logic in `page.tsx` | Move to `lib/services/` |
| URL with `?` unquoted in zsh | Wrap entire URL in double quotes |
| `pb-4` on worker pages | `pb-24` to clear fixed bottom nav |
