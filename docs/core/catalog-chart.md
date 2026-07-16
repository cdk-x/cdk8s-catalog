# CatalogChart

`CatalogChart` is the base class for the composition root of every catalog
library — the class each library exports as `new MetricServer(app, 'id')`,
`new ArgoCd(app, 'id')`, etc.

```ts
import { CatalogChart, CatalogChartProps, readCatalogLibraryInfo } from '@cdk-x/cdk8s-core';

export class MyThing extends CatalogChart {
  constructor(scope: Construct, id: string, props: MyThingProps = {}) {
    super(scope, id, {
      ...props,
      releaseName: props.releaseName ?? 'my-thing',
      catalogLibrary: readCatalogLibraryInfo(import.meta.url),
    });
    // ... compose sub-constructs
  }
}
```

## What it gives you

### Labels, for free

`CatalogChart` applies the Kubernetes
[recommended common labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
at the chart level. cdk8s automatically merges `Chart.labels` into every
`ApiObject`'s own `metadata.labels`, so every resource created under the
chart gets these without any extra work:

| Label | Source |
|---|---|
| `app.kubernetes.io/name` | `appName` prop, defaults to the construct `id` |
| `app.kubernetes.io/instance` | the resolved `releaseName` |
| `app.kubernetes.io/managed-by` | always `cdk8s` |
| `app.kubernetes.io/version` | `appVersion` prop, omitted if not set |
| `app.kubernetes.io/part-of` | `partOf` prop, omitted if not set |

If you pass `catalogLibrary` (typically
`readCatalogLibraryInfo(import.meta.url)`), two more labels — analogous to
Helm's `helm.sh/chart` — identify which catalog library and published
version produced the chart:

| Label | Meaning |
|---|---|
| `cdk8s-catalog/library-name` | e.g. `metric-server` |
| `cdk8s-catalog/library-version` | the published npm version |

Explicit `labels` passed in props always win over these computed defaults.

### `releaseName`

The Helm equivalent of `.Release.Name` / `fullnameOverride`. Defaults to the
construct `id`. `CatalogChart` injects it into the construct tree via
`node.setContext`, so any sub-construct reads it with:

```ts
const releaseName: string = this.node.tryGetContext('releaseName');
```

instead of it being threaded through every constructor.

There is deliberately no `CatalogChart.of(scope)`-style static accessor:
`CatalogChart extends Chart`, and `Chart` already declares
`static of(c: IConstruct): Chart`. jsii disallows a subclass static member
narrowing an inherited static's return type, so a `CatalogChart.of()`
returning `CatalogChart` can't be made jsii-compatible. Context sidesteps
this entirely since it doesn't touch the class's static surface at all.

### `context`

Arbitrary key/value context you want available to any descendant
construct, injected via `node.setContext` alongside `releaseName`:

```ts
new MyThing(app, 'id', {
  context: { environment: 'prod', region: 'eu-west-1' },
});

// in any sub-construct:
this.node.tryGetContext('environment'); // 'prod'
```

### Copying labels onto a pod template

Chart-level labels only land on top-level `ApiObject`s automatically — a
workload's embedded pod template (`spec.template.metadata`) is nested data,
not its own `ApiObject`, so it doesn't inherit them for free. `labels` is a
base `Chart` property (not `CatalogChart`-specific), so reach it via the
base, un-overridden `Chart.of(scope)` and copy them onto the pod template
yourself from a `Deployment`/`StatefulSet` construct:

```ts
import { Chart } from 'cdk8s';

const { labels } = Chart.of(this);
for (const [key, value] of Object.entries(labels)) {
  this.deployment.podMetadata.addLabel(key, value);
}
```

Without this, the running Pods would be missing every
`app.kubernetes.io/*` / catalog label that the workload resource itself has.

## `readCatalogLibraryInfo`

```ts
function readCatalogLibraryInfo(
  moduleUrl: string,
  relativePathToPackageJson = '../package.json',
): { name: string; version: string };
```

Reads `name`/`version` from a `package.json` resolved relative to
`moduleUrl` (pass `import.meta.url` from the calling module), stripping the
npm scope (`@cdk-x/`) from `name`. The default `../package.json` is correct
when called from the chart class one level under `src/`.
