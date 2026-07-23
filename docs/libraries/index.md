# Libraries

Each library is an independently versioned npm package that deploys one
application onto Kubernetes, built on
[`CatalogChart`](cdk8s-core/catalog-chart/). Each library has its own docs
site with its own version selector — a library's major version tracks the
Kubernetes generation it targets (e.g. `1.x.x` for Kubernetes 1.34, `2.x.x`
for 1.35, ...).

| Library | Package | Deploys |
|---|---|---|
| [cdk8s Core](cdk8s-core/) | `@cdk-x/cdk8s-core` | Shared foundation every library builds on — not deployed on its own |
| [Metric Server](metric-server/) | `@cdk-x/metric-server` | [metrics-server](https://github.com/kubernetes-sigs/metrics-server) |

New to the catalog? See [Building a library](../building-a-library.md)
for the pattern every library follows.
