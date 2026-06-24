# Task Split — Iteration Plan

Rules and guidelines for splitting a user story into sub-tasks.

---

## Sub-task types and Jira issue type mapping

Use the types discovered at runtime in Step 0 (`getJiraProjectIssueTypesMetadata`).
The mapping below covers the typical type names in the CDKX project:

| Sub-task kind | Jira issue type | Mode |
|---------------|----------------|------|
| Functional implementation | **Development** | AFK (usually) |
| Unit tests (non-TDD only) | **Development** or **Automation** | AFK |
| Integration / e2e tests | **Automation** | AFK |
| Technical spike | **Análisis** | HITL |
| Interface / architecture decision | **Architecture Design** | HITL (always) |
| Documentation | **Documentation** | AFK or HITL |
| Infrastructure / deployment | **Deployment** | HITL (usually) |

---

## TDD vs. non-TDD

Ask the user in Step 3 before splitting. The answer changes the sub-task structure:

### TDD mode
- Unit tests are written **before** the implementation, in the **same sub-task**
- Sub-task title: `Implement <feature> (TDD)` — tests implicit
- Sub-task type: **Development**
- **Do NOT** create a separate unit-test sub-task

### Non-TDD mode
- Implementation and unit tests can be separate sub-tasks
- Implementation sub-task: type **Development**, AFK
- Unit test sub-task: type **Development** or **Automation**, AFK
- The test sub-task must reference the implementation sub-task it covers

### Integration / e2e tests — always separate

Regardless of TDD:
- Integration and e2e tests cross component or layer boundaries
- Always a dedicated sub-task, type **Automation**
- Depends on all relevant functional sub-tasks being complete
- These are written **after** the functional implementation exists

---

## Task sizing

Target: **4–8 ideal hours per sub-task** (~1 task per developer per day).

| Size | Hours | Guidance |
|------|-------|----------|
| Too small | < 2h | Merge with a related sub-task |
| Right | 2–8h | Proceed |
| Too large | > 8h | Split further |

A task is too large if it touches more than 3–4 files or covers more than 3 distinct ACs.
When in doubt, split — smaller tasks flow better through the sprint.

---

## AFK vs. HITL classification

**AFK (Away From Keyboard)** — an agent or developer can execute this sub-task to completion
without human input, given only the sub-task description:
- Implementation of a well-specified function or module
- Writing unit or integration tests for a concrete AC
- Wiring a CLI command to existing logic
- Documentation of a finished feature

**HITL (Human In The Loop)** — a human must review, decide, or sign off at some point:
- Defining a public interface or API contract (impacts other code or consumers)
- Architecture decisions with multiple valid approaches
- Spikes where the result requires team discussion before proceeding
- Any sub-task that could break external consumers

When a sub-task is HITL, note the reason in the description so the assignee knows
what decision is expected of them.

---

## Dependency rules

Dependencies between sub-tasks follow natural implementation order:

- **Functional → Wiring**: the feature must exist before it can be wired into the CLI
- **Functional → Unit tests** (non-TDD): implementation before test sub-task
- **All Functional → Integration tests**: all components must exist before cross-component tests
- **Spike → Placeholder**: resolve the spike before estimating the implementation

Represent dependencies as Jira `Blocks` links (created in Step 7):
- Sub-task A **Blocks** sub-task B means B cannot start until A is done

Do not add dependencies that are not real blockers — unnecessary ordering slows the sprint.

---

## Branching convention

One branch per story, not per sub-task:

```
feature/<STORY-KEY>-<kebab-short-title>
# e.g. feature/CDKX-10-plan-command-entry-point
```

All sub-tasks are implemented and committed on this branch. The PR is opened against `main`
when all sub-tasks are complete and the story's ACs pass.

Sub-tasks track progress within the branch — they are not separate deployment units.

---

## Spike sub-tasks

Use a spike when a FR or AC has no clear implementation path after codebase exploration:

1. Create a **spike sub-task** (type: **Análisis**, HITL):
   - Title: `Spike: investigate <unknown>`
   - Timebox: 2–4 hours
   - Goal: answer a specific question (stated in the description)
   - Output: a concrete recommendation, not just findings

2. Create a **placeholder sub-task** (type: **Development**):
   - Title: `[Pending spike] Implement <feature>`
   - Mark it blocked by the spike (Blocks link)
   - Include a rough hour estimate with `(TBD after spike)` note

After the spike, update the placeholder's description and estimate before implementation starts.

---

## Principles from docs/iteration-planing.md

- Tasks are not allocated during iteration planning — devs self-assign when the sprint starts
- Estimations are in ideal hours, not story points
- Task estimating is a team endeavor — avoid individual estimates during planning
- Include only work that adds direct value: implementation, tests, design, relevant project meetings
- Do not include admin tasks (email, unrelated meetings, general overhead)
- The right size is ~1 task per developer per day; larger tasks create bottlenecks
- Some design discussion during iteration planning is appropriate — deep architectural analysis is not
