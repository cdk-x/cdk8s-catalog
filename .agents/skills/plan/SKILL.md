---
name: plan
description: Turn a spec (GitHub issue or Confluence PRD page) into a structured technical plan with architecture decisions, affected modules, interface contracts, and phased implementation — then post it back to the source. Trigger this skill when the user says "/plan", "plan issue #N", "plan this PRD", "create a technical plan", "implementation plan for #N", "how should we implement issue #N", "break this spec into phases", or any variation of wanting to plan a feature from a GitHub issue or Confluence page. Also trigger when the user has just created a spec (via /spec or /prd) and wants to move to the planning stage.
---

# /plan — Technical Plan

Turn a spec (GitHub issue or Confluence PRD page) into a structured technical plan with implementation phases, then post it back to the same platform.

## Step 0 — Determine the source

Check the context for a clear signal:
- User mentioned "issue", "GitHub", or a bare number → use GitHub
- User mentioned "Confluence", "page", "PRD page", or a URL → use Confluence

If there is no clear signal, ask: *"Is the spec in a GitHub issue or a Confluence page?"*

Read the corresponding reference file so you have the fetch and publish details ready:
- GitHub → `references/github.md`
- Confluence → `references/confluence.md`

---

## Step 1 — Fetch the spec

Follow the instructions in the reference file to retrieve the spec content. If the spec is empty or has no actionable content, tell the user and stop.

---

## Step 2 — Explore the codebase

Understand the impact area before drafting — a plan written without reading the code often conflicts with existing patterns or misses key interfaces. Look for:
- Which packages and modules the feature touches
- Existing patterns to follow or extend (don't invent when convention exists)
- Relevant data structures and interfaces
- A project constitution (`CLAUDE.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`, or similar) — note architecture rules and coding conventions to validate against later

---

## Step 3 — Resolve genuine unknowns

If exploration surfaces questions that would prevent a credible plan, ask them inline — max 3, one at a time, waiting for each answer before asking the next. Only ask what you genuinely can't determine from the code or spec. The final draft must have no open questions; if something remains unknowable, state it as a named assumption.

---

## Step 4 — Draft the plan

Use the template in `assets/plan-template.md`.

---

## Step 5 — Validate against project rules

If you found a project constitution in Step 2, check the plan against it. Flag any deviations with explicit justification. Skip the "Project Rules Check" section from the template if no constitution exists.

---

## Step 6 — Show the draft for review

Show the full plan to the user. Do NOT post yet.

---

## Step 7 — Iterate

Incorporate feedback (back to Step 4) until the user approves.

---

## Step 8 — Publish

Follow the publish instructions in the reference file for the chosen platform.

---

## Step 9 — Report

Tell the user where the plan was posted. If this is part of a spec→plan→analyze workflow, mention what command comes next.

---

## Rules

- **Phases map to the spec's user stories**: each phase delivers user-visible value, not internal scaffolding.
- **Phase 1 is always a tracer bullet**: a thin end-to-end slice that is demoable and validates the architecture early. If Phase 1 is "set up project structure" or "create the database schema", it's not a tracer bullet — push it to include a real user-facing interaction.
- **No open questions in the final draft**: unresolved items become named assumptions, never dangling questions.
- **Omit template sections that don't apply**: a plan without data model changes doesn't need a Data Model section. Shorter plans are easier to act on.
- **Don't re-specify what existing skills already own**: if the project has skills for conventional commits, testing, or linting, reference them by name — don't reproduce their rules in the plan.
