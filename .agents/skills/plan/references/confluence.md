# Confluence — Fetch and Publish

## Fetching the spec

You need the page identifier. Resolve from context in this order:

### 1. URL provided
Extract the page ID from the URL (the numeric segment in `/pages/<id>/`) or use the title.

### 2. Title or search term provided
Search for the page:
```
mcp__atlassian__searchConfluenceUsingCql { cql: "title = \"<page title>\" AND type = page" }
```

### 3. Neither — ask
Ask: *"What's the title or URL of the Confluence PRD page?"*

### Reading the content
```
mcp__atlassian__getConfluencePage { pageId: "<id>" }
```

The `body.storage.value` field contains the page content. Read it carefully — it defines the scope and constraints.

---

## Publishing the plan

Post the plan as a footer comment on the PRD page:

```
mcp__atlassian__createConfluenceFooterComment {
  pageId: "<id>",
  body: "<plan content as HTML>"
}
```

### Formatting note
Confluence expects HTML for the `body` field. Convert Markdown to basic HTML:
- `##` → `<h2>`, `###` → `<h3>`
- `- item` → `<ul><li>item</li></ul>`
- `**bold**` → `<strong>bold</strong>`
- Markdown tables → `<table>` with `<tr>` and `<td>` elements

Report the page title and URL to the user.
