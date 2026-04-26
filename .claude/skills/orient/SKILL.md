---
name: orient
description: Session startup orientation. Scans codebase, checks recent commits, runs TypeScript check, reads build status and known failures. Use at the start of every new session.
disable-model-invocation: true
allowed-tools: Bash(find *) Bash(git log *) Bash(npx tsc *) Read Glob Grep
---

# Session Orientation

Run these steps in order to orient yourself before doing any work:

## Step 1: Scan the codebase and recent history (run in parallel)

1. Run `find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v .next | sort` to see all source files
2. Run `git log --oneline -20` to see recent commits
3. Run `npx tsc --noEmit 2>&1 | head -50` to check for TypeScript errors

## Step 2: Read key reference files (run in parallel)

1. Read `CLAUDE_REFERENCE/build-status.md` — understand what's complete and what's remaining
2. Read `CLAUDE_REFERENCE/recurring-failures.md` — know every failure pattern before writing code

## Step 3: Quick architecture scan

1. Read through `lib/services/` directory listing to understand service layer patterns
2. Check `app/(dashboard)/` directory structure to understand routing

## Step 4: Report to the user

Give a concise summary:
- **Recent work:** What the last few commits did
- **TypeScript status:** Clean or list of errors
- **Current state:** Key stats from build-status (% complete, what's done, what's next)
- **Known issues:** Any TypeScript errors or notable items from recurring failures that are relevant

Keep the summary short — bullet points, not paragraphs.
