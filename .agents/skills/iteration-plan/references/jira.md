# Jira — Iteration Plan

---

## Resolving the Jira project

Check `AGENTS.md` / `CLAUDE.md` for `Jira Project` or `Jira Project Key`.
If not found, call `mcp__atlassian__getVisibleJiraProjects` and ask the user.

---

## Querying available sub-task types

Call this once per session to get the issue types configured for the project,
including sub-task types and their IDs:

```
mcp__atlassian__getJiraProjectIssueTypesMetadata {
  cloudId: "<cloudId>",
  projectKey: "<key>"
}
```

Look for issue types with `subtask: true` or `hierarchyLevel: -1`.
Record each type's `id` and `name` — you will use them when creating sub-tasks.

Expected types in the CDKX project (names may vary — verify at runtime):
- Análisis, Automation, Architecture Design, Development, Documentation,
  Deployment, Design, Management, Support, General

---

## Fetching a story and its full context

```
mcp__atlassian__getJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<story-key>"
}
```

Fields to read:
- `fields.summary` — issue title
- `fields.description` — body (FRs, NFRs, ACs, PRD link)
- `fields.status.name` — must be `Ready for Implementation`
- `fields.parent.key` — parent Epic key
- `fields.customfield_10041` — Story Points
- `fields.customfield_10100.value` — Size

---

## Finding stories in the active sprint

```
mcp__atlassian__searchJiraIssuesUsingJql {
  cloudId: "<cloudId>",
  jql: "project = <KEY> AND sprint in openSprints() AND issuetype = Story ORDER BY priority ASC",
  fields: ["summary", "status", "key", "parent", "customfield_10041", "customfield_10100"]
}
```

---

## Creating a sub-task

```
mcp__atlassian__createJiraIssue {
  cloudId: "<cloudId>",
  projectKey: "<key>",
  issueType: "<sub-task-type-name>",   ← use type name from getJiraProjectIssueTypesMetadata
  summary: "<short noun-phrase title>",
  description: "<full self-contained body from task-template.md>",
  parent: { "key": "<story-key>" },
  contentFormat: "markdown"
}
```

> **Summary rule**: must be a short noun phrase (e.g. `DAG construction and topological sort`).
> Never start with "As a…" — the user story sentence belongs in the description body.

Record each created sub-task key for use in issue link creation.

---

## Creating Blocks links between sub-tasks

First, verify the available link types:

```
mcp__atlassian__getIssueLinkTypes {
  cloudId: "<cloudId>"
}
```

Find the type named `Blocks` (or equivalent). Then create the link:

```
mcp__atlassian__createIssueLink {
  cloudId: "<cloudId>",
  type: "Blocks",
  inwardIssue: "<blocker-subtask-key>",
  outwardIssue: "<blocked-subtask-key>"
}
```

Meaning: `inwardIssue` blocks `outwardIssue` — `outwardIssue` cannot start until
`inwardIssue` is complete.

---

## Fetching the parent Epic

```
mcp__atlassian__getJiraIssue {
  cloudId: "<cloudId>",
  issueIdOrKey: "<epic-key>"
}
```

Read `fields.description` for success criteria (SC) listed in the Epic.
