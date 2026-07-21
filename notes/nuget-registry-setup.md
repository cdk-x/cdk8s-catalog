# Registering on NuGet

We publish via `publib-nuget` using OIDC **Trusted Publisher**
(`NUGET_TRUSTED_PUBLISHER: "1"` in `.github/workflows/release.yml`'s
`publish-nuget` job) — no `NUGET_API_KEY` secret to store or rotate.

## Why `publish-nuget` is a single shared job, unlike PyPI/npm

NuGet's Trusted Publishing policy form has **no "Package ID"/package name
field at all** — only `Policy Name` (a label), `Package Owner` (fixed to
your account, `cdk-x`), and the GitHub identity (`Repository Owner`,
`Repository`, `Workflow File`, `Environment`). Confirmed by testing: the
policy saved with no complaint even though neither `cdk8s-catalog-core` nor
`cdk8s-catalog-metric-server` had ever been published. So one policy,
scoped to the **account**, authorizes publishing *any* package owned by
`cdk-x` from that exact workflow+environment — unlike PyPI/npm, which are
scoped per package.

That means `publish-nuget` doesn't need a per-package matrix or
per-package environment (contrast with `publish-pypi`/`publish-npm`): one
job, one fixed `environment: nuget`, looping over every package inside a
single step — same shape as the static-secret `publish` job (Maven/Go),
just using OIDC env vars instead of a secret.

## One-time setup

1. Sign in / create an account at <https://www.nuget.org/> — this goes
   through Microsoft identity, but any existing email works (e.g.
   `team@cdk-x.com`) to create the Microsoft account, no need for an
   outlook.com address.
2. Account → **Trusted Publishing** (or wherever nuget.org currently
   surfaces it) → Add Policy:
   - Policy Name: anything identifiable, e.g. `cdk8s-catalog release`
   - Repository Owner: `cdk-x`
   - Repository: `cdk8s-catalog`
   - Workflow File: `release.yml`
   - Environment: `nuget`
3. Create the matching GitHub Environment `nuget` (Settings → Environments)
   in the `cdk8s-catalog` repo.
4. Find your nuget.org **profile username** (top-right → your name — not
   your email) and store it as the `NUGET_USERNAME` secret (required by
   Trusted Publisher auth even though the policy itself is account-scoped).

## Adding a new library

Nothing to register — the existing account-level policy already covers any
new package owned by `cdk-x`, unlike npm (see `notes/npm-registry-setup.md`
for the one registry that does need per-library manual work).
