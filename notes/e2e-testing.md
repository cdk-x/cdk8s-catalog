# E2E testing a catalog library

Unit tests (`Testing.synth()` in `*.spec.ts`) exercise source code directly —
they never touch what actually gets published to npm. This misses the bugs
that matter most for a publishable library: a wrong `exports` map, files
missing from the tarball (`files` in `package.json`), broken ESM resolution,
undeclared dependencies, etc.

E2E testing closes that gap: publish the library for real to a local
[Verdaccio](https://verdaccio.org/) registry, install it like an external
consumer would (`npm install`, not the pnpm workspace symlink), and run a
small cdk8s app against it with default values to confirm it synthesizes.

`@cdk-x/metric-server` + `e2e/metric-server/` is the reference
implementation — read it alongside this guide.

## How it fits together

```
packages/<library>/         the library, built and published
e2e/<library>/               a throwaway app that installs it from Verdaccio
```

Key design decisions, and why:

- **`e2e/<library>` is excluded from `pnpm-workspace.yaml`.** If it were a
  workspace member, pnpm would symlink `@cdk-x/<library>` to the local
  source instead of fetching the published tarball — defeating the point.
- **Installed with `npm`, not `pnpm`.** Sidesteps pnpm's
  `link-workspace-packages` behavior entirely, and better simulates a real
  external consumer (who isn't in this pnpm workspace either). `npm` is
  already a hard requirement of this repo (`@nx/js:release-publish` needs
  it).
- **Dependency version is `"latest"`.** Every e2e run installs whatever is
  currently on the local registry — no version coordination needed with the
  publish step.
- **Tagged `"e2e"` and excluded from the release pre-build.** `nx.json`'s
  `release.version.preVersionCommand` runs
  `nx run-many -t build --exclude=tag:e2e` — e2e projects depend on a
  package being *already published*, so they can't be part of the "build
  everything before versioning" sweep.
- **No `cdk8s.yaml` / `cdk8s` CLI.** Both exist to generate constructs from
  CRDs/Helm charts/the k8s API you don't already have. The libraries in this
  catalog are already-published, already-compiled construct libraries — the
  e2e app only *consumes* them, exactly like a `*.spec.ts` does with
  `Testing.synth()`, just with a real `App` instead of `Testing.app()`.
- **`app.synth()` output goes to its own `manifests/` dir**, not `dist/`
  (which holds the compiled JS) — see `e2e/metric-server/src/main.ts`.
- **`YamlOutputType.FILE_PER_APP`** — a single, dependency-ordered YAML file.
  cdk8s topologically sorts resources by their declared dependencies
  (`construct.node.addDependency(...)`), and that order is only meaningful
  for `kubectl apply` when everything lands in **one file** applied with a
  single `-f`. Splitting into multiple files (`FILE_PER_CHART`,
  `FILE_PER_RESOURCE`) loses any apply-order guarantee across files, since
  `kubectl apply -f dir/` applies them in filesystem order, not dependency
  order.

  This only works if the library itself declares its real dependencies with
  `construct.node.addDependency(...)` (see `packages/metric-server/src/metric-server.ts`)
  — without that, cdk8s falls back to construction order, which "happens to
  work" until someone reorders the constructor.

## Running an e2e test

```sh
# 1. Start the local registry (leave running in its own terminal)
pnpm nx local-registry

# 2. Publish the library to it
pnpm nx run @cdk-x/cdk8s-catalog:release-local

# 3. Install from the registry and synth
pnpm nx run <library>-e2e:synth
```

`synth` depends on `build`, which depends on `install-from-registry` — so
step 3 alone always does a fresh install + compile + run. Output:

- `e2e/<library>/manifests/app.k8s.yaml` — the rendered manifest, ready for
  `kubectl apply -f e2e/<library>/manifests/app.k8s.yaml`.
- `e2e/<library>/dist/` — the compiled e2e script (build artifact, not the
  manifest).

Both are gitignored (`dist` globally, `e2e/**/manifests` and
`e2e/**/package-lock.json` explicitly in `.gitignore`) — nothing here is
meant to be committed.

### Troubleshooting

- **"The workspace is out of sync"** when running `release-local`: run
  `pnpm nx sync` (sometimes needs to run twice), then retry.
- **A previous version conflict on publish**: shouldn't happen —
  `tools/release-local-unpublish.mjs` clears the target version from the
  local registry before publishing. If it does, the registry storage can
  always be wiped: `rm -rf tmp/local-registry/storage`.

## Adding e2e coverage for a new library

1. Scaffold it as a plain TS project under `e2e/<library>/` (there is no
   dedicated Nx "app" generator in this workspace — only `@nx/js:library`):

   ```sh
   pnpm nx g @nx/js:library --directory=e2e/<library> --name=<library>-e2e \
     --bundler=tsc --unitTestRunner=none --linter=eslint \
     --publishable=false --useProjectJson=true
   ```

2. The generator will add `e2e/<library>` to `pnpm-workspace.yaml` — **revert
   that** (keep only `packages/*`), then `pnpm install` to reconcile the
   lockfile.

3. Replace the generated `src/*` with a single `src/main.ts`:

   ```ts
   import { App, YamlOutputType } from 'cdk8s';
   import { SomeConstruct } from '@cdk-x/<library>';

   const app = new App({ outdir: 'manifests', yamlOutputType: YamlOutputType.FILE_PER_APP });
   new SomeConstruct(app, '<library>');
   app.synth();
   ```

4. Trim `e2e/<library>/package.json` to just what the script imports
   directly (the library itself, `"latest"`; `cdk8s`, pinned to the same
   range the library depends on; `tslib`).

5. In `e2e/<library>/project.json`: set `"tags": ["e2e"]`, and add
   `install-from-registry` / extend `build` / `synth` targets — copy them
   from `e2e/metric-server/project.json`.

6. Verify with the commands above.
