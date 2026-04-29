---
name: autonomous-window
description: Prepare an autonomous work session for a future 5-hour API window. Sets a timed cron that auto-executes a task from the queue when the window resets. Use when you want Claude to work while you are away.
disable-model-invocation: false
arguments: [time-and-task]
---

# Autonomous Window — Skill

This skill has two phases. Phase 1 runs when the user invokes the skill. Phase 2 runs when the cron fires.

---

## Phase 1: SETUP (user invokes the skill)

The user will say something like:
- "Use autonomous-window. Window resets at 6:00 AM. Task: build the Drawings tab."
- "Use autonomous-window. 11 AM. Pick up from queue."
- "Autonomous window for 4 PM."

### Step 1: Parse the input

Extract from the user's message:
- **Time**: When the 5-hour window resets (e.g. "6:00 AM", "11 AM", "16:00")
- **Task** (optional): What to work on. If not provided, the session will read from the queue file.

### Step 2: Check the queue

Read `.claude/queue/next-task.md` if it exists.

- If the user gave a **specific task**: Update the queue file with that task (use the format below).
- If the user said **"pick up from queue"** or gave no task: Confirm what's currently in the queue file and ask the user if that's correct.
- If the queue file doesn't exist and no task was given: Ask the user what task to set.

**Queue file format** (`.claude/queue/next-task.md`):

```markdown
# Next Task

## Task
<clear description of what to build>

## Context
<relevant context — which existing files/tables/components this touches>
<reference to CLAUDE_REFERENCE files for specs>

## Previous Run
<what the last autonomous run completed, or "None — first run">
<what's remaining, or "Full task">
```

### Step 3: Convert time to cron expression

Convert the user's time to a cron expression. Add 5 minutes buffer after the window reset:
- "6:00 AM" → `5 6 <date> <month> *`
- "11:00 AM" → `5 11 <date> <month> *`
- "4:00 PM" → `5 16 <date> <month> *`

Determine the correct date:
- If the time is later today → use today's date
- If the time has already passed today → use tomorrow's date

### Step 4: Create the cron

Use CronCreate with these settings:
- `recurring: false` (one-shot — fires once then deletes)
- `durable: false` (session-scoped — lives as long as this tab is open)
- `cron`: the expression from Step 3
- `prompt`: the FULL Phase 2 execution prompt below (copy it exactly, filling in the current date/time)

### Step 5: Confirm to the user

Tell the user:
```
Cron set for [TIME].
Task: [task summary or "reading from queue"]
This tab will sit idle until then. Keep VS Code open — don't close this tab.
```

Then STOP. Do nothing else. Wait for the cron to fire.

---

## Phase 2: EXECUTION (the cron prompt)

When creating the cron in Step 4, use this as the prompt. This is what fires when the window opens:

```
You are running an autonomous work session. No human is at the computer. Work carefully, commit often, and write a summary when done.

RULES:
- Read CLAUDE.md FIRST — follow every rule in it
- Read CLAUDE_REFERENCE/recurring-failures.md — check every known failure before writing code
- Commit after EVERY logical unit of work (one component, one service function, one migration, etc.)
- Run npx tsc --noEmit before every commit — never commit TypeScript errors
- Follow all architecture rules: services in lib/services/, admin pages w-full, RLS subquery pattern, etc.
- Do NOT run SQL migrations — write them to a file and note it in the summary
- If you encounter a decision that needs Oliver's input, note it in the summary and move to the next thing you CAN do

STEP 1 — ORIENT:
1. Read CLAUDE.md
2. Read CLAUDE_REFERENCE/build-status.md and CLAUDE_REFERENCE/recurring-failures.md
3. Read .claude/queue/next-task.md to get your task
4. Run: git log --oneline -10
5. Run: git status
6. Run: npx tsc --noEmit 2>&1 | head -50
7. Scan lib/services/ and app/(dashboard)/ to understand current patterns

STEP 2 — PLAN:
1. Based on the task in the queue file, break it into small committable units
2. Read any existing files the task depends on or modifies
3. Read the relevant CLAUDE_REFERENCE files for specs (database-schema.md, design-rules.md, etc.)
4. Write your plan to .claude/summaries/ immediately (safety net if session dies)

STEP 3 — EXECUTE:
Work through your plan step by step. For EACH unit:
1. Write the code (complete file rewrites, not partial edits)
2. Run npx tsc --noEmit — fix any errors before continuing
3. Run the pre-commit scan: check for auth.user_company_id(), missing appearance-none on selects, max-w- on admin pages, queries in page.tsx, <Image> with Supabase URLs, missing pb-24 on worker pages
4. git add the specific files you changed (not git add .)
5. git commit with a descriptive message
6. Update .claude/summaries/ with progress

STEP 4 — WRAP UP:
When you have finished the task OR completed a reasonable amount of work:

1. Run final npx tsc --noEmit
2. Run git log --oneline -10 to capture what you committed

3. Write the summary file at .claude/summaries/YYYY-MM-DD-HHMM.md:
   ---
   # Autonomous Run — [DATE TIME]
   ## Task
   [What was the task]
   ## Completed
   [List each thing done with commit hash]
   ## Remaining
   [What's left, or "Nothing — task complete"]
   ## Blockers / Decisions for Oliver
   [Anything that needs human input]
   ## SQL Migrations to Run
   [Any SQL that needs to be run manually in Supabase, or "None"]
   ## Files Changed
   [List of files created or modified]
   ---

4. Update .claude/queue/next-task.md:
   - If task is COMPLETE: Check CLAUDE_REFERENCE/build-roadmap.md and write the next logical task from the roadmap into the queue file. Update the "Previous Run" section.
   - If task is NOT complete: Update the queue file with what's remaining and what was done. Keep the same task but update context.

5. Send a final message: "Autonomous run complete. Summary written to .claude/summaries/[filename]. Queue updated."
```

---

## Important Notes

- **VS Code must stay open** with this tab running for the cron to fire
- **Crons are session-scoped** — if VS Code restarts, the cron is lost
- **Each tab = one autonomous run** — open one tab per 5-hour window
- **Tabs don't talk to each other in real-time** — coordination happens through the queue file, which is read at the START of each run
- **If the session hits the API limit mid-work**, it will stop abruptly. The frequent commits ensure minimal work is lost. The summary may not be written in this case — Oliver should check git log.
