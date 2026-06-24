---
name: refine-story
description: >
  Run a full refinement session on a user story in Jira. Moves the story to
  "In Refinement", performs a hybrid analysis of Functional and Non-Functional
  Requirements (auto-extraction then targeted questions for gaps), enriches
  existing acceptance criteria (Given/When/Then), sets Risk, Story Points,
  Business Value, and Size fields, checks Definition of Ready compliance, and
  transitions to "Ready for Implementation" when all criteria are met. Trigger
  when the user says "/refine-story", "/refine-story <issue-key>", "refine story
  PROJ-42", "run refinement", "let's refine", "refine this story", "start
  refinement session", or any variation of refining a user story. When an issue
  key is provided directly (e.g. "/refine-story CDKX-10"), use it immediately as
  the target story — skip the listing step in Step 0.
---

# /refine-story — Story Refinement

Lead a full refinement session for a Jira Story. Analyzes Functional and Non-Functional
Requirements, enriches existing acceptance criteria, sets Risk, Story Points, Business
Value, and Size fields, and transitions the story through the refinement workflow.

> **Jira model:** Stories are Jira issues of type `Story` in the configured project.
> Use the Atlassian MCP for all operations. Resolve the project key from `AGENTS.md` /
> `CLAUDE.md`. Read `references/jira.md` for all MCP calls used in this skill.

**Workflow transitions handled by this skill:**

```
[Backlog | Ready for Refinement]
        ↓  (skill starts)
    In Refinement
        ↓  (DoR ✅ + user approves)
Ready for Implementation
```

> Moving a story to "Ready for Refinement" is a PO decision (manual). This skill picks up from there.

---

## Step 0 — Find the story to refine

If an issue key was passed directly (e.g. `/refine-story CDKX-10`), use it immediately —
skip listing and go straight to the status check below.

If no key was specified, search for stories awaiting refinement (see `references/jira.md`):

```
mcp__atlassian__searchJiraIssuesUsingJql {
  jql: "project = <key> AND issuetype = Story AND status = \"Ready for Refinement\" ORDER BY created ASC"
}
```

Show the list to the user and ask which story to refine.

Resolve the Jira project key before continuing: check `AGENTS.md` / `CLAUDE.md` for
`Jira Project` or `Jira Project Key`; if not found, ask once.

**Status gate — check before proceeding:**

Fetch the current status of the story. If the status is not `Ready for Refinement`
(e.g. it is still in `Backlog` or `Analysis`), stop and inform the user:

> _"Story <key> is in **<current status>**. Moving a story to Ready for Refinement is a
> manual step — the Product Owner must promote it before the refinement session can begin.
> No changes have been made."_

Only continue if the status is `Ready for Refinement` (or if the user explicitly overrides).

---

## Step 1 — Move to "In Refinement"

Get the available transitions for the story (see `references/jira.md`). Find the transition
whose name matches "In Refinement" (or equivalent) and apply it:

```
mcp__atlassian__transitionJiraIssue { issueKey, transitionId }
```

Confirm to the user: _"Story <key> is now In Refinement."_

---

## Step 2 — Fetch the story and its full context

Fetch the full story via `mcp__atlassian__getJiraIssue` (see `references/jira.md`).

From the response:
1. **Read the description** — it may contain prior refinement notes. Extract any relevant
   context before analysing.
2. **Find the PRD link** — search the description for a Confluence page URL. If found,
   fetch that page for additional context using `mcp__atlassian__getConfluencePage`.
3. **Find the parent Epic** — check the `parent` field. If present, fetch the Epic with
   `mcp__atlassian__getJiraIssue` and extract its description to find **Success Criteria**
   (SC). The ACs written for this story must collectively contribute to satisfying those SCs.

4. **Read linked issues** — check `fields.issuelinks` in the story response.
   For every link whose type name is `"is blocked by"` (inward link):
   a. Fetch that story via `mcp__atlassian__getJiraIssue`.
   b. Extract its Functional Requirements, ACs, and any relevant context from
      its description.
   c. Use this context during FR extraction (Step 3) and AC enrichment (Step 6):
      avoid duplicating behaviour already provided by the blocking story, and
      reference the interfaces or outputs it produces.
   Links of type `"blocks"` (outward) do not require fetching.

Note: the story already has acceptance criteria from `/user-story` — treat them as a first
draft, not final. Do not discard them; enrich them.

---

## Step 3 — Auto-extract Functional Requirements

From the story description, PRD (if available), and Epic context, extract:

- A numbered list of **Functional Requirements** — what the system must do, from the user's perspective
- The actors involved
- The main flows and sub-flows

For each FR, assess clarity:

```
FR-1: <description>   ✅ clear
FR-2: <description>   ⚠️  ambiguous — missing error condition
FR-3: <description>   ❓ gap — no existing AC covers this
```

---

## Step 4 — Auto-extract Non-Functional Requirements

Identify NFRs applicable to this story from the description, PRD, and Epic. Use these categories:

> Performance · Security · Usability · Scalability · Accessibility · Maintainability · Legal/Compliance · Cost · Cultural

For each NFR:
- Does it have a **measurable threshold** (e.g., "< 200ms", "> 99.9% uptime")? → ✅ can generate AC
- No threshold → ⚠️ ask the team

**Check the Definition of Done** (see `references/jira.md` — search for the DoD Confluence
page). NFRs already covered globally in the DoD do **not** need individual ACs on this story
— mark them as `→ Covered by DoD ✅`.

If no DoD page exists, note it: _"No Definition of Done found. Run `/definition-of-done` to set one up."_

---

## Step 5 — Targeted questions (gaps only)

Ask the user only about:

- FRs marked ⚠️ ambiguous or ❓ gap
- NFRs without a measurable threshold
- Edge cases or error scenarios identified but not yet covered by any AC
- NFRs that appear in every story → suggest adding them to the DoD: _"This NFR appears
  omnipresent — consider adding it to the Definition of Done via `/definition-of-done`
  rather than repeating it here."_

Limit to **5 questions per round**. If more gaps remain, address them in a second pass.

---

## Step 6 — Enrich the Acceptance Criteria

Do not discard existing ACs from `/user-story`. Review each one and:

- Keep complete, unambiguous ACs as-is
- Rewrite ambiguous ACs with clearer Given/When/Then conditions
- Add new ACs for FRs with no current coverage, NFRs without DoD coverage, error scenarios
- Skip ACs for NFRs covered by the DoD — reference the DoD instead

Format: `- [ ] Given [precondition], when [action], then [expected result].`

If the story has a parent Epic, verify that the ACs collectively satisfy the Epic's Success
Criteria. Note any SC not yet covered.

---

## Step 7 — Set all Jira fields

All four fields must be defined before the story can be considered ready. Propose each with
a brief justification; the user may adjust any of them.

**Business Value** (`customfield_10098`) — number **1–50**:
- Check if already set. Propose a value with justification.
- 1–10: low impact (minor UX polish, internal tooling with no user-facing effect)
- 11–25: medium impact (useful feature, moderate adoption or retention effect)
- 26–40: high impact (foundational feature, strong adoption driver or revenue-related)
- 41–50: critical impact (blocking adoption, compliance requirement, or major revenue risk)
- For foundational stories in early development whose absence blocks the whole product,
  set high values (30–45).

**Risk** (`customfield_10131`) — select one of: `1` / `5` / `10` based on:
- External dependencies or integrations
- Technical uncertainty or unknowns
- Business impact if it fails or ships late
- Technical debt or legacy code involved

**Story Points** (`customfield_10041`) — Fibonacci number:
- Check if already set from `/user-story`. After completing FR extraction (Step 3),
  re-estimate SP independently based on the enriched FR list.
- If the re-estimate differs from the stored value by more than one Fibonacci step
  (e.g. stored=2, re-estimate=5), flag explicitly:
  _"The original SP estimate was N but the enriched FRs suggest M. Please confirm
  before closing the session."_
- 1–2: well-understood, minimal complexity
- 3: straightforward with some unknowns
- 5: moderate complexity, some risk
- 8: significant complexity or uncertainty
- 13: very large — flag for splitting before moving to implementation

If Story Points = 13, flag: _"This story may be too large for one sprint. Consider splitting."_

**Size** (`customfield_10100`) — select one of: `XXS` / `XS` / `S` / `M` / `L` / `XL` / `XXL`
- Set by `/user-story` at creation. Confirm it still reflects current scope, or update.

**Order Rank** (computed — do not ask the user):
After BV, Risk, and SP are confirmed, compute:

```
Order Rank = (Business Value + Risk) / Story_Points
```

Higher rank = higher priority in the backlog. Starting point only; dependencies override rank.
Stored in `customfield_10264` (number).

Example: BV=30, Risk=5, SP=3 → (30+5)/3 = 11.67

**Priority** (derived from Order Rank — Jira built-in field):

| Order Rank | Priority |
|------------|----------|
| ≥ 14       | Highest  |
| 12–13.9    | High     |
| 10–11.9    | Medium   |
| 8–9.9      | Low      |
| < 8        | Lowest   |

Thresholds calibrated for early-stage backlogs (typical scores 7–20). Revisit when the
backlog grows beyond ~20 stories.
Stored as `{"name": "High"}` (etc.) in the `priority` field.

---

## Step 8 — DoR compliance check

Look for the DoR Confluence page (see `references/jira.md`). Use its criteria if found;
otherwise apply the four Scrum minimums.

Check each criterion and mark ✅ or ❌:

1. **Small** — completable by one developer in one sprint? (Story Points ≤ 8; flag if 13)
2. **Sized** — has a Story Points value set?
3. **Just Enough Detail** — every FR has at least one AC?
4. **Understood** — ask the user explicitly: _"Does the team have enough shared understanding to start implementation?"_
5. **All fields set** — Business Value, Risk, Story Points, and Size must all have a value.
6. Any additional team-specific criteria from the DoR page.

---

## Step 9 — Show the full refinement proposal for review

Present the complete summary and wait for the user's approval:

```markdown
## Refinement Summary — <key>: <title>

### Functional Requirements
- FR-1: <description> ✅
- FR-2: <description> ✅

### Non-Functional Requirements
- NFR-1: [Performance] Response < 200ms → AC added
- NFR-2: [Security] Passwords encrypted at rest → Covered by DoD ✅

### Acceptance Criteria
- [x] Given <existing AC> (unchanged)
- [ ] Given <enriched/new AC>
- [ ] Given <error scenario AC>

### Epic Success Criteria
- SC-1: "<SC text>" → covered by AC-2, AC-3 ✅

### Risk: 5 | SP: 3 | BV: 30 | Size: S | Order Rank: 11.67 | Priority: Medium

### DoR Check
✅ Small  ✅ Sized  ✅ Detail  ✅ Understood  ✅ All fields set
→ Ready for Implementation ✅
```

Iterate based on user feedback. Return to any earlier step if changes are needed.

---

## Step 10 — Update the Jira issue

Once the user approves, update the story (see `references/jira.md`):

1. **Rewrite the description** using `assets/refined-story-template.md` — fill in User Story
   sentence (original), FRs, NFRs, enriched ACs, and Epic SC coverage. Use
   `mcp__atlassian__editJiraIssue` with the `description` field.

2. **Add a refinement session comment** via `mcp__atlassian__addCommentToJiraIssue`.
   Decisions and context only — do NOT include Risk, Story Points, Business Value, or Size
   (those are set as fields, not comment content):

   ```
   ## Refinement Session — <date>

   **Functional Requirements identified**: FR-1, FR-2, ...
   **Non-Functional Requirements**: <description, or "None story-specific">

   **Decisions**: <key decisions made during the session>
   **Open questions**: <unresolved questions, or "None">
   ```

3. **Ask the user**: _"Do you want to add any notes from the team's discussion to this
   comment before closing the session?"_ — incorporate their input.

---

## Step 11 — Set fields and transition

Set all six fields via `mcp__atlassian__editJiraIssue` (see `references/jira.md`):
**Business Value**, **Risk**, **Story Points**, **Size** (update only if changed),
**Order Rank** (`customfield_10264`), and **Priority** (`priority` field, e.g. `{"name": "High"}`).

**If DoR ✅ (all criteria met):**
- Get available transitions and apply the "Ready for Implementation" one via
  `mcp__atlassian__transitionJiraIssue`.
- Tell the user: _"Story <key> is Ready for Implementation and will be available for Sprint Planning."_

**If DoR ❌ (one or more criteria unmet):**
- Leave the story in `In Refinement`.
- Add a comment listing the unmet criteria and what is needed to resolve them.
- Tell the user: _"Story <key> remains In Refinement. Unmet criteria: [list]."_

---

## Rules

- Never delete existing acceptance criteria — enrich or rewrite, but preserve intent.
- Do not transition to "Ready for Implementation" without explicit user approval in Step 9.
- NFRs already in the DoD page never get individual ACs — only a DoD reference.
- If Story Points = 13, always flag the risk of splitting before proceeding.
- "Ready for Refinement → In Refinement" is triggered by running this skill. Moving to
  "Ready for Refinement" is a manual PO action — this skill does not touch that transition.
- If the DoD or DoR pages do not exist, note their absence and suggest the corresponding
  skills, but do not block the refinement session.
- Keep the session focused: ask a maximum of 5 questions per round in Step 5.
