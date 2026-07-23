# @cdk-x/metric-server

[![npm version](https://img.shields.io/npm/v/@cdk-x/metric-server.svg)](https://www.npmjs.com/package/@cdk-x/metric-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Part of the [cdk8s Catalog](https://cdk-x.github.io/cdk8s-catalog/) — a
catalog of reusable, Helm-like [cdk8s](https://cdk8s.io) constructs for
Kubernetes.

`@cdk-x/metric-server` deploys the Kubernetes
[metrics-server](https://github.com/kubernetes-sigs/metrics-server) — the
`ServiceAccount`, RBAC, `Deployment`, `Service`, and `APIService` it needs to
serve `metrics.k8s.io`, wired together with sensible defaults.

Available for TypeScript/JavaScript (npm), Python (PyPI), Java (Maven),
.NET (NuGet), and Go, via [jsii](https://github.com/aws/jsii).

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

See the [full documentation](https://cdk-x.github.io/cdk8s-catalog/metric-server/)
for configuration options, the resources this construct creates, and API
reference in every supported language.
