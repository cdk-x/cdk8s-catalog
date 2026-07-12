import { CatalogChart, CommonLabels } from '@cdk-x/cdk8s-core';
import {
  Deployment,
  DeploymentStrategy,
  LabeledNode,
  NodeLabelQuery,
  PercentOrAbsolute,
  ServiceAccount,
} from 'cdk8s-plus-34';
import { Construct } from 'constructs';
import {
  METRICS_SERVER_SECURE_PORT,
  MetricServerContainer,
  MetricServerContainerProps,
} from '../container/index.js';

export interface MetricServerDeploymentProps extends MetricServerContainerProps {
  /** Service account the pods run as. */
  readonly serviceAccount: ServiceAccount;
  /**
   * Number of replicas.
   * @default 1
   */
  readonly replicas?: number;
  /**
   * Deployment update strategy.
   * @default rollingUpdate with maxUnavailable=0
   */
  readonly strategy?: DeploymentStrategy;
}

/**
 * The metrics-server Deployment.
 *
 * Composes a {@link MetricServerContainer} with a cdk8s-plus `Deployment`,
 * applying `replicas`/`strategy` and default node scheduling. For anything
 * not modelled here, use the exposed {@link container} and {@link deployment}
 * escape hatches (e.g. `container.container.mount(...)`,
 * `deployment.scheduling.tolerate(...)`).
 */
export class MetricServerDeployment extends Construct {
  /** The underlying cdk8s-plus Deployment (escape hatch for advanced tweaks). */
  public readonly deployment: Deployment;
  /** The metrics-server container, configurable independently (e.g. `container.addArg(...)`). */
  public readonly container: MetricServerContainer;
  /** The container's secure port, exposed so the Service can target it. */
  public readonly securePort = METRICS_SERVER_SECURE_PORT;

  constructor(
    scope: Construct,
    id: string,
    props: MetricServerDeploymentProps,
  ) {
    super(scope, id);
    const { releaseName } = CatalogChart.of(this);

    this.container = new MetricServerContainer(this, 'Container', {
      image: props.image,
      imagePullPolicy: props.imagePullPolicy,
      resources: props.resources,
      probes: props.probes,
      args: props.args,
    });

    this.deployment = new Deployment(this, 'Deployment', {
      metadata: { name: releaseName },
      strategy:
        props.strategy ??
        DeploymentStrategy.rollingUpdate({
          maxUnavailable: PercentOrAbsolute.absolute(0),
        }),
      replicas: props.replicas ?? 1,
      serviceAccount: props.serviceAccount,
    });
    this.deployment.attachContainer(this.container.container);
    this.deployment.metadata.addLabel(CommonLabels.COMPONENT, 'metrics-server');
    this.deployment.podMetadata.addLabel(CommonLabels.COMPONENT, 'metrics-server');

    this.deployment.scheduling.attract(
      new LabeledNode([NodeLabelQuery.is('kubernetes.io/os', 'linux')]),
    );
  }
}
