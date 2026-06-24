#!/usr/bin/env bash
# analyze-changes.sh — List git changes with branch and issue context
#
# Pure git wrapper. Lists all changed files with their status and
# extracts issue references from the branch name. Scope resolution
# is left to the agent, which has the repo context (AGENTS.md, etc.).
#
# Usage:
#   bash analyze-changes.sh
#
# Output format (tab-separated lines):
#   BRANCH:<branch-name>
#   ISSUE:<ref>	<tracker>
#   STAGED:<path>
#   MODIFIED:<path>
#   UNTRACKED:<path>
#
# Example:
#   BRANCH:feature/142-oauth-pkce
#   ISSUE:#142	github
#   STAGED:src/auth/login.ts
#   MODIFIED:src/api/handler.ts
#   UNTRACKED:src/auth/refresh.ts

set -euo pipefail

# --- Ensure we're in a git repo ---
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "ERROR:Not inside a git repository" >&2
  exit 1
fi

# --- Branch ---
BRANCH="$(git branch --show-current 2>/dev/null || echo "")"
echo "BRANCH:${BRANCH}"

# --- Issue reference from branch name ---
if [[ -n "$BRANCH" ]]; then
  # Jira pattern: LETTERS-DIGITS (e.g., PROJ-142)
  JIRA_KEY=$(echo "$BRANCH" | grep -oE '[A-Z]+-[0-9]+' | head -1 || true)
  if [[ -n "$JIRA_KEY" ]]; then
    echo "ISSUE:${JIRA_KEY}	jira"
  else
    # GitHub pattern: number after prefix (feature/142-xxx → 142)
    GH_NUM=$(echo "$BRANCH" | sed 's|^[^/]*/||' | grep -oE '^[0-9]+' | head -1 || true)
    if [[ -n "$GH_NUM" ]]; then
      echo "ISSUE:#${GH_NUM}	github"
    fi
  fi
fi

# --- Staged files ---
git diff --cached --name-only 2>/dev/null | while IFS= read -r f; do
  [[ -n "$f" ]] && echo "STAGED:${f}"
done

# --- Modified (unstaged tracked) files ---
git diff --name-only 2>/dev/null | while IFS= read -r f; do
  [[ -n "$f" ]] && echo "MODIFIED:${f}"
done

# --- Untracked files ---
git ls-files --others --exclude-standard 2>/dev/null | while IFS= read -r f; do
  [[ -n "$f" ]] && echo "UNTRACKED:${f}"
done
