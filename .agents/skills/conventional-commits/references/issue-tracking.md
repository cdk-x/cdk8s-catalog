# Issue Tracking Integration

How to link commits and PRs to issues from different trackers. This reference covers GitHub Issues and Jira, with guidance on branch naming, commit footers, and PR descriptions.

## Table of Contents

1. [GitHub Issues](#github-issues)
2. [Jira Integration](#jira-integration)
3. [Branch Naming Conventions](#branch-naming-conventions)
4. [PR Description Templates](#pr-description-templates)
5. [Workflow: From Issue to PR](#workflow-from-issue-to-pr)

---

## GitHub Issues

### Detection

GitHub Issues are the default. The skill detects GitHub when:
- The branch name contains a plain number after the prefix (e.g., `feature/142-oauth-pkce`)
- The repo is hosted on GitHub (detected via `git remote -v`)
- No Jira-style key (`LETTERS-DIGITS`) is found in the branch name

### Reference Syntax in Commits

GitHub recognizes these keywords in commit messages (case-insensitive):

| Keyword | Effect | Example |
|---|---|---|
| `Refs: #123` | Links to issue, no automation | For related or partial work |
| `Closes: #123` | Closes issue when commit merges to default branch | For commits that fully resolve the issue |
| `Fixes: #123` | Same as `Closes:` | Alternative wording |
| `Resolves: #123` | Same as `Closes:` | Alternative wording |

**Multiple issues:**
```
Refs: #142, #159
Closes: #73, #81
```

**Cross-repo references:**
```
Refs: org/other-repo#42
```

### Using MCP Tools (Preferred)

If MCP tools for GitHub are available in the session, prefer them over CLI:

- **List issues:** look for tools like `issues_assigned_to_me`, `issues_get_detail`
- **View issue details:** look for `issues_get_detail` with the issue number
- **Pull requests:** look for `pull_request_create`, `pull_request_get_detail`

MCP tools provide structured output and don't require CLI installation.

### Using `gh` CLI (Fallback)

The GitHub CLI is the fastest way to look up and manage issues during the commit workflow.

**Listing issues:**
```bash
# Open issues assigned to you
gh issue list --assignee @me --state open

# All open issues, most recent first
gh issue list --state open --limit 20

# Filter by label
gh issue list --label "bug" --state open

# Search issues
gh issue list --search "oauth PKCE"
```

**Viewing issue details:**
```bash
gh issue view 142
gh issue view 142 --comments    # include comments
```

**Creating a branch from an issue:**
```bash
# Creates branch and links it to the issue
gh issue develop 142 --checkout
# Result: branch named like "142-add-oauth-pkce-flow"
```

**Checking which issue the current branch relates to:**
```bash
# If branch was created with gh issue develop:
gh issue develop --list 142

# Or parse the branch name:
git branch --show-current
# feat/142-oauth-pkce → issue #142
```

---

## Jira Integration

### Detection

Jira is detected when the branch name contains a key matching the `LETTERS-DIGITS` pattern (e.g., `feature/PROJ-142-oauth-pkce`). The project key is extracted automatically from the branch name.

### Reference Syntax in Commits

Jira uses project-key + number format:

```
feat(auth): add OAuth2 PKCE flow

Implement the authorization code flow with PKCE as required
by the security team's review.

Refs: PROJ-142
```

Jira doesn't auto-close issues from commit messages by default. Automation depends on your Jira configuration:

| Method | How it works |
|---|---|
| **Jira + GitHub integration** | Install the "GitHub for Jira" app in Jira. It syncs commits, branches, and PRs. Jira shows development activity on the issue. |
| **Jira Automation rules** | Create a rule: "When commit message contains `PROJ-XXX`" → transition issue. This requires Jira admin setup. |
| **Smart Commits** | If enabled by your Jira admin, syntax like `PROJ-142 #done` in the commit message can transition issues. |

### Looking Up Jira Issues

**Option 1: MCP tools (preferred)**

If MCP tools for Jira/Atlassian are available in the session, use them directly. Look for tools with Jira or Atlassian in the name for querying issues, getting details, and adding comments.

**Option 2: Jira REST API via curl**
```bash
# Requires a personal access token or API token
export JIRA_BASE="https://mycompany.atlassian.net"
export JIRA_TOKEN="your-api-token"
export JIRA_EMAIL="you@company.com"

# View an issue
curl -s -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  "$JIRA_BASE/rest/api/3/issue/PROJ-142" | jq '.fields.summary, .fields.status.name'

# Search issues assigned to you
curl -s -u "$JIRA_EMAIL:$JIRA_TOKEN" \
  "$JIRA_BASE/rest/api/3/search?jql=assignee=currentUser()+AND+status!=Done&maxResults=10" \
  | jq '.issues[] | {key, summary: .fields.summary, status: .fields.status.name}'
```

**Option 3: `jira-cli` (go-jira)**
```bash
# Install
brew install ankitpokhrel/jira-cli/jira-cli

# Configure (interactive, one-time)
jira init

# List issues
jira issue list -a "$(jira me)" -s "In Progress" -s "To Do"

# View issue
jira issue view PROJ-142
```

**Option 4: Parse from branch name**
Most teams adopt branch naming that includes the Jira key:
```bash
git branch --show-current
# feature/PROJ-142-oauth-pkce → PROJ-142
# bugfix/PROJ-73-null-pointer  → PROJ-73
```

### Extracting Issue Key from Branch Name

For Jira projects, extract the issue key using this pattern:

```bash
# Extract Jira key from branch name
git branch --show-current | grep -oE '[A-Z]+-[0-9]+'
# feature/PROJ-142-oauth-pkce → PROJ-142
# bugfix/PROJ-73-null-pointer  → PROJ-73
```

For GitHub projects, extract the issue number (first number after the prefix):

```bash
# Extract GitHub issue number from branch name
git branch --show-current | sed 's|^[^/]*/||' | grep -oE '^[0-9]+'
# feature/142-oauth-pkce → 142
# bugfix/73-null-pointer  → 73
```

---

## Branch Naming Conventions

A consistent branch naming convention makes issue detection automatic. The branch prefix indicates the **type of work**, and the rest identifies the issue and gives a short description.

### Branch Prefixes

These prefixes are widely adopted (originating from Git Flow and Jira's branch creation UI):

| Prefix | Commit type | When to use |
|---|---|---|
| `feature/` | `feat` | New functionality |
| `bugfix/` | `fix` | Bug fixes (non-urgent) |
| `hotfix/` | `fix` | Urgent production fixes (may skip normal flow) |
| `release/` | `chore` | Release preparation (version bumps, changelogs) |
| `docs/` | `docs` | Documentation-only work |
| `refactor/` | `refactor` | Code restructuring |
| `chore/` | `chore` | Maintenance, tooling, configs |
| `ci/` | `ci` | CI/CD pipeline changes |
| `test/` | `test` | Test-only additions or fixes |

### GitHub Issues

```
<prefix>/<issue-number>-<short-description>
```

Examples:
```
feature/142-oauth-pkce
bugfix/73-null-pointer-login
hotfix/89-crash-on-empty-token
chore/201-upgrade-deps
docs/55-api-reference
```

### Jira

```
<prefix>/<JIRA-KEY>-<short-description>
```

Examples:
```
feature/PROJ-142-oauth-pkce
bugfix/PROJ-73-null-pointer-login
hotfix/PROJ-89-crash-on-empty-token
release/PROJ-200-v2.0
```

Jira's "Create branch" button in its GitHub integration generates branches with this exact pattern (`feature/PROJ-XXX-slug`), so using it keeps your branches consistent with what Jira expects.

### Branches Without Issues

For work that doesn't have a tracked issue, omit the number:

```
feature/add-dark-mode
bugfix/fix-typo-in-header
chore/update-eslint-config
```

### Detection Algorithm

When starting the commit workflow, check the branch name for an issue reference:

1. Parse branch name with regex: `/([A-Z]+-\d+|\d+)/`
2. If it matches a Jira pattern (`LETTERS-DIGITS`) and tracker is jira → use as Jira key
3. If it matches a number and tracker is github → use as issue number
4. Suggest adding `Refs: <key>` to commit footers
5. If no match → ask the user if the work relates to an issue

---

## PR Description Templates

When creating a PR, link back to the issue in the description. This is where auto-closing should happen (not in individual commits), because:

- A feature may need multiple commits
- The PR is the unit that gets reviewed and merged
- Auto-close on PR merge is more predictable than on commit push

### GitHub PR Description

```markdown
## Summary

Brief description of what this PR does.

## Related Issue

Closes #142

## Changes

- Added OAuth2 PKCE flow
- Updated auth middleware
- Added integration tests
```

The `Closes #142` in the PR description auto-closes issue #142 when the PR merges. Use `Refs #142` if the PR only partially addresses the issue.

### Jira PR Description

```markdown
## Summary

Brief description of what this PR does.

## Related Issue

[PROJ-142](https://mycompany.atlassian.net/browse/PROJ-142)

## Changes

- Added OAuth2 PKCE flow
- Updated auth middleware
- Added integration tests
```

With the GitHub-Jira integration installed, Jira automatically shows the PR on the issue's development panel. If Jira Automation is configured, the PR merge can trigger an issue transition.

### Creating PRs with `gh` CLI

```bash
# Create PR linking to issue
gh pr create --title "feat(auth): add OAuth2 PKCE flow" \
  --body "Closes #142" \
  --assignee @me

# Create PR from issue (auto-fills title and body)
gh pr create --recover 142

# If using a template
gh pr create --fill
```

---

## Workflow: From Issue to PR

Complete workflow showing how issues flow through the commit process:

### GitHub

```
1. Issue #142 exists: "Add OAuth2 PKCE flow"
2. Create branch:     gh issue develop 142 --checkout
                       → branch: feature/142-oauth-pkce
3. Make changes and commit:
   git commit -m "feat(auth): add PKCE authorization handler

   Refs: #142"
4. More commits:
   git commit -m "test(auth): add PKCE integration tests

   Refs: #142"
5. Create PR:
   gh pr create --title "feat(auth): add OAuth2 PKCE flow" --body "Closes #142"
6. PR merges → issue #142 auto-closes
```

### Jira

```
1. Issue PROJ-142 exists: "Add OAuth2 PKCE flow"
2. Create branch:     git checkout -b feature/PROJ-142-oauth-pkce
3. Make changes and commit:
   git commit -m "feat(auth): add PKCE authorization handler

   Refs: PROJ-142"
4. More commits:
   git commit -m "test(auth): add PKCE integration tests

   Refs: PROJ-142"
5. Create PR:
   gh pr create --title "feat(auth): add OAuth2 PKCE flow" \
     --body "[PROJ-142](https://mycompany.atlassian.net/browse/PROJ-142)"
6. PR merges → Jira shows PR on issue (with GitHub integration)
                → Jira transitions issue (if automation rule exists)
```
