import { ApiObjectMetadataDefinition, Chart, ChartProps } from 'cdk8s';
import { Construct, IConstruct } from 'constructs';
import { CatalogLibraryInfo } from './package-info.js';

/**
 * Kubernetes recommended common label keys.
 * @see https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
 */
export const CommonLabels = {
  NAME: 'app.kubernetes.io/name',
  INSTANCE: 'app.kubernetes.io/instance',
  VERSION: 'app.kubernetes.io/version',
  COMPONENT: 'app.kubernetes.io/component',
  PART_OF: 'app.kubernetes.io/part-of',
  MANAGED_BY: 'app.kubernetes.io/managed-by',
} as const;

/**
 * Labels specific to the @cdk-x cdk8s-catalog, identifying which catalog
 * library (and published version) defines a chart — analogous to Helm's
 * `helm.sh/chart`.
 */
export const CatalogLabels = {
  LIBRARY_NAME: 'cdk8s-catalog/library-name',
  LIBRARY_VERSION: 'cdk8s-catalog/library-version',
} as const;

export interface CatalogChartProps extends ChartProps {
  /**
   * A stable name for all resources in this chart — equivalent to
   * Helm's .Release.Name / fullnameOverride.  Defaults to the construct id.
   */
  readonly releaseName?: string;
  /**
   * app.kubernetes.io/name — the generic name of the application.
   * @default the construct id (same default as releaseName)
   */
  readonly appName?: string;
  /**
   * app.kubernetes.io/version — the current version of the application.
   * @default omitted when not provided
   */
  readonly appVersion?: string;
  /**
   * app.kubernetes.io/part-of — name of a higher-level application this chart is part of.
   * @default omitted when not provided
   */
  readonly partOf?: string;
  /**
   * The specific @cdk-x catalog library (name + version) that defines this
   * chart. Typically `readCatalogLibraryInfo(import.meta.url)` called from the
   * root chart class.
   * @default omitted when not provided
   */
  readonly catalogLibrary?: CatalogLibraryInfo;
}

/**
 * Base class for all catalog charts. Carries a `releaseName` that sub-constructs
 * can read via `CatalogChart.of(this).releaseName` instead of threading it through
 * every constructor prop.
 *
 * Also applies the Kubernetes recommended common labels ({@link CommonLabels}) at
 * the chart level — cdk8s merges `Chart.labels` into every `ApiObject`'s own
 * `metadata.labels` automatically, so every resource under this chart gets them
 * for free. `app.kubernetes.io/component` is deliberately not included here since
 * it varies per resource — add it directly on the resource that needs it via
 * `metadata.addLabel(CommonLabels.COMPONENT, ...)`.
 */
export class CatalogChart extends Chart {
  /** Release name that propagates to all sub-constructs in this chart. */
  public readonly releaseName: string;

  constructor(scope: Construct, id: string, props: CatalogChartProps = {}) {
    const {
      releaseName,
      appName,
      appVersion,
      partOf,
      catalogLibrary,
      labels,
      ...chartProps
    } = props;
    const resolvedReleaseName = releaseName ?? id;

    super(scope, id, {
      ...chartProps,
      labels: {
        [CommonLabels.NAME]: appName ?? id,
        [CommonLabels.INSTANCE]: resolvedReleaseName,
        [CommonLabels.MANAGED_BY]: 'cdk8s',
        ...(appVersion ? { [CommonLabels.VERSION]: appVersion } : {}),
        ...(partOf ? { [CommonLabels.PART_OF]: partOf } : {}),
        ...(catalogLibrary
          ? {
              [CatalogLabels.LIBRARY_NAME]: catalogLibrary.name,
              [CatalogLabels.LIBRARY_VERSION]: catalogLibrary.version,
            }
          : {}),
        ...labels, // explicit labels always win over the computed defaults
      },
    });
    this.releaseName = resolvedReleaseName;
  }

  /**
   * Copies this chart's common labels onto a pod template's metadata (e.g.
   * `deployment.podMetadata`, `statefulSet.podMetadata`).
   *
   * cdk8s only merges `Chart.labels` into each `ApiObject`'s own
   * `metadata.labels` automatically. A workload's embedded pod template
   * (`spec.template.metadata`) isn't a separate `ApiObject` - it's nested
   * data inside the workload's own spec - so it never receives the chart's
   * labels for free. Without this, the running Pods end up missing every
   * `app.kubernetes.io/*` / catalog label that the workload resource itself
   * has, even though they're both "in" the same chart.
   */
  public addPodLabels(podMetadata: ApiObjectMetadataDefinition): void {
    for (const [key, value] of Object.entries(this.labels)) {
      podMetadata.addLabel(key, value);
    }
  }

  /**
   * Returns the nearest {@link CatalogChart} ancestor in the construct tree,
   * starting from `scope` itself.  Throws if no ancestor is found.
   */
  static override of(scope: IConstruct): CatalogChart {
    let current: IConstruct | undefined = scope;
    while (current) {
      if (current instanceof CatalogChart) {
        return current as CatalogChart;
      }
      current = current.node.scope;
    }
    throw new Error(
      `No CatalogChart ancestor found for construct at path: ${scope.node.path}`,
    );
  }
}
