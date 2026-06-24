---
name: analyze
description: Run a consistency analysis across a spec (GitHub issue or Confluence PRD page) and its technical plan. Detects duplication, ambiguity, underspecification, constitution violations, coverage gaps, and inconsistencies — then posts the findings back to the source. Acts as a quality gate before running /prd-to-issues. Trigger when the user says "/analyze", "analyze issue #N", "analyze this PRD", "check spec and plan", "review consistency", "validate artifacts", or wants to cross-check spec and plan before breaking into issues.
---

# /analyze — Consistency Analysis

Cross-check a spec and its technical plan for quality issues, then post the findings back to the same platform. Acts as a quality gate before running `/prd-to-issues`.

## Step 0 — Determine the source

Check the context for a clear signal:
- User mentioned "issue", "GitHub", or a bare number → use GitHub
- User mentioned "Confluence", "page", "PRD page", or a URL → use Confluence

If there is no clear signal, ask: *"Is the spec in a GitHub issue or a Confluence page?"*

Read the corresponding reference file so you have the fetch and publish details ready:
- GitHub → `references/github.md`
- Confluence → `references/confluence.md`

---

## Step 1 — Fetch the spec and plan

Follow the instructions in the reference file to retrieve both artifacts. If the plan is missing, stop and ask the user to run `/plan` first.

---

## Step 2 — Load the constitution

Read `CLAUDE.md` to load the project rules used in Pass D (constitution alignment). If no `CLAUDE.md` exists, skip Pass D and note its absence in the report.

---

## Step 3 — Run 6 detection passes

Cap findings at 50 total across all passes. For each finding, record its ID, category, severity, location, a one-line summary, and a concrete recommendation.

**A. Duplication** — Requirements or user stories that say the same thing in different words. Mark the lower-quality phrasing as the duplicate.

**B. Ambiguity** — Vague adjectives without measurable criteria ("fast", "scalable", "secure", "easy to use"). Unresolved placeholders (`TODO`, `TBD`, `???`, `[NEEDS CLARIFICATION]`).

**C. Underspecification** — Requirements with a missing object or outcome. Success criteria without a measurable threshold. User stories with no acceptance criteria alignment.

**D. Constitution alignment** — Plan decisions that conflict with `CLAUDE.md` MUST rules. Constitution violations are always CRITICAL — no exceptions.

**E. Coverage gaps** — Functional requirements from the spec with no corresponding plan phase; plan phases that address no spec requirement; non-functional requirements absent from the plan.

**F. Inconsistencies** — Terminology drift (same concept named differently across spec and plan). Entities referenced in the plan but absent from the spec. Conflicting requirements.

---

## Step 4 — Assign severity

- **CRITICAL**: Constitution violation, missing core artifact, requirement with zero coverage that blocks baseline functionality
- **HIGH**: Duplicate or conflicting requirement, ambiguous security/performance criterion, untestable acceptance criterion
- **MEDIUM**: Terminology drift, missing non-functional task coverage, underspecified edge case
- **LOW**: Wording improvements, minor redundancy

---

## Step 5 — Show the report for review

Show the full analysis to the user. Do NOT publish yet.

Use this template:

```markdown
## 🔍 Consistency Analysis

### Findings

| ID | Category | Severity | Location | Summary | Recommendation |
|----|----------|----------|----------|---------|----------------|
| A1 | Duplication | MEDIUM | REQ-3, REQ-7 | Both state the same upload constraint | Remove REQ-7, merge into REQ-3 |
| D1 | Constitution | CRITICAL | Plan › Modules | Proposes standalone `export function` | Wrap in a static class method |

### Coverage Summary

| Requirement | Has Plan Phase? | Phase | Notes |
|-------------|----------------|-------|-------|
| REQ-1 | ✅ | Phase 1 | |
| REQ-4 | ❌ | — | No phase maps to this requirement |

### Metrics
- Total functional requirements: N
- Requirements with plan coverage: N (N%)
- Critical issues: N
- High issues: N
- Medium issues: N
- Low issues: N

### Verdict
> ✅ Ready for `/prd-to-issues` — no critical issues found.
>
> — or —
>
> ❌ Not ready — N critical issue(s) must be resolved first. Re-run `/plan` to address D1.
```

---

## Step 6 — Iterate

Incorporate feedback (back to Step 3) until the user approves. If the user wants to fix a finding first, help them update the relevant artifact, then re-run the affected detection passes.

---

## Step 7 — Publish

Follow the publish instructions in the reference file for the chosen platform.

---

## Step 8 — Report

Tell the user where the analysis was posted. If no critical issues were found, confirm they can proceed with `/prd-to-issues`. If critical issues exist, explicitly recommend resolving them first and suggest which skill to re-run (`/prd` or `/plan`).

---

## Rules

- This skill is **read-only with respect to GitHub and Confluence** until the user approves.
- Do not suggest rewriting the spec or plan inline — only report findings and recommendations.
- If the user asks to fix a finding, help them update the relevant artifact first, then re-run the affected passes.
- Constitution violations (`CLAUDE.md` MUST rules) are always CRITICAL — no exceptions.
- Do not invent issues — only report what is verifiably present in the artifacts.
