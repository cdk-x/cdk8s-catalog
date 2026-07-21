# Registering on npm

We publish via `publib-npm` using OIDC **Trusted Publisher**
(`NPM_TRUSTED_PUBLISHER: "1"` in `.github/workflows/release.yml`'s
`publish-npm` job — no `NPM_TOKEN` secret to store or rotate, for releases
*after* the bootstrap below).

## Account and scope

1. Sign up at <https://www.npmjs.com/> (any email works, e.g.
   `team@cdk-x.com`).
2. The `@cdk-x` scope used by every package name (`@cdk-x/cdk8s-core`,
   `@cdk-x/metric-server`, ...) requires an **npm Organization** called
   `cdk-x` — already created and owned by us.

## Why npm needs a manual bootstrap (unlike the other 4 registries)

Every other registry lets you register auth *before* a package exists:

- PyPI: "pending publisher" tied to a project name that doesn't exist yet.
- Maven Central / NuGet: verified at the **namespace/account** level, not
  per package — works from CI on day one, no per-package step ever.
- Go: no registration at all, just a real git repo.

**npm's Trusted Publisher can only be configured on an existing package's
own settings page** — there is no "pending" equivalent. So for every new
library's very first release, someone has to `npm publish` it by hand once
(with a classic token) before OIDC can be turned on for it. This repeats
for **every new library** added to the catalog (#3, #4, ... #50) — npm is
the one registry here where onboarding a library is not a one-time,
catalog-wide setup.

Only `publish-npm` is affected — running `release.yml` for a brand-new
library will still succeed for `publish-pypi`, `publish-nuget`, and
`publish` (Maven/Go); `publish-npm` alone fails until the manual bootstrap
below is done. The jobs are independent (no `needs:` between them), so one
failing doesn't block the others.

## One-time bootstrap per (new) package

Handled by `release.yml` itself now — no manual terminal commands needed
(see `notes/first-release-runbook.md`). Trigger it with
`projects: @cdk-x/<pkg>` and `first_release: true`: the `publish-npm` job
detects `first_release` and uses a classic `NPM_TOKEN` secret instead of
OIDC for that run (`NPM_TRUSTED_PUBLISHER` is only set when
`first_release` is false). The other registries (PyPI/Maven/NuGet/Go) don't
need this — their auth is already registered ahead of time.

Requires the `NPM_TOKEN` repo secret to exist: a classic **Automation**
access token from <https://www.npmjs.com/> (profile → Access Tokens →
Generate New Token → Automation) — a real user, not the org. It's only used
when `first_release: true`; ignored on every normal release.

After that run:

1. The package now exists on npmjs.com — go to its page → Settings →
   **Trusted Publisher** and register: Owner `cdk-x`, Repository
   `cdk8s-catalog`, Workflow filename `release.yml`, Environment
   `npm-<folder-name>` (matches `environment: npm-${{ matrix.pkg.name }}`
   in `publish-npm`).
2. Create the matching GitHub Environment `npm-<folder-name>` (Settings →
   Environments) in the `cdk8s-catalog` repo.
3. From the *next* release onward, trigger `release.yml` with
   `first_release: false` as normal — `publish-npm` uses OIDC for this
   package with no further manual steps.

See `notes/first-release-runbook.md` for the fully manual fallback (only
needed if the workflow itself is unavailable), and how this fits into
releasing a brand-new library end to end.
