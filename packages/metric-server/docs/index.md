# Metric Server

--8<-- "packages/metric-server/docs/_compat.md"

`@cdk-x/metric-server` deploys the Kubernetes
[metrics-server](https://github.com/kubernetes-sigs/metrics-server) — the
`ServiceAccount`, RBAC (`ClusterRole`s/`ClusterRoleBinding`s/`RoleBinding`),
`Deployment`, `Service`, and `APIService` it needs to serve
`metrics.k8s.io`, wired together with sensible defaults.

## Installing

```sh
npm install @cdk-x/metric-server
```

## Usage

```ts
import { App } from 'cdk8s';
import { MetricServer } from '@cdk-x/metric-server';

const app = new App();
new MetricServer(app, 'MetricServer');
app.synth();
```

By default it deploys into the `kube-system` namespace with a release name
of `metric-server`. Override the `Deployment` (image, replicas, resources,
probes, args):

```ts
new MetricServer(app, 'MetricServer', {
  deployment: {
    replicas: 2,
    image: { registry: 'my-registry.example.com' },
  },
});
```

`image` is split into `registry`/`repository`/`tag`, each individually
overridable, rather than one full image string — the common case (pointing
at a private registry/mirror) only needs `registry`; `repository` and `tag`
keep their defaults (`registry.k8s.io/metrics-server/metrics-server:v0.8.0`).

## What it creates

| Construct | Kind | Purpose |
|---|---|---|
| `serviceAccount` | `ServiceAccount` | Identity the pods run as |
| `deployment` | `Deployment` | The metrics-server pod(s) |
| `service` | `Service` | Fronts the Deployment for the APIService |
| `apiService` | `APIService` | Registers `metrics.k8s.io` with the API aggregation layer |
| — | `ClusterRole` × 2 | `system:aggregated-metrics-reader`, metrics-server's own reader role |
| — | `ClusterRoleBinding` × 2 | Binds the above + `system:auth-delegator` |
| — | `RoleBinding` | `extension-apiserver-authentication-reader` in `kube-system` |

Every sub-construct is exposed as a `public readonly` field on `MetricServer`
so you can extend it after construction, e.g.
`metricServer.deployment.container.addArgs({ 'kubelet-insecure-tls': '' })`.
See [CatalogChart](https://cdk-x.github.io/cdk8s-catalog/core/catalog-chart/)
and [Building a library](https://cdk-x.github.io/cdk8s-catalog/core/building-a-library/)
in the main catalog docs for the labels every resource here gets
automatically and the escape-hatch pattern used throughout.
