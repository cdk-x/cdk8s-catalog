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
construct `id`. Sub-constructs read it via `CatalogChart.of(this).releaseName`
instead of it being threaded through every constructor.

### `addPodLabels(podMetadata)`

Chart-level labels only land on top-level `ApiObject`s automatically — a
workload's embedded pod template (`spec.template.metadata`) is nested data,
not its own `ApiObject`, so it doesn't inherit them for free. Call this from
a `Deployment`/`StatefulSet` construct to copy the chart's labels onto the
pod template:

```ts
CatalogChart.of(this).addPodLabels(this.deployment.podMetadata);
```

Without this, the running Pods would be missing every
`app.kubernetes.io/*` / catalog label that the workload resource itself has.

### `CatalogChart.of(scope)`

Walks up the construct tree from `scope` and returns the nearest
`CatalogChart` ancestor. Throws if none is found. Use it from a sub-construct
that needs the chart's `releaseName` or wants to call `addPodLabels`.

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
