# cdk8s Catalog

A catalog of reusable, Helm-like [cdk8s](https://cdk8s.io) constructs for
Kubernetes. Every library in the catalog is a small, focused cdk8s chart —
one npm package per application (`@cdk-x/metric-server`, `@cdk-x/argocd`,
...) — built on a shared foundation ([`@cdk-x/cdk8s-core`](libraries/cdk8s-core/))
so they all look and behave the same way.

## Why a catalog

- **One package per app.** Each library deploys exactly one application
  (metrics-server, ArgoCD, ...) with sensible defaults, not a generic
  "Kubernetes resources" toolkit.
- **Helm-like customization.** Every construct exposes grouped props with
  defaults, fluent `addXxx()` methods for collections, and an
  always-available escape hatch (`apiObject.addJsonPatch(...)`) for
  anything not modeled.
- **Consistent labeling.** Every resource gets the Kubernetes
  [recommended common labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
  plus catalog-specific `cdk8s-catalog/library-name`/`-version` labels, for
  free, via [`CatalogChart`](libraries/cdk8s-core/catalog-chart/).
- **jsii, so pick your language.** Every library publishes to npm, PyPI,
  Maven, NuGet, and Go — use it from TypeScript, Python, Java, C#, or Go.

## Where to start

<div class="grid cards" markdown>

- **[Libraries](libraries/index.md)**

  The published libraries themselves — what they deploy, how to install and
  use them, and their full API reference in your language of choice.

- **[Building a library](building-a-library.md)**

  Contributing a new library to the catalog? The pattern every library
  follows (folder layout, construct design, testing).

</div>

## Versioning

This catalog-level site (Home, Building a library, Libraries index) is
evergreen — it always reflects `main`. Each library has its own versioned
docs site instead (version selector in its own header), since a library's
major version tracks the Kubernetes generation it targets (e.g. `1.x.x` for
Kubernetes 1.34, `2.x.x` for 1.35, ...) and libraries release independently
of each other.
