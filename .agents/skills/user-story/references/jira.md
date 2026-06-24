# Jira — Create Epic and Story issues

---

## Resolving the Jira project

### 1. Check configuration first

Look in `AGENTS.md` and `CLAUDE.md` for keys like:
- `Jira Project` or `Jira Project Key` → project key (e.g. `PROJ`)

### 2. If not configured — list available projects

```
mcp__atlassian__getVisibleJiraProjects {}
```

Show the list to the user and ask which project to use.

---

## Fetching the PRD from Confluence

If the PRD is a Confluence page, resolve the page ID from the URL (numeric segment after `/pages/`):

```
https://your-org.atlassian.net/wiki/spaces/SPACE/pages/123456789/Page+Title
                                                         ^^^^^^^^^
```

If you only have a title, search for it:

```
mcp__atlassian__searchConfluenceUsingCql {
  cql: "title = \"<page title>\" AND type = page"
}
```

Then fetch the page content:

```
mcp__atlassian__getConfluencePage { pageId: "<id>" }
```

---

## Discovering custom field IDs

Fetch once per session for the `Story` issue type. Record all field IDs — reuse for every issue.

```
mcp__atlassian__getJiraIssueTypeMetaWithFields {
  projectKey: "<key>",
  issueTypeName: "Story"
}
```

Look for fields matching these names (field IDs vary by Jira instance):

| Field name | Type | Notes |
|------------|------|-------|
| `Story Points` | number | May also appear as `story_points` or `customfield_10016` |
| `Size` | single select | Options: XXS, XS, S, M, L, XL, XXL |
| `Business Value` | number | Free number field |
| `Risk` | single select | Options: 1, 5, 10 |

Also look for the Epic link field — it links a Story to its parent Epic:
- Team-managed projects: `parent`
- Classic projects: often `customfield_10014` (name contains "Epic")

Record every field ID you find — you will use them in `editJiraIssue` calls after creation.

---

## Creating an Epic

```
mcp__atlassian__createJiraIssue {
  projectKey: "<key>",
  issueType: "Epic",
  summary: "<short descriptive title>",
  description: {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "PRD: <source PRD URL or Confluence page URL>\n\n" },
          { "type": "text", "text": "<brief feature area description and user problem>\n\n" },
          { "type": "text", "text": "Child stories:\n- <will be filled in after creating stories>" }
        ]
      }
    ]
  }
}
```

Record the returned Epic key (e.g. `PROJ-5`).

---

## Setting Size and Story Points on an Epic

After creation, set the custom fields:

```
mcp__atlassian__editJiraIssue {
  issueKey: "<epic-key>",
  fields: {
    "<size-field-id>": { "value": "<XXS|XS|S|M|L|XL|XXL>" },
    "<story-points-field-id>": <number>
  }
}
```

---

## Creating a Story

```
mcp__atlassian__createJiraIssue {
  projectKey: "<key>",
  issueType: "Story",
  summary: "<short descriptive title>",
  description: {
    "type": "doc",
    "version": 1,
    "content": [
      {
        "type": "paragraph",
        "content": [
          { "type": "text", "text": "As a <actor>, I want <feature>, so that <benefit>.\n\n" },
          { "type": "text", "text": "Context\n<why this story matters — user problem it addresses>\n\n" },
          { "type": "text", "text": "Acceptance Criteria\n- Given <precondition>, when <action>, then <result>.\n\n" },
          { "type": "text", "text": "PRD: <source PRD URL or Confluence page URL>" }
        ]
      }
    ]
  },
  "parent": { "key": "<epic-key>" }
}
```

> **Summary rule**: the `summary` field is what appears on the board — it must be a short noun
> phrase (e.g. `Plan command CLI entry point`). Never start it with "As a…". The user story
> sentence belongs in the description body.

Record the returned Story key (e.g. `PROJ-10`).

---

## Setting Size and Story Points on a Story

```
mcp__atlassian__editJiraIssue {
  issueKey: "<story-key>",
  fields: {
    "<size-field-id>": { "value": "<XXS|XS|S|M|L|XL|XXL>" },
    "<story-points-field-id>": <number>
  }
}
```

---

## Size → Story Points default mapping

Use this as the default suggestion; the user can override in Step 3.

| Size | Story Points |
|------|--------------|
| XXS  | 1 |
| XS   | 2 |
| S    | 3 |
| M    | 5 |
| L    | 8 |
| XL   | 13 |
| XXL  | 21 |

---

## Linking issues (Jira native links)

Use `mcp__atlassian__createIssueLink` for any issue-to-issue relationships beyond the
Epic→Story parent hierarchy (which is already set via the `parent` field at creation time).

### Get available link types first

```
mcp__atlassian__getIssueLinkTypes { cloudId: "<cloudId>" }
```

Look for equivalents of `Blocks` / `is blocked by` and `Relates` / `relates to`.

### Example — blocking dependency between stories

```
mcp__atlassian__createIssueLink {
  cloudId: "<cloudId>",
  type: "Blocks",
  inwardIssue: "<blocker-key>",
  outwardIssue: "<blocked-key>"
}
```

### Example — soft relationship

```
mcp__atlassian__createIssueLink {
  cloudId: "<cloudId>",
  type: "Relates",
  inwardIssue: "<key-A>",
  outwardIssue: "<key-B>"
}
```

---

## Linking to the source PRD (Confluence page)

Always include the PRD Confluence page URL as plain text in every issue description
(see templates above). This ensures developers can always trace back to the requirements.

The Atlassian MCP does not currently expose the remote link endpoint needed to add a
native Confluence page link programmatically. At the end of the skill execution, remind
the user to add it manually in each issue:
**Issue → Link → Confluence Page** → paste the PRD URL.

---

## Fields left for refinement

Do **not** set these at creation time — they are determined during the refinement session:

- `Business Value` — number
- `Risk` — single select (1, 5, 10)

---

## Reporting format

```
Epics:
  PROJ-5  — <Epic title>  [Size: XL | SP: 13]  →  <url>

Stories (under PROJ-5):
  PROJ-10 — <short title>  [Size: M | SP: 5]  →  <url>
  PROJ-11 — <short title>  [Size: S | SP: 3]  →  <url>

Standalone stories:
  PROJ-12 — <short title>  [Size: S | SP: 3]  →  <url>
```
