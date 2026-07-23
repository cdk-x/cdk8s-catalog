# cdk8s Core

--8<-- "packages/cdk8s-core/docs/_compat.md"

--8<-- "packages/cdk8s-core/docs/_lang-switcher.md"

`@cdk-x/cdk8s-core` is the shared foundation every catalog library is built
on. It doesn't model any specific application — it provides the handful of
things every library needs so they don't each reinvent them:

- **[`CatalogChart`](catalog-chart.md)** — a `Chart` subclass that applies the
  Kubernetes [recommended common labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
  and catalog-specific labels to every resource in the chart, and carries a
  `releaseName` (the cdk8s equivalent of Helm's `.Release.Name`).
- **`readCatalogLibraryInfo(import.meta.url)`** — reads `{ name, version }`
  from the calling library's own `package.json`, used to stamp
  `cdk8s-catalog/library-name` / `cdk8s-catalog/library-version` labels
  automatically.

## Installing

```sh
npm install @cdk-x/cdk8s-core
```

You won't normally install this directly — it's a dependency of every
catalog library and comes along for the ride.

## Authoring a new library

See [Building a library](https://cdk-x.github.io/cdk8s-catalog/building-a-library/)
in the main catalog docs for the full pattern (folder layout, construct
design, testing) that every library in this catalog follows.
