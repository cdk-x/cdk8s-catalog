# cdk8s Catalog

[![CI](https://github.com/cdk-x/cdk8s-catalog/actions/workflows/ci.yml/badge.svg)](https://github.com/cdk-x/cdk8s-catalog/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docs](https://img.shields.io/badge/docs-mkdocs--material-blue)](https://cdk-x.github.io/cdk8s-catalog/)
[![Built with Nx](https://img.shields.io/badge/built%20with-Nx-143157?logo=nx)](https://nx.dev)

A catalog of reusable, Helm-like [cdk8s](https://cdk8s.io) constructs for
Kubernetes — each library deploys one application (metrics-server, and more
to come), fully typed, tested, and versioned independently.

Every library is available in TypeScript/JavaScript, Python, Java, .NET, and
Go, published via [jsii](https://github.com/aws/jsii) from a single
TypeScript source.

📖 **[Full documentation](https://cdk-x.github.io/cdk8s-catalog/)**

## Libraries

| Library | Package | Deploys |
|---|---|---|
| [cdk8s Core](https://cdk-x.github.io/cdk8s-catalog/cdk8s-core/) | [`@cdk-x/cdk8s-core`](https://www.npmjs.com/package/@cdk-x/cdk8s-core) | Shared foundation every library builds on — not deployed on its own |
| [Metric Server](https://cdk-x.github.io/cdk8s-catalog/metric-server/) | [`@cdk-x/metric-server`](https://www.npmjs.com/package/@cdk-x/metric-server) | [metrics-server](https://github.com/kubernetes-sigs/metrics-server) |

## Quick start

```sh
npm install @cdk-x/metric-server
```

```ts
import { App } from 'cdk8s';
import { MetricServer } from '@cdk-x/metric-server';

const app = new App();
new MetricServer(app, 'MetricServer');
app.synth();
```

Each library's own docs page has the full API reference, configuration
options, and equivalent examples in Python, Java, .NET, and Go.

## Contributing

New to the catalog? See
[Building a library](https://cdk-x.github.io/cdk8s-catalog/building-a-library/)
for the folder layout, construct design, and testing pattern every library
follows. This is an [Nx](https://nx.dev) monorepo — use `nx run`, `nx run-many`,
or `nx affected` to build, lint, and test.

## License

[MIT](https://opensource.org/licenses/MIT)
