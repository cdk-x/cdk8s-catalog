# Publishing Go modules (no registry involved)

Unlike npm/PyPI/Maven, **Go has no central package registry to sign up
for.** A Go module's identity *is* a real git repository at the exact
import path — "publishing" just means pushing a tagged commit there. The
public [module proxy](https://proxy.golang.org) and
[checksum database](https://sum.golang.org) discover and cache it
automatically the first time anyone runs `go get`, with no publisher
account or registration step at all.

This is exactly the pattern the upstream cdk8s and AWS CDK teams use too:
`cdk8s-team/cdk8s-plus-go` and `aws/aws-cdk-go` are both dedicated,
CI-generated mirror repos, distinct from the TypeScript-source monorepo —
never hand-written.

## One shared repo for the whole catalog

Both libraries' `package.json` declare the **same**
`jsii.targets.go.moduleName`:

```json
"go": { "moduleName": "github.com/cdk-x/cdk8s-catalog-go" }
```

So there's a single mirror repo, **<https://github.com/cdk-x/cdk8s-catalog-go>**
(public, created once), not one repo per library. Each library lands in its
own subdirectory with its own `go.mod`, and gets its own version-tag
namespace: `publib-golang` tags nested modules as `<subdir-name>/vX.Y.Z`
(e.g. `cdkxcdk8score/v0.0.1`, `cdkxmetricserver/v0.0.1`), so independently
versioned libraries coexist in one repo without colliding.

**This means adding library #3, #4, ... #50 never requires creating a new
GitHub repo** — as long as its `package.json` uses the same
`moduleName: "github.com/cdk-x/cdk8s-catalog-go"`, it just lands in a new
subdirectory the first time it's released.

## Authentication for CI

The default `secrets.GITHUB_TOKEN` in Actions only scopes to the repo the
workflow runs in (`cdk8s-catalog`), not this separate mirror repo — so a
dedicated token was needed:

1. GitHub → Settings → Developer settings → **Fine-grained tokens** →
   Generate new token.
2. Resource owner: `cdk-x` (the org).
3. Repository access: only `cdk8s-catalog-go`.
4. Permissions: **Contents: Read and write** (all `publib-golang` needs to
   clone, commit, tag, and push).
5. Stored as the `GH_GO_MIRROR_TOKEN` secret on the `cdk8s-catalog` repo
   (referenced as `GITHUB_TOKEN` env var in the `publish` job's Go step in
   `.github/workflows/release.yml` — `publib-golang` itself expects that
   exact env var name).

## Adding a new library

Nothing to register anywhere. Just make sure the new library's
`package.json` sets `jsii.targets.go.moduleName` to
`github.com/cdk-x/cdk8s-catalog-go`, same as every other library.
