---
name: opening-prompt
description: Generate a comprehensive opening prompt for a new Claude Code session to build a specific feature. Use when starting a new feature from the roadmap.
disable-model-invocation: true
arguments: [feature-name]
---

# Generate Opening Prompt for New Session

The user wants to start a new Claude Code session to build: **$ARGUMENTS**

## Step 1: Read context files (run in parallel)

1. Read `CLAUDE_REFERENCE/build-roadmap.md` — find the feature details and requirements
2. Read `CLAUDE_REFERENCE/build-status.md` — understand current state and what exists
3. Read `CLAUDE_REFERENCE/mvp-checklist.md` — check where this feature sits in priorities
4. Read `CLAUDE_REFERENCE/database-schema.md` — understand existing schema
5. Read `CLAUDE_REFERENCE/design-rules.md` — know the design standards

## Step 2: Identify related existing code

Find and read files that the new feature will depend on or need to integrate with. For example:
- Existing page patterns the feature should follow
- Service files it will interact with
- Components it might reuse
- Database tables it will reference

## Step 3: Write the opening prompt

Generate a complete, self-contained prompt that includes:

1. **File reading instructions** — List the exact files the new session should read first (CLAUDE.md, relevant CLAUDE_REFERENCE files, and specific code files related to this feature)

2. **Orientation commands** — `find` and `git log` commands from CLAUDE.md section 0

3. **What we're building** — Clear description of the feature

4. **Requirements** — Numbered, detailed requirements covering:
   - Database changes (new tables, columns, relationships)
   - New routes/pages needed
   - Components to create or reuse
   - Service layer functions
   - Admin vs worker vs customer access
   - Design rules specific to this feature

5. **SQL migration note** — "Write the migration SQL but DO NOT run it — just give me the SQL to run manually (Supabase MCP not working)"

6. **Plan-first instruction** — "Do NOT build yet — first explain your full plan (files to create/modify, database changes, route structure) and wait for my approval before writing any code."

## Output format

Output the prompt inside a markdown code block so the user can copy-paste it directly into a new Claude Code session.
