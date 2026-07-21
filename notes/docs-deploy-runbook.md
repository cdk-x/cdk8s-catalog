# Docs deployment automation

`.github/workflows/docs-deploy.yml` automates what used to be a fully manual
step: rebuilding and redeploying mkdocs+mike docs (per library, plus the
catalog's own evergreen site) to `gh-pages`.

## Two entry points, one workflow

- **Automatic, as part of a release**: `.github/workflows/release.yml`'s
  `deploy-docs` job calls it (`uses: ./.github/workflows/docs-deploy.yml`)
  after every publish job succeeds, passing through the exact project list
  `build-jsii` already computed (`needs.build-jsii.outputs.projects`) - never
  re-derived independently. If any publish job fails, docs aren't
  redeployed for that release (deliberate: don't advertise a version that
  isn't actually live everywhere).
- **Manual, standalone**: trigger `docs-deploy.yml` directly via
  `workflow_dispatch` - for fixing a docs typo on an already-published
  version, or redeploying without cutting a whole new release.

## The `projects` input has a different format depending on how you trigger it

This is a real, easy-to-trip-on inconsistency with `release.yml`'s own
`projects` input:

- `release.yml`'s `projects` input uses full Nx project names
  (`@cdk-x/metric-server`).
- `docs-deploy.yml`'s `workflow_dispatch` `projects` input uses **short**
  library names (`metric-server`, no scope) - the same short form
  `tools/docs-deploy-library.mjs` itself takes as a CLI arg.

Empty = every library that has a `docs-deploy` Nx target (i.e. an actual
`mkdocs.yml`) - not every library in the catalog. `tools/list-docs-projects.mjs`
handles the discovery + both input shapes; see its header comment.

## Why the workflow does two things `release.yml`'s other jobs don't need to

- **Restores a real branch name after checkout.** `release.yml` checks out a
  raw commit sha, which is always detached HEAD - but
  `tools/docs-deploy-library.mjs`/`tools/docs-deploy.mjs` both key their
  `main`-vs-not behavior off `git branch --show-current`, which returns
  empty in detached HEAD. Without the fix, a real `main` release would
  silently skip moving the `latest` alias and skip the catalog site
  entirely - no error, just wrong.
- **Fetches `gh-pages` before running anything.** `actions/checkout` only
  fetches the ref you ask for; `gh-pages` won't exist as a local ref in a
  fresh CI checkout even though it exists on `origin`, and both mike and
  `tools/docs-deploy.mjs` need it locally to know they're updating existing
  history rather than starting from scratch.

## Local testing

`docs/requirements.txt` pins the exact mkdocs/mike versions CI installs -
`pip install -r docs/requirements.txt` locally keeps them in sync (see
`docs/core/building-a-library.md`).
