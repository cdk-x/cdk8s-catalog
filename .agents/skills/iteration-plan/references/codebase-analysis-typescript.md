# Codebase Analysis (TypeScript) — Iteration Plan

This reference covers the two sequential sub-processes in Step 2 of `/iteration-plan`
for **TypeScript projects**. The output feeds directly into sub-task descriptions —
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
find . -maxdepth 3 -type d | grep -v node_modules | grep -v .git | grep -v dist

# Find entry points
find . -name "index.ts" -o -name "main.ts" | grep -v node_modules
```

Identify:
- Which packages/modules exist under `src/`
- Where the CLI entry points are
- Where the domain logic lives (separate from infrastructure)
- Where tests live and what framework is used (Jest / Vitest)

### 1.3 Map each FR to the codebase

For each FR in the story, answer:

1. **Does code for this already exist?**
   - If yes: find it, read it, identify what needs to extend/change
   - If no: identify where it should live by analogy with existing code

2. **Which files will be touched?**
   - List exact paths (e.g., `src/planner/dag.ts`, `src/cli/index.ts`)

3. **What patterns should be followed?**
   - Find the closest existing example with `grep` or `find`
   - Note the file path and line range: `src/synth/manifest.ts:45-80`

4. **What interfaces need to be implemented or extended?**
   - Find the interface definition
   - Note the exact signature

```bash
# Find relevant interfaces
grep -r "interface " --include="*.ts" src/
grep -r "class.*implements" --include="*.ts" src/

# Find how similar features are structured
grep -r "export function\|export const" --include="*.ts" src/ | grep -i "plan\|parse\|load"
```

### 1.4 Find test patterns

Identify how tests are written in this repo:
- Test file naming convention (`.spec.ts`, `.test.ts`)
- Test helpers and fixtures used
- How mock dependencies are structured
- Example of a well-written test to reference in sub-task descriptions

```bash
# Find test files
find . -name "*.spec.ts" -o -name "*.test.ts" | grep -v node_modules | head -20

# Find test helpers
find . -path "*/__mocks__/*" -o -path "*/fixtures/*" | grep -v node_modules | head -10
```

---

## §2 — Coverage and Gap Analysis

Goal: cross-reference every AC from the story with the implementation paths found in §1.
Flag anything that has no clear path — these become spike candidates or questions to the team.

### 2.1 Build the FR → AC → module map

Create a mental (or explicit) table:

| FR | ACs it covers | Module/files | Implementation path clear? |
|----|--------------|--------------|---------------------------|
| FR-1 | AC-1, AC-6 | `src/cli/index.ts` | ✅ |
| FR-4 | AC-7 | `src/planner/` | ⚠️ no existing similar code |
| FR-9 | AC-8 | `src/planner/dag.ts` | ✅ verbatim copy |

### 2.2 Flag gaps and spikes

For each ⚠️ or ❓:
- **Ambiguous implementation** → ask the user or propose two options (→ Architecture Design, HITL)
- **No existing module** → note it; the sub-task description must explain the approach from scratch
- **External dependency unknown** → create a spike sub-task to investigate

### 2.3 Detect conflicts with existing code

Check if the story's implementation will:
- Break existing interfaces (check all callers with `grep`)
- Require changes to shared modules that other code depends on
- Introduce circular dependencies between packages

```bash
# Find all usages of a function/type before changing it
grep -r "FunctionName\|TypeName" --include="*.ts" src/ | grep -v "\.spec\.ts"
```

Flag conflicts for the Architecture Design sub-task (HITL) if a breaking change is needed.

### 2.4 Identify test infrastructure gaps

Check whether the test infrastructure supports the new sub-tasks:
- Are fixtures/mocks available for the data structures involved?
- Does the test framework support the assertion style needed?
- Will integration tests need a test harness that doesn't exist yet?

If infrastructure is missing, add a sub-task to create it (type: Development or Automation).
