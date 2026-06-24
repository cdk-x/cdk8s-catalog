# GitHub — Fetch and Publish

## Fetching the spec and plan

```bash
gh issue view <number> --json title,body,comments
```

- **Spec** = the issue body (written by `/prd`)
- **Plan** = the most recent comment whose body contains `## 📐 Technical Plan` (written by `/plan`)

If no plan comment is found, stop and tell the user: *"No technical plan found on this issue. Run `/plan` first."*

## Publishing the analysis

Post the analysis as a comment on the same issue:

```bash
gh issue comment <number> --body "$(cat <<'EOF'
<analysis content>
EOF
)"
```

Report the issue number and URL to the user.
