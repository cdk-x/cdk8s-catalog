# cdk8s Catalog

A catalog of reusable, Helm-like [cdk8s](https://cdk8s.io) constructs for
Kubernetes. Every library in the catalog is a small, focused cdk8s chart —
one npm package per application (`@cdk-x/metric-server`, `@cdk-x/argocd`,
...) — built on a shared foundation (`@cdk-x/cdk8s-core`) so they all look
and behave the same way.

## Where to start

<div class="grid cards" markdown>

- **[Core](core/index.md)**

  What every library is built on: `CatalogChart`, common Kubernetes labels,
  and the pattern to follow when authoring a new library.

- **[Libraries](libraries/index.md)**

  The published libraries themselves — what they deploy and how to use
  them.

</div>

## Kubernetes compatibility

The version selector in the header tracks the **Kubernetes version** the
catalog targets, not the version of any individual library — every library
in a given docs version is built against that same `cdk8s-plus` release.
Each library keeps its own semver release history, published once the
first release runs.
