# Confluence — Iteration Plan

---

## Fetching the PRD from the story description

The story description contains a PRD URL in the format:
```
https://<org>.atlassian.net/wiki/spaces/<SPACE>/pages/<ID>/<Title>
```

Extract the numeric page ID from the URL path (the segment after `/pages/`).

```
mcp__atlassian__getConfluencePage {
  cloudId: "<cloudId>",
  pageId: "<id>",
  contentFormat: "markdown"
}
```

Read the PRD for:
- Functional Requirements (REQ-N) — complement the FRs already in the Jira story
- Non-Functional Requirements — additional constraints
- Edge Cases and Out of Scope — boundaries for the sub-task split
- Key Entities — data structures and their relationships

---

## Searching for an existing Technical Plan

If a technical plan was created by `/plan` for this PRD, search for it:

```
mcp__atlassian__searchConfluenceUsingCql {
  cloudId: "<cloudId>",
  cql: "title = \"Technical Plan\" AND space = \"<SPACE>\" AND type = page"
}
```

Or search by partial title if the naming convention uses the PRD title:
```
mcp__atlassian__searchConfluenceUsingCql {
  cloudId: "<cloudId>",
  cql: "title ~ \"Technical Plan\" AND space = \"<SPACE>\" AND type = page"
}
```

If found, fetch it:
```
mcp__atlassian__getConfluencePage {
  cloudId: "<cloudId>",
  pageId: "<id>",
  contentFormat: "markdown"
}
```

A technical plan may contain implementation phases and module decisions that inform
the codebase analysis in Step 2. Use it as additional context — do not replace the
direct codebase exploration.

If no technical plan exists, proceed with direct codebase analysis only.
