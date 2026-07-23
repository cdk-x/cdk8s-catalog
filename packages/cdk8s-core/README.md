# @cdk-x/cdk8s-core

[![npm version](https://img.shields.io/npm/v/@cdk-x/cdk8s-core.svg)](https://www.npmjs.com/package/@cdk-x/cdk8s-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Part of the [cdk8s Catalog](https://cdk-x.github.io/cdk8s-catalog/) — a
catalog of reusable, Helm-like [cdk8s](https://cdk8s.io) constructs for
Kubernetes.

`@cdk-x/cdk8s-core` is the shared foundation every catalog library is built
on. It doesn't model any specific application — it provides the handful of
things every library needs so they don't each reinvent them:

- **`CatalogChart`** — a `Chart` subclass that applies the Kubernetes
  [recommended common labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
  and catalog-specific labels to every resource in the chart, and carries a
  `releaseName` (the cdk8s equivalent of Helm's `.Release.Name`).
- **`readCatalogLibraryInfo(import.meta.url)`** — reads `{ name, version }`
  from the calling library's own `package.json`, used to stamp
  `cdk8s-catalog/library-name` / `cdk8s-catalog/library-version` labels
  automatically.

Available for TypeScript/JavaScript (npm), Python (PyPI), Java (Maven),
.NET (NuGet), and Go, via [jsii](https://github.com/aws/jsii).

## Installing

```sh
npm install @cdk-x/cdk8s-core
```

You won't normally install this directly — it's a dependency of every
catalog library and comes along for the ride.

See the [full documentation](https://cdk-x.github.io/cdk8s-catalog/cdk8s-core/)
for `CatalogChart` usage and the pattern every catalog library follows.
