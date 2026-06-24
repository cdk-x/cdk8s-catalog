# Confluence — Fetch and Publish

## Fetching the spec and plan

### 1. Resolve the page ID

**URL provided** — extract the numeric page ID from `/pages/<id>/`.

**Title or search term provided** — search for the page:
```
mcp__atlassian__searchConfluenceUsingCql { cql: "title = \"<page title>\" AND type = page" }
```

**Neither** — ask: *"What's the title or URL of the Confluence PRD page?"*

### 2. Read the page

```
mcp__atlassian__getConfluencePage { pageId: "<id>" }
```

The `body.storage.value` field contains the spec (written by `/prd`).

### 3. Find the plan comment

```
mcp__atlassian__getConfluencePageFooterComments { pageId: "<id>" }
```

- **Plan** = the most recent footer comment whose body contains `## 📐 Technical Plan` (written by `/plan`)

If no plan comment is found, stop and tell the user: *"No technical plan found on this page. Run `/plan` first."*

---

## Publishing the analysis

Post the analysis as a footer comment on the PRD page:

```
mcp__atlassian__createConfluenceFooterComment {
  pageId: "<id>",
  body: "<analysis content as HTML>"
}
```

### Formatting note

Confluence expects HTML for the `body` field. Convert Markdown to basic HTML:
- `##` → `<h2>`, `###` → `<h3>`
- `- item` → `<ul><li>item</li></ul>`
- `**bold**` → `<strong>bold</strong>`
- Markdown tables → `<table>` with `<tr>` and `<td>` elements

Report the page title and URL to the user.
