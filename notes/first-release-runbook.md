# First release of a single (new) library

## Preferred: `release.yml`, no terminal commands

`.github/workflows/release.yml` has two `workflow_dispatch` inputs built
for exactly this:

- **`projects`**: comma/space-separated Nx project names (e.g.
  `@cdk-x/new-lib`) to scope the run to. Empty = every project with pending
  changes.
- **`first_release`**: passes `--first-release` through version/changelog,
  *and* switches the `publish-npm` job from OIDC (`NPM_TRUSTED_PUBLISHER`)
  to a classic `NPM_TOKEN` secret — npm's Trusted Publisher can't be
  configured before the package exists (see `notes/npm-registry-setup.md`),
  so the very first npm publish has to use a real token regardless.

So releasing a brand-new library is just: trigger `release.yml` with
`projects: @cdk-x/new-lib` and `first_release: true`. PyPI, Maven, NuGet,
and Go all succeed normally (their auth is pre-registered at the
namespace/account/pending-publisher level, so a brand-new library needs
nothing special there). Only npm needs the `NPM_TOKEN` secret to exist
(a classic Automation token — see `notes/npm-registry-setup.md`) for this
to work; it's used only when `first_release: true`, ignored otherwise.

**After this run**: go to npmjs.com, the package now exists — follow steps
4-6 in `notes/npm-registry-setup.md` (register its Trusted Publisher,
create the GitHub Environment `npm-<dir>`). Every *subsequent* release of
this library goes through `release.yml` with `first_release: false`,
npm included.

## Fallback: fully manual, by hand in a terminal

Only reach for this if the workflow itself is broken/unavailable. Replace
`<pkg>` with the npm-scoped project name (e.g. `@cdk-x/new-lib`) and `<dir>`
with its folder name (e.g. `new-lib`, i.e. `packages/<dir>`).

### 1. Version + changelog + tag (no push yet)

```sh
pnpm nx release version --projects=<pkg> --first-release \
  --git-commit=false --git-tag=false --git-push=false

pnpm nx release changelog "$(node -p "require('./packages/<dir>/package.json').version")" \
  -p <pkg> --first-release --git-commit --git-tag --git-push=false
```

(Same two-step shape as `tools/release-changelog.mjs`, just scoped to one
project instead of looping over all of them.)

### 2. Push

```sh
git push origin HEAD --follow-tags
```

### 3. Build every language's jsii artifacts

```sh
pnpm nx run <pkg>:jsii-package-all
```

(This also triggers any local dependency's `jsii-package-*` targets first,
via the `^jsii-package-*` `dependsOn` chain — no extra step needed even if
the new library depends on `@cdk-x/cdk8s-core`.)

### 4. Publish to each registry by hand

OIDC (Trusted Publisher) only works from inside a GitHub Actions run — for
a local/manual publish, swap in a temporary classic credential instead.
Reuses the exact same `publib-*` tool the workflow calls, just with
different env vars, so behavior matches CI.

```sh
# npm - classic Automation token (mandatory bootstrap, see notes/npm-registry-setup.md)
NPM_TOKEN=<classic automation token> NPM_ACCESS_LEVEL=public \
  pnpm exec publib-npm packages/<dir>/dist-jsii/js

# PyPI - classic API token (only if skipping the pre-registered pending publisher route)
TWINE_USERNAME=__token__ TWINE_PASSWORD=<pypi api token> \
  pnpm exec publib-pypi packages/<dir>/dist-jsii/python

# Maven - same static secrets already used in CI, nothing OIDC involved
MAVEN_SERVER_ID=central-ossrh \
  MAVEN_USERNAME=<...> MAVEN_PASSWORD=<...> \
  MAVEN_GPG_PRIVATE_KEY=<...> MAVEN_GPG_PRIVATE_KEY_PASSPHRASE=<...> \
  pnpm exec publib-maven packages/<dir>/dist-jsii/java

# NuGet - classic API key (temporary, only if skipping the account-level OIDC policy)
NUGET_API_KEY=<nuget api key> \
  pnpm exec publib-nuget packages/<dir>/dist-jsii/dotnet

# Go - same PAT value as the GH_GO_MIRROR_TOKEN secret, nothing OIDC involved
GITHUB_TOKEN=<same PAT as GH_GO_MIRROR_TOKEN> \
  GIT_USER_NAME="github-actions[bot]" \
  GIT_USER_EMAIL="github-actions[bot]@users.noreply.github.com" \
  pnpm exec publib-golang packages/<dir>/dist-jsii/go
```

### 5. Finish the npm bootstrap

Same as the preferred path above: register the Trusted Publisher on
npmjs.com, create the GitHub Environment `npm-<dir>`.
