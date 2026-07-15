# Libraries

Each library is an independently versioned npm package that deploys one
application onto Kubernetes, built on [`CatalogChart`](../core/catalog-chart.md).
Each library has its own docs site with its own version selector — a
library's major version tracks the Kubernetes generation it targets (e.g.
`1.x.x` for Kubernetes 1.34, `2.x.x` for 1.35, ...).

| Library | Package | Deploys |
|---|---|---|
| [Metric Server](metric-server/) | `@cdk-x/metric-server` | [metrics-server](https://github.com/kubernetes-sigs/metrics-server) |

New to the catalog? See [Building a library](../core/building-a-library.md)
for the pattern every library follows.
