# GitHub — Fetch and Publish

## Fetching the spec

```bash
gh issue view <number> --json title,body,labels
```

The issue body is the spec. Read it carefully — it defines the scope and constraints.

## Publishing the plan

Post the plan as a comment on the same issue:

```bash
gh issue comment <number> --body "$(cat <<'EOF'
<plan content>
EOF
)"
```

Report the issue number and URL to the user.
