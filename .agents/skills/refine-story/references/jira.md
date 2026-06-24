# Jira — Refine Story

---

## Resolving the Jira project

Check `AGENTS.md` / `CLAUDE.md` for `Jira Project` or `Jira Project Key`.
If not found, call `mcp__atlassian__getVisibleJiraProjects` and ask the user.

---

## Finding stories ready for refinement

```
mcp__atlassian__searchJiraIssuesUsingJql {
  cloudId: "<cloudId>",
  jql: "project = <key> AND issuetype = Story AND status = \"Ready for Refinement\" ORDER BY created ASC",
  fields: ["summary", "status", "key", "parent"]
}
```

Adjust the status name if the project uses a different label (e.g. `Refinement`, `To Refine`).

---

## Fetching a story's full content

```
mcp__atlassian__getJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<key>"
}
```

Fields to read:
- `fields.summary` — issue title
- `fields.description` — body (contains user story, ACs, PRD link)
- `fields.status.name` — current workflow status
- `fields.parent.key` — parent Epic key (if any)
- `fields.customfield_10041` — Story Points (may already be set)
- `fields.customfield_10100.value` — Size (may already be set)
- `fields.customfield_10098` — Business Value (likely unset)
- `fields.customfield_10131.value` — Risk (likely unset)

---

## Getting and applying workflow transitions

### Fetch available transitions

```
mcp__atlassian__getTransitionsForJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<key>"
}
```

Find the transition IDs for `In Refinement` and `Ready for Implementation`
(names may vary — match by name substring).

### Apply a transition

```
mcp__atlassian__transitionJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<key>",
  transitionId: "<id>"
}
```

---

## Setting fields after refinement

Use a single `editJiraIssue` call to set all four fields at once:

```
mcp__atlassian__editJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<key>",
  fields: {
    "customfield_10098": <business-value-number>,
    "customfield_10131": { "value": "<1|5|10>" },
    "customfield_10041": <story-points-number>,
    "customfield_10100": { "value": "<XXS|XS|S|M|L|XL|XXL>" }
  }
}
```

### Field reference

| Field | customfield | Type | Values |
|-------|-------------|------|--------|
| Story Points | `customfield_10041` | number | Fibonacci: 1,2,3,5,8,13 |
| Business Value | `customfield_10098` | number | free number |
| Size | `customfield_10100` | single select | XXS, XS, S, M, L, XL, XXL |
| Risk | `customfield_10131` | single select | 1, 5, 10 |

---

## Updating the story description

```
mcp__atlassian__editJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<key>",
  contentFormat: "markdown",
  fields: {
    "description": "<full refined body from assets/refined-story-template.md>"
  }
}
```

---

## Adding the refinement session comment

```
mcp__atlassian__addCommentToJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<key>",
  contentFormat: "markdown",
  comment: "## Refinement Session — <date>\n\n**Functional Requirements identified**: FR-1, FR-2, ...\n**Non-Functional Requirements**: <description, or \"None story-specific\">\n\n**Decisions**: <key decisions made during the session>\n**Open questions**: <unresolved questions, or \"None\">"
}
```

---

## Finding the DoD and DoR Confluence pages

Resolve the Confluence space from `AGENTS.md` / `CLAUDE.md`
(`Confluence Space` or `Confluence Space Key`). If not configured, ask the user once.

```
mcp__atlassian__searchConfluenceUsingCql {
  cloudId: "<cloudId>",
  cql: "title = \"Definition of Done\" AND space = \"<KEY>\" AND type = page"
}
```

```
mcp__atlassian__searchConfluenceUsingCql {
  cloudId: "<cloudId>",
  cql: "title = \"Definition of Ready\" AND space = \"<KEY>\" AND type = page"
}
```

Then fetch the page content:

```
mcp__atlassian__getConfluencePage {
  cloudId: "<cloudId>",
  pageId: "<id>",
  contentFormat: "markdown"
}
```

If neither page is found, note the absence and suggest `/definition-of-done` and
`/definition-of-ready` — but do not block the refinement session.

---

## Fetching the parent Epic

```
mcp__atlassian__getJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<epic-key>"
}
```

Read `fields.description` for the Epic's success criteria and child story list.
