---
name: update-refs
description: Update CLAUDE_REFERENCE files (build-status.md, mvp-checklist.md, build-roadmap.md) after completing a feature. Marks completed work and updates remaining items.
disable-model-invocation: true
allowed-tools: Read Edit Bash(git log *) Bash(git diff *)
---

# Update Reference Files After Feature Completion

After completing work, update the three key reference files to reflect current state.

## Step 1: Understand what changed

1. Run `git log --oneline -10` to see recent commits
2. Run `git diff HEAD~5 --stat` to see which files changed (adjust number as needed)
3. Ask the user to confirm what was just completed if not obvious

## Step 2: Read current reference files (run in parallel)

1. Read `CLAUDE_REFERENCE/build-status.md`
2. Read `CLAUDE_REFERENCE/mvp-checklist.md`
3. Read `CLAUDE_REFERENCE/build-roadmap.md`

## Step 3: Update each file

### build-status.md
- Move newly completed items from "Not Yet Built" to the appropriate "Completed Components" section
- Add detail about what was built (matching the style of existing entries)
- Update the "Last Updated" date
- Update the completion percentage estimate if significant progress was made
- Add any new database tables to the tables list
- Update "Known Issues / Technical Debt" if relevant

### mvp-checklist.md
- Check off completed items: change `- [ ]` to `- [x]`
- Do NOT add new items or change descriptions

### build-roadmap.md
- Move completed items from "IMMEDIATE NEXT" to "ALREADY COMPLETE"
- Update the "BUILD ORDER SUMMARY" table if phase priorities changed
- Update the "Last updated" date

## Step 4: Show the user

Summarize what you changed in each file so the user can verify.
