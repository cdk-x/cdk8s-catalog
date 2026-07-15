# Building a library

This is the pattern every cdk8s library in this catalog follows, built on
top of [`CatalogChart`](catalog-chart.md). The
[`@cdk-x/metric-server`](https://github.com/cdk-x/cdk8s-catalog/tree/main/packages/metric-server)
package is the canonical reference implementation — read it alongside this
guide.

## Principles

1. **One folder per Kubernetes `kind`.** Each folder under `src/` owns a
   single resource kind, wrapped in a focused construct, with a colocated
   unit test.
2. **OOP only.** Everything is a `class`. No exported functions.
3. **Helm-like customization.** Sensible defaults, overridable via props,
   extensible after construction — plus an always-available escape hatch.
4. **Compose in a `Chart`.** A root chart (extending
   [`CatalogChart`](catalog-chart.md)) wires the per-kind constructs
   together.
5. **Test every kind.** Targeted assertions per construct + one chart
   snapshot.

!!! note "Kubernetes version"
    The catalog currently targets Kubernetes **1.34** → every library uses
    `cdk8s-plus-34`. This is the same axis this documentation site is
    versioned on — see the selector in the header.

## Directory layout

```text
packages/<library>/src/
  index.ts                     # public API surface
  <library>.ts                 # the Chart (composition root, extends CatalogChart)
  <library>.spec.ts            # full-synth snapshot test
  <kind>/                      # one folder per kind
    <kind>.ts                  #   the construct
    <kind>.spec.ts             #   its unit test
    index.ts                   #   re-export
  ...
```

`metric-server` example: `deployment/`, `service/`, `service-account/`,
`api-service/`, `cluster-role/`, `cluster-role-binding/`, `role-binding/`.
RBAC is split strictly per kind; the chart instantiates the parameterized
role/binding constructs and wires their cross-references.

## Construct design

- Reusable resources extend `Construct`; the composition root extends
  `CatalogChart`.
- Every construct takes a `MyThingProps` interface. Each optional field
  carries a JSDoc `@default`. Resolve with `props.x ?? DEFAULT`.
- Expose the underlying cdk8s-plus object as a `public readonly` field — it
  is the escape hatch (see below) and lets the chart wire things together.
- ESM/nodenext: **all intra-package imports use the `.js` extension**
  (`import { Foo } from './foo/index.js'`).

### Customization surface — layered (the CDK L2/L1 model)

Don't try to model every Kubernetes field in props. Model the common ~80%
and provide escape hatches for the rest:

1. **Grouped props + defaults** for common knobs (`image`, `replicas`,
   `imagePullPolicy`, `strategy`, `resources`, `probes`). Nest related
   options (e.g. `probes?: { liveness?; readiness?; startup? }`) instead of
   one flat interface.
2. **Fluent `addXxx()/setXxx(): this`** only for collections built
   incrementally (args, env, volumes, RBAC rules/subjects). Scalars stay
   props-only — don't add a setter for every field.
3. **Escape hatch, always available.** Expose the underlying object and use
   `obj.apiObject.addJsonPatch(JsonPatch.replace('/spec/...', value))` for
   the long tail you don't model.

### Enums for domain values

Reuse cdk8s-plus's own enums (`ImagePullPolicy`, `DeploymentStrategy`,
`Protocol`, `SeccompProfileType`, `ConnectionScheme`, `Capability`, …).
Author your own **string** enum only for domain-specific values — e.g. known
CLI flag keys:

```ts
export enum MetricsServerArg {
  CERT_DIR = 'cert-dir',
  SECURE_PORT = 'secure-port',
  // ...
}
```

Keep it **extensible**: type the method as
`addArg(key: string, value: string)`, not
`addArg(key: MetricsServerArg, ...)`, so callers get autocomplete via the
enum but can still pass a flag you didn't enumerate.

## Deferred rendering (how `addXxx` reaches the manifest)

cdk8s-plus higher constructs wrap their whole spec in
`Lazy.any({ produce: () => this._toKube() })`, so the manifest is rendered
**at synth**, not at construction. That is what makes post-construction
mutation work. Two facts to internalize:

- `ApiObject.toJson()` runs `resolve()` (which resolves `Lazy`) **before**
  applying `JsonPatch`. So a `JsonPatch` value cannot itself carry a `Lazy`.
- cdk8s core only exposes `Lazy.any(producer)` (returns `any`) — there is no
  `Lazy.list`/`Lazy.string`.

Recommended recipe for a mutable collection (args), as in
[`deployment.ts`](https://github.com/cdk-x/cdk8s-catalog/blob/main/packages/metric-server/src/deployment/deployment.ts):

- Hold the state in a `Map<string,string>` (single source of truth; dedups
  by key, so `addArgs` **overrides** a default rather than duplicating a
  flag).
- Hand cdk8s-plus a **live array reference** and re-sync it from the Map on
  each mutation. Do **not** pass `Lazy.any(...)` as the whole `args` value:
  `Container.get args()` does `[...this._args]`, which throws on a
  non-iterable `Lazy`.

```ts
private readonly args = new Map<string, string>(/* defaults */);
private readonly renderedArgs: string[] = [];   // handed to the container

public addArgs(args: Record<string, string>): this {
  for (const [k, v] of Object.entries(args)) this.args.set(k, v);
  this.syncArgs();
  return this;
}
private syncArgs(): void {
  this.renderedArgs.length = 0;
  this.renderedArgs.push(...this.renderArgs());
}
private renderArgs(): string[] {
  return [...this.args].map(([k, v]) => (v === '' ? `--${k}` : `--${k}=${v}`));
}
```

Fallback if a cdk8s-plus field copies/validates the value at construction
(so a live reference doesn't survive): apply concrete values via
`obj.apiObject.addJsonPatch(JsonPatch.replace(path, this.renderArgs()))`.

## Testing

Use cdk8s `Testing` with Jest (SWC transform is already configured):

- Per-kind spec: `Testing.chart()` → instantiate the construct →
  `Testing.synth(chart)` → **targeted assertions** on the synthesized
  manifest (ports, image, verbs, apiGroups, …). Include a test that calls
  `addXxx` **after** construction and asserts the change lands at synth.
- Chart spec: one `expect(Testing.synth(chart)).toMatchSnapshot()` over the
  whole composition.

## Scaffolding a new library

```sh
pnpm nx g @nx/js:lib packages/<library> --publishable --importPath @cdk-x/<library>
pnpm add cdk8s cdk8s-plus-34 constructs --filter @cdk-x/<library>
pnpm add @cdk-x/cdk8s-core --filter @cdk-x/<library>
```

Then follow the layout above, with the composition root extending
[`CatalogChart`](catalog-chart.md). The package is ESM (`"type": "module"`)
with an `exports` map and a `source` condition pointing at `src/index.ts`.

## Commands

```sh
pnpm nx build <library>    # tsc build -> dist/
pnpm nx test  <library>    # jest (per-kind specs + chart snapshot)
pnpm nx lint  <library>    # eslint, incl. @nx/dependency-checks
```

Once the library is documented, add it to [Libraries](../libraries/index.md)
and to the `nav` in `mkdocs.yml`.
