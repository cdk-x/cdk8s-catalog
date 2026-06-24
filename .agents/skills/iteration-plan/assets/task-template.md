# Sub-task Description Template

Use this template for every sub-task created in Step 7.
The description must be **self-contained**: a developer or AFK agent reads only this
sub-task to implement it — no additional context required.

Fill every section. Remove a section only if it genuinely does not apply
(e.g., no new types introduced → omit Data Model).

---

## Context

_Why this sub-task exists. Which story it belongs to. Which FRs and ACs it covers.
How it fits into the overall story implementation (e.g., "this is the data loading
layer; the DAG construction sub-task builds on top of it")._

Story: <STORY-KEY> — <story title>
FRs covered: FR-N, FR-M
ACs covered: AC-N, AC-M

---

## Architecture

_Key design decisions within this sub-task's scope:_
- _Why this class structure was chosen (e.g., "stateless service → static methods")_
- _Which pattern was applied and why (Service, Factory, etc.)_
- _Any deviation from workspace conventions with justification_

---

## Data Model

_All types and interfaces introduced by this sub-task. Complete definitions — no stubs,
no placeholders. Omit if no new types are introduced._

```typescript
// Example
export interface ManifestEntry {
  id: string;
  dependsOn: string[];
}
```

---

## Interface Contracts

_Full class signatures: constructor, all public methods with typed params and return types,
significant private fields. Dependent sub-tasks rely on this contract — no deviation allowed._

_If stateless (pure computation, no injected state): expose static methods._
_If stateful (holds data, injected dependencies): use instance methods with constructor injection._

```typescript
// Example (adapt to the project's language)
export class CrnParser {
  static parse(raw: string): ParsedCrn { ... }
}

// or, if stateful:
export class CliProgram {
  constructor(private readonly version: string) {}
  build(): Command { ... }
}
```

_Remove this section if no interface is defined or implemented._

---

## Files to touch

_List every file that will be created or modified. For each, describe what changes._

- `path/to/file.ts` — create; implements `<ClassName>`
- `path/to/other.ts` — modify; add `<methodName>` method
- `path/to/file.spec.ts` — create; co-located tests

---

## Pattern to follow

_Reference to existing code in this repo that follows the same pattern.
Include file path and line range so the implementer can read it directly._

See `path/to/existing_example.ts:45-80` for how similar functionality is structured.
Specifically: <what aspect of the pattern to follow>.

---

## Phases

_Ordered, atomic implementation steps. Each step is independently testable.
Later steps build on earlier ones. No vague "what to implement" paragraphs._

- **Phase 1**: <thin vertical slice — minimal end-to-end path>
- **Phase 2**: <happy-path expansion>
- **Phase N**: <edge cases, error handling>

---

## Assumptions

_Unknowns you couldn't resolve, stated as explicit assumptions. Remove if there are none._

---

## Project Rules Check

_Explicit compliance verification with the project constitution (CLAUDE.md)._

| Convention | Compliant? | Notes |
|---|---|---|
| OOP-only — all logic in classes, no standalone functions | ✅/❌ | |
| Strict TypeScript — no `any`, explicit return types | ✅/❌ | |
| Co-located specs — `class.spec.ts` next to `class.ts` | ✅/❌ | |
| Stateless classes use static methods (Service pattern) | ✅/❌ | |
| Module system — imports match `tsconfig.app.json` `module` field | ✅/❌ | |

_Add or remove rows to match the conventions in this project's CLAUDE.md._

---

## Acceptance criteria covered

_Copy the exact AC text from the story so the implementer has it without switching contexts._

- AC-N: Given …, when …, then …
- AC-M: Given …, when …, then …

---

## Mode: AFK | HITL

_State the mode. If HITL, explain what human decision or review is required and at what point._

**AFK** — implementation can proceed autonomously given this description.

_— or —_

**HITL** — human review required: <what decision or approval is needed before/during/after>.

---

## Estimate: Xh

_Ideal hours. Target: 4–8h. If outside this range, note why._

---

_Implement using the `/tdd` skill._
