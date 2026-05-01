# BORIS Killer Project Knowledge Base

> Created: February 16, 2026
> For: Claude Project about BORIS Killer development

---

## What This Is

This is a comprehensive knowledge base documenting everything about the BORIS Killer project. These files are designed to be uploaded to a Claude Project, giving any AI assistant instant, complete context about:

- What we're building and why
- Technical decisions and architecture
- Current state and progress
- How Oliver works and prefers to learn
- What's next and how to get there

---

## How to Use These Files

### Option 1: Upload to Claude Project (Recommended)
1. Go to claude.ai
2. Create a new Project called "BORIS Killer"
3. In Project Settings → Knowledge
4. Upload all 7 markdown files
5. Any conversation in this project will have full context

### Option 2: Share in Regular Conversations
When starting a new chat with Claude, upload 1-2 most relevant files:
- Building a feature? → Upload 03_DATABASE_SCHEMA.md + 05_CURRENT_STATE.md
- Planning next steps? → Upload 07_NEXT_STEPS.md
- Debugging auth? → Upload 04_AUTHENTICATION.md

---

## File Descriptions

### 01_PROJECT_OVERVIEW.md
**What it contains:**
- Project identity and positioning
- Core value proposition
- Target market
- Business model and goals
- Founder context (Oliver's background)
- Brand voice and communication style

**Use this when:**
- Starting a new conversation
- Explaining the project to someone new
- Making strategic decisions
- Writing marketing copy
- Considering new features

### 02_TECHNICAL_STACK.md
**What it contains:**
- Complete technology choices (Next.js, Supabase, TypeScript, etc.)
- Architecture decisions and rationale
- Project file structure
- Naming conventions
- Code patterns and templates
- Security considerations
- Performance optimizations

**Use this when:**
- Writing new code
- Making technical decisions
- Onboarding developers
- Troubleshooting tech issues
- Evaluating new tools/libraries

### 03_DATABASE_SCHEMA.md
**What it contains:**
- Complete database schema (14 tables)
- Field descriptions and types
- Relationships between tables
- RLS policies for every table
- Database functions and triggers
- Seed data examples
- Performance considerations

**Use this when:**
- Building features that touch the database
- Writing SQL queries
- Creating new tables/fields
- Understanding data relationships
- Debugging database errors
- Writing migrations

### 04_AUTHENTICATION.md
**What it contains:**
- Complete authentication implementation
- The "chicken-and-egg" problem and solution
- Two-phase signup flow explained
- All authentication code (database functions, server actions, UI)
- Security considerations
- Debugging guide
- Future authentication features

**Use this when:**
- Debugging auth issues
- Adding new auth features (password reset, etc.)
- Understanding why signup works the way it does
- Implementing user invitations
- Reviewing security

### 05_CURRENT_STATE.md
**What it contains:**
- Everything completed
- Everything partially done
- Everything not started
- File structure status
- Known issues and technical debt
- Development metrics
- Lessons learned
- Path to MVP launch

**Use this when:**
- Starting work on the project
- Figuring out what's already done
- Prioritizing next tasks
- Tracking progress
- Planning sprints
- Writing status updates

### 06_DEVELOPMENT_WORKFLOW.md
**What it contains:**
- Oliver's background and learning style
- How Oliver works (copy-paste workflow)
- Terminal command preferences
- Explanation preferences (simple first, then technical)
- Decision-making process
- Problem-solving approach
- Communication style with AI

**Use this when:**
- Explaining something to Oliver
- Choosing how to present information
- Breaking down complex tasks
- Writing instructions
- Understanding Oliver's questions
- Collaborating effectively

### 07_NEXT_STEPS.md
**What it contains:**
- Immediate action plan (this week)
- Week-by-week roadmap to MVP (12 weeks)
- Feature prioritization
- Post-launch roadmap
- Success metrics
- Risk mitigation
- Learning milestones

**Use this when:**
- Planning what to work on next
- Estimating timelines
- Prioritizing features
- Making scope decisions
- Setting goals
- Tracking against roadmap

---

## Quick Reference Guide

### "I need to build a new feature"
Read:
1. 05_CURRENT_STATE.md - Check if partially done
2. 03_DATABASE_SCHEMA.md - Understand data
3. 02_TECHNICAL_STACK.md - Follow patterns

### "I'm stuck on something"
Read:
1. 06_DEVELOPMENT_WORKFLOW.md - How to debug
2. 02_TECHNICAL_STACK.md - Check patterns
3. 04_AUTHENTICATION.md - If auth-related

### "What should I work on next?"
Read:
1. 07_NEXT_STEPS.md - See roadmap
2. 05_CURRENT_STATE.md - Know current state
3. 01_PROJECT_OVERVIEW.md - Align with goals

### "I want to understand the big picture"
Read:
1. 01_PROJECT_OVERVIEW.md - Business context
2. 02_TECHNICAL_STACK.md - Tech decisions
3. 07_NEXT_STEPS.md - Where we're going

---

## Update Schedule

These files should be updated:
- **Weekly:** 05_CURRENT_STATE.md (as progress is made)
- **Monthly:** 07_NEXT_STEPS.md (adjust roadmap)
- **As Needed:** Others when major changes happen

---

## Version History

**v1.0 - February 16, 2026**
- Initial creation
- 7 comprehensive documents
- ~40,000 words of documentation
- Covers everything from inception to now

---

## Future Additions

Documents to potentially add later:
- 08_API_DOCUMENTATION.md - When we build an API
- 09_TESTING_STRATEGY.md - When we add tests
- 10_DEPLOYMENT_GUIDE.md - Production deployment details
- 11_CUSTOMER_FEEDBACK.md - User research and feedback
- 12_TEAM_HANDBOOK.md - When we hire team members

---

## Key Insights for AI Assistants

### When working with Oliver:
1. **Explain simply first, then add technical detail**
2. **Break tasks into checkpoints** - small, verifiable steps
3. **Show "why" not just "what"** - Oliver values understanding
4. **Use his preferred tools** - Terminal commands, copy-paste workflow
5. **Be patient with questions** - No question is too basic
6. **Celebrate progress** - Acknowledge milestones
7. **Connect to bigger picture** - How does this feature help customers?

### Project Philosophy:
1. **Learn while building** - Speed is secondary to understanding
2. **Quality over quick hacks** - Build it right the first time
3. **Security at database level** - RLS policies, not app logic
4. **Multi-tenant from day 1** - Architecture that scales
5. **Customer-focused** - Solve pain, don't just add features

### Communication Style:
- ✅ "In simple terms: …" then "Technically: …"
- ✅ Step-by-step with checkpoints
- ✅ Explain trade-offs and alternatives
- ❌ Jargon without explanation
- ❌ "Just do this" without context
- ❌ Assuming framework knowledge

---

## Success Metrics for AI Assistance

**Good AI assistance should help Oliver:**
- ✅ Understand what he's building and why
- ✅ Write code confidently
- ✅ Debug issues independently
- ✅ Make informed technical decisions
- ✅ Learn patterns that apply to future features
- ✅ Feel empowered, not dependent

**Poor AI assistance creates:**
- ❌ Copy-paste without understanding
- ❌ Magic code that "just works"
- ❌ Dependence on AI for every decision
- ❌ Mysterious bugs from unexplained code
- ❌ Technical debt from quick fixes

---

> Remember: This isn't just documentation. It's the accumulated wisdom of every decision, every bug fixed, every lesson learned. Use it well. Build something customers love.
