---
name: iteration-plan
description: >
  Split one or more refined Jira Stories into technical sub-tasks with full implementation
  detail, estimated in ideal hours, classified as AFK or HITL, with dependencies mapped as
  Jira Blocks links. Reads the codebase of the repository where it runs to produce
  self-contained sub-task descriptions — a developer or AFK agent can start implementation
  by reading only the sub-task, without consulting any other source. Trigger when the user
  says "/iteration-plan", "/iteration-plan PROJ-N", "split story into tasks", "technical
  tasks for PROJ-N", "prepare sprint", "break down story for implementation", "crear tareas
  técnicas", "iteration plan", or any variation of preparing a refined story for sprint
  execution. Run this skill from the implementation repository (where the source code lives),
  not from the project-management repository.
---

# /iteration-plan — Iteration Planning

Divide one or more refined Jira Stories into technical sub-tasks with full implementation
detail. Each sub-task is self-contained: a developer or AFK agent reads only that sub-task
to implement it — no additional context needed.

> **Run from the repository where the source code lives.** The codebase analysis in Step 2 requires direct access to the source code. If the implementation lives in this same monorepo, you are already in the right place.
>
> **Jira model:** Sub-tasks are child issues of the Story, created with the project's
> configured sub-task types (queried at runtime). Read `references/jira.md` for all MCP calls.

---

## Step 0 — Resolve story/stories and available sub-task types

**Input modes:**
- Single story key: `/iteration-plan CDKX-10` → use directly
- Multiple keys: `/iteration-plan CDKX-10 CDKX-11` → process each in order
- No arguments → search stories ready for iteration planning:
  ```
  project = <KEY> AND sprint in futureSprints() AND issuetype = Story AND status = "To Do" ORDER BY priority ASC
  ```
  Show results and ask which stories to include.

Verify each story meets both conditions:
1. Status is `To Do`
2. Assigned to a future (not yet started) sprint — `sprint in futureSprints()`

If either condition fails, stop and inform the user. Iteration planning happens while
preparing the next sprint: the story must already be assigned to it (sprint planning),
but the sprint must not have started yet. If the story has no sprint or is in an active
sprint, it is not ready for iteration planning.

---

## Step 1 — Fetch full context for each story

For each story, collect:
- **Jira story**: summary, description (FRs, NFRs, ACs), parent Epic key
- **Parent Epic**: success criteria (SC) from Epic description
- **PRD**: Confluence URL in story description → fetch page content

Read `references/confluence.md` for Confluence fetch calls.
Read `references/jira.md` for Jira fetch calls.

---

## Step 2 — Technical codebase analysis

Detect the project language by reading `CLAUDE.md` (look for keywords:
`TypeScript`, `ts-node`, `npm`, `pnpm`, `tsconfig` → TypeScript;
`Go`, `go.mod`, `go install` → Go). Then load the matching reference:
- **TypeScript project**: `references/codebase-analysis-typescript.md`
- **Go project**: `references/codebase-analysis-go.md`

Two sequential sub-processes. The output is **not a document** — it feeds directly into
the sub-task descriptions in Step 4. Every file path, pattern reference, and interface
signature discovered here will appear verbatim in the relevant sub-task's body.

**2a. Technical exploration:**
Map each FR to concrete modules, files, and interfaces in the codebase. Find existing
patterns to follow. Understand the repo's conventions (CLAUDE.md, CONTRIBUTING.md, etc.).

For each new class identified, classify it as:
- **Stateful** (holds data between calls, injected dependencies): instance methods,
  constructor injection — e.g., `new CliProgram(version).build()`
- **Stateless service** (pure computation, no injected state): static methods —
  e.g., `NodeVersionGuard.check()`, `CrnParser.parse(input)`

This classification feeds directly into the Interface Contracts and Project Rules Check
sections of each sub-task description.

**2b. Coverage and gap analysis:**
Cross-reference each AC with the code. Flag FRs with no clear implementation path and
ACs with no existing module to extend — these are spike candidates.

---

## Step 3 — Clarify testing approach and branch convention

Before proposing the split, ask:

> _"Does this story use TDD?"_
> - **Yes, TDD** → unit tests are written first, inside the same sub-task as the
>   implementation. No separate unit-test sub-tasks.
> - **No** → unit tests can be a separate sub-task after implementation.

> _"Are integration or e2e tests required?"_
> - If yes → always a separate sub-task (type: **Automation**), regardless of TDD.

Confirm the branching convention:
> _"One branch per story (`feature/CDKX-10-short-title`), not per sub-task. All sub-tasks
> are completed within that branch. Is that correct for this project?"_

---

## Step 4 — Propose sub-task split

Read `references/task-split.md` for task types, sizing rules, AFK/HITL classification,
and the TDD/non-TDD rules confirmed in Step 3.

Each sub-task covers 1–3 related FRs/ACs. Target size: **4–8 ideal hours** (~1 per dev-day).

Map each sub-task to the correct Jira issue type from Step 0:
- Functional implementation → **Development**
- Unit tests (non-TDD only) → **Development** or **Automation**
- Integration / e2e tests → **Automation**
- Spike → **Análisis**
- Interface / architecture decision → **Architecture Design** (always HITL)
- Documentation → **Documentation**

Use `assets/task-template.md` for every sub-task description.
The description must be **self-contained**: file paths, pattern references with `file:line`,
interface signatures, ACs covered. A dev or AFK agent reads only this.

Apply the statefulness classification from Step 2: stateless classes must expose static
methods (Service pattern). Reflect this in the Interface Contracts and Project Rules Check
sections of each sub-task.

---

## Step 5 — Map dependencies between sub-tasks

After defining all sub-tasks, identify the natural execution order:
- Which sub-tasks cannot start until another is complete?
- Common patterns: Wiring depends on Functional; Integration tests depend on all Functional tasks

Produce a simple dependency graph for user review. These become Jira `Blocks` links in Step 7.

---

## Step 6 — Verify AC coverage and show proposal

Check that every AC in the story is covered by at least one sub-task. Flag uncovered ACs
as gaps — resolve before proceeding.

Present the full proposal and wait for approval:

```markdown
## Iteration Plan — CDKX-10: plan command entry point

| # | Sub-task | Type | Mode | Est. | Depends on |
|---|----------|------|------|------|------------|
| 1 | Implement --output-dir flag and manifest loader | Development | AFK | 4h | — |
| 2 | DAG construction + topological sort | Development | AFK | 6h | 1 |
| 3 | Wave assignment algorithm | Development | AFK | 4h | 2 |
| 4 | plan.json serialization (structure + verbatim props) | Development | AFK | 3h | 3 |
| 5 | .cdkx/ directory creation + file write | Development | AFK | 2h | 4 |
| 6 | Error handling (invalid dir, missing manifest, missing template) | Development | AFK | 3h | 1 |
| 7 | Integration tests — full plan pipeline | Automation | AFK | 4h | 3, 6 |

Total: 26h | AFK: 7 | HITL: 0 | Spikes: 0

AC coverage: AC-1 → #1,2,3 ✅ | AC-2 → #3 ✅ | ... | All 12 ACs covered ✅
Branch: feature/CDKX-10-plan-command-entry-point
```

Iterate until the user approves.

---

## Step 7 — Create sub-tasks in Jira

Read `references/jira.md` for the exact MCP calls.

For each sub-task, follow this sequential pattern:

1. Call `mcp__atlassian__createJiraIssue` with:
   - `issuetype`: the type ID from Step 0 matching the sub-task's type
   - `parent`: the Story key
   - `summary`: short noun-phrase title (never "As a…")
   - `description`: full self-contained body from `assets/task-template.md`
   - `customfield_10231`: `{"id": "<option-id>"}` — query allowed values via `getJiraIssueTypeMetaWithFields` at runtime to get the correct option IDs for AFK and HITL
   Save the returned issue key.

2. Immediately call `createIssueLink` for every dependency of that sub-task identified in
   Step 5. Do not move to the next sub-task until all its Blocks links are created.

Never batch all issue creations before creating links.

---

## Step 8 — Report

For each story processed:
- List of sub-tasks created with URLs
- Total hours estimate vs. story points
- Breakdown: N AFK, N HITL, N spikes, N integration-test tasks
- Dependencies mapped
- Branch name convention: `feature/<STORY-KEY>-<kebab-title>`
- Reminder: devs self-assign sub-tasks when the sprint starts — no allocation now

Flag if total hours > 24h for a Size M story or > 40h for Size L (suggest splitting the story).

---

## Rules

- Sub-tasks are never allocated to individuals during iteration planning.
- Only include work that adds direct value: code, tests, design, relevant meetings. No admin.
- Sub-task descriptions must be fully self-contained — no "see story for context".
- If technical uncertainty exists for a FR, create a spike sub-task first; add a placeholder for the implementation sub-task with a rough estimate to be updated after the spike.
- Integration and e2e tests are always separate sub-tasks (type: Automation), regardless of TDD.
- With TDD, unit tests are embedded in the functional sub-task — never create a separate unit-test sub-task.
- Architecture Design sub-tasks are always HITL — they require a human decision before proceeding.
- Tasks not covered by the DoD (documentation, deployment) should be included only if this story specifically requires them.
