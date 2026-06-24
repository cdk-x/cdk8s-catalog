---
name: user-story
description: >
  Create Jira issues for each user story extracted from a PRD, setting the
  correct issue type (Epic, Story) and custom fields (Size, Story Points) on
  the Jira project. Creates Epic issues as parents for large stories, with child
  Stories linked to their Epic. Business Value and Risk are left unset for the
  refinement session. Use this skill whenever the user wants to create user
  stories from a PRD, generate backlog items from a spec, break a product
  document into Jira tickets, populate the product backlog, or create user story
  issues on a Jira project. Trigger on "create user stories", "user stories from
  PRD", "user story", "generate backlog items", "create Jira tickets from PRD",
  or any variation of turning a product requirements document into structured
  Jira user stories.
---

# User Story

Reads a PRD and creates one **Jira issue** per user story with the correct **issue type**
(Epic or Story) and **custom fields** set (Size, Story Points). Stories that are too large
to complete in one sprint become Epics — parent issues with child Stories linked to them.

Issue types used by this skill: `Epic` and `Story`.

> **Jira model:** Issues are created directly in the Jira project via the Atlassian MCP.
> Resolve the project key from `AGENTS.md` / `CLAUDE.md`. Business Value and Risk fields
> are intentionally left unset at creation — they are determined during the refinement session.

Read `references/jira.md` for the exact MCP calls used in each step.

---

## Step 0 — Find the PRD and resolve the Jira project

**PRD source** — check the context for a clear signal:
- Confluence URL or page title → fetch via `mcp__atlassian__getConfluencePage` (see `references/jira.md`)
- PRD content already in the conversation → use it directly

If the source is unclear, ask once: *"Where is the PRD — a Confluence page or is it already in our conversation?"*

**Jira project** — before creating any issues:
1. Check `AGENTS.md` and `CLAUDE.md` for keys like `Jira Project`, `Jira Project Key`
2. If found, use it directly
3. If not found, call `mcp__atlassian__getVisibleJiraProjects` to list available projects
   and ask: *"Which Jira project should these stories go into?"*

Once the project key is known, fetch the issue type metadata once to discover the custom
field IDs for Size, Story Points, and the Epic link field (see `references/jira.md`).

---

## Step 1 — Extract user stories

Read the PRD carefully and pull out:

- **User stories** — items in "As a / I want / so that" format, or anything describing user-facing value
- **Context and motivation** — the problem each story solves
- **Acceptance criteria** — per-story test conditions, if present
- **Success criteria** — measurable outcomes that apply across multiple stories

If the PRD has functional requirements but no explicit user stories, derive the stories from
the requirements — each functional requirement maps to one or more user-facing outcomes.

---

## Step 2 — Assess size and propose estimates

For each story, ask: *can one developer complete this within a single sprint?*

**Size scale** (use this to assess each story):

| Size | Effort | Story Points |
|------|--------|--------------|
| XXS  | < 1 hour | 1 |
| XS   | few hours | 2 |
| S    | half–1 day | 3 |
| M    | 2–3 days | 5 |
| L    | 4–5 days (full sprint — flag for splitting) | 8 |
| XL   | multi-sprint → **create as Epic** | 13 |
| XXL  | large multi-sprint feature → **create as Epic** | 21 |

- **S / M / L** → standalone `Story`; propose Size and Story Points
- **XL / XXL** → **Epic**: decompose into 2–5 smaller child Stories (each S/M/L)

When in doubt about XL vs Epic, lean toward Epic — easier to collapse during refinement.

> Business Value and Risk are not set here — they are determined during the refinement session.

---

## Step 3 — Compose item titles and show the proposed breakdown for review

The **issue summary** (title) is a short, scannable noun phrase naming the feature or
capability. The "As a / I want / so that" sentence goes in the **issue description**, not
the summary.

Good summary examples:
- `Provider lifecycle hooks (preSynthesize / postSynthesize)`
- `Synthesis error reporting via Annotations`
- `Generate Ansible YAML files during synthesis`

Before creating anything, present the full proposed structure:

```
Epic: <short descriptive title>
  US-1: <short title>  [Size: M | SP: 5]
  US-2: <short title>  [Size: S | SP: 3]

Standalone stories:
  US-3: <short title>  [Size: S | SP: 3]
  US-4: <short title>  [Size: L | SP: 8 — consider splitting in refinement]
```

Ask the user:
- Does the granularity feel right?
- Are any stories missing or should be merged?
- Should any `L` stories be split now or left for refinement?
- Are the Size and Story Points estimates reasonable?

Iterate until the user approves.

---

## Step 4 — Create the Jira issues and set fields

Read `references/jira.md` for the exact MCP calls. Follow this order:

1. **Discover field IDs** — call `mcp__atlassian__getJiraIssueTypeMetaWithFields` for `Story`
   to get the IDs for Size, Story Points, and the Epic link field. Record them — reuse for
   every issue created.
2. **Create Epics first** — `mcp__atlassian__createJiraIssue` with `issueType: "Epic"` and the
   short summary. Then set Size and Story Points via `mcp__atlassian__editJiraIssue`.
3. **Create each Story** — `mcp__atlassian__createJiraIssue` with `issueType: "Story"`, the
   short summary, and the Epic link field set to the parent Epic key.
   Fill the description using the template in `assets/user-story-template.md`.
   Then set Size and Story Points via `mcp__atlassian__editJiraIssue`.
4. **Link child stories to their Epic** — set via the `parent` field during creation (step 3).
   List the child Story keys in the Epic description after they are created.
5. **Link issues with blocking dependencies** — if any stories must be completed before others,
   use `mcp__atlassian__createIssueLink` with type `Blocks` (see `references/jira.md`).
6. **Link each story to the source PRD** — include the Confluence page URL in each issue
   description. Also add the page as a native Confluence link in Jira's Links section
   (see `references/jira.md` — the remote link API section).

Do NOT modify the source PRD.

---

## Step 5 — Report

List everything created:

```
Epics:
  PROJ-5  — <Epic title>  [Size: XL | SP: 13]  →  <url>

Stories (under PROJ-5):
  PROJ-10 — <short title>  [Size: M | SP: 5]  →  <url>
  PROJ-11 — <short title>  [Size: S | SP: 3]  →  <url>

Standalone stories:
  PROJ-12 — <short title>  [Size: S | SP: 3]  →  <url>
```

Then add these two reminders:

1. **Business Value and Risk** will be set during the refinement session.
2. **PRD link**: the Confluence page URL is in each issue description as plain text.
   Add it as a native Confluence page link manually in each issue:
   **Issue → Link → Confluence Page** → paste the PRD URL.
