# Codebase Analysis (Go) — Iteration Plan

This reference covers the two sequential sub-processes in Step 2 of `/iteration-plan`
for **Go projects**. The output feeds directly into sub-task descriptions —
every finding becomes content in the relevant sub-task body, not a separate document.

---

## §1 — Technical Exploration

Goal: map each Functional Requirement (FR) from the story to concrete files, modules,
interfaces, and patterns in the codebase. A dev reading a sub-task should see exactly
which files to open and which existing code to follow.

### 1.1 Read the project constitution

Before exploring code, read:
- `CLAUDE.md` — project rules, architecture constraints, naming conventions
- `CONTRIBUTING.md` — contribution guidelines, code style
- `ARCHITECTURE.md` (if present) — module boundaries, dependency rules

Note any MUST rules that will constrain implementation choices.

### 1.2 Understand the module structure

```bash
# Get the top-level layout
find . -maxdepth 3 -type d | grep -v vendor | grep -v .git

# Find entry points
find . -name "main.go" -path "*/cmd/*" | head -10
```

Identify:
- Which packages exist under `internal/`, `cmd/`, `pkg/`
- Where the CLI entry points are (`cmd/`)
- Where the domain logic lives (`internal/`)
- Where tests live (co-located `_test.go` files)

### 1.3 Map each FR to the codebase

For each FR in the story, answer:

1. **Does code for this already exist?**
   - If yes: find it, read it, identify what needs to extend/change
   - If no: identify where it should live by analogy with existing code

2. **Which files will be touched?**
   - List exact paths (e.g., `internal/planner/dag.go`, `cmd/plan/main.go`)

3. **What patterns should be followed?**
   - Find the closest existing example with `grep` or `find`
   - Note the file path and line range: `internal/synth/manifest.go:45-80`

4. **What interfaces need to be implemented or extended?**
   - Find the interface definition
   - Note the exact signature

```bash
# Find relevant types/interfaces
grep -r "type.*interface" --include="*.go" .

# Find how similar features are structured
grep -r "func.*Plan\|func.*parse\|func.*load" --include="*.go" .
```

### 1.4 Find test patterns

Identify how tests are written in this repo:
- Test file naming convention (`_test.go`, co-located with production code)
- Test helpers and fixtures used
- How mock dependencies are structured (interfaces + test doubles)
- Example of a well-written test to reference in sub-task descriptions

```bash
# Find test files
find . -name "*_test.go" | grep -v vendor | head -20

# Find test helpers
find . -path "*/testutil/*" -o -path "*/fixtures/*" | grep -v vendor | head -10
```

---

## §2 — Coverage and Gap Analysis

Goal: cross-reference every AC from the story with the implementation paths found in §1.
Flag anything that has no clear path — these become spike candidates or questions to the team.

### 2.1 Build the FR → AC → module map

Create a mental (or explicit) table:

| FR | ACs it covers | Module/files | Implementation path clear? |
|----|--------------|--------------|---------------------------|
| FR-1 | AC-1, AC-6 | `cmd/plan.go` | ✅ |
| FR-4 | AC-7 | `internal/planner/` | ⚠️ no existing similar code |
| FR-9 | AC-8 | `internal/planner/dag.go` | ✅ verbatim copy |

### 2.2 Flag gaps and spikes

For each ⚠️ or ❓:
- **Ambiguous implementation** → ask the user or propose two options (→ Architecture Design, HITL)
- **No existing module** → note it; the sub-task description must explain the approach from scratch
- **External dependency unknown** → create a spike sub-task to investigate

### 2.3 Detect conflicts with existing code

Check if the story's implementation will:
- Break existing interfaces (check all callers with `grep`)
- Require changes to shared packages that other code depends on
- Introduce circular imports between packages

```bash
# Find all usages of a function/type before changing it
grep -r "FunctionName\|TypeName" --include="*.go" . | grep -v "_test.go"
```

Flag conflicts for the Architecture Design sub-task (HITL) if a breaking change is needed.

### 2.4 Identify test infrastructure gaps

Check whether the test infrastructure supports the new sub-tasks:
- Are fixtures/mocks available for the data structures involved?
- Does the test framework support the assertion style needed (e.g., DAG equality)?
- Will integration tests need a test harness that doesn't exist yet?

If infrastructure is missing, add a sub-task to create it (type: Development or Automation).
