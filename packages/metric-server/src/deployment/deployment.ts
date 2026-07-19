import { CommonLabels } from '@cdk-x/cdk8s-core';
import { Chart } from 'cdk8s';
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

/**
 * {@link MetricServerDeploymentProps} minus {@link MetricServerDeploymentProps.serviceAccount}
 * — split out (instead of `Omit<MetricServerDeploymentProps, 'serviceAccount'>`) because jsii
 * can't represent computed/mapped types like `Omit` in the public API.
 */
export interface MetricServerDeploymentOptions extends MetricServerContainerProps {
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

export interface MetricServerDeploymentProps extends MetricServerDeploymentOptions {
  /** Service account the pods run as. */
  readonly serviceAccount: ServiceAccount;
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
    const releaseName: string = this.node.tryGetContext('releaseName');

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
      // The pod-level setting defaults to false and overrides the
      // ServiceAccount's own automountToken - metrics-server needs its SA
      // token mounted to authenticate to the API server.
      automountServiceAccountToken: true,
    });
    this.deployment.attachContainer(this.container.container);
    this.deployment.metadata.addLabel(CommonLabels.COMPONENT, 'metrics-server');
    const { labels } = Chart.of(this);
    for (const [key, value] of Object.entries(labels)) {
      this.deployment.podMetadata.addLabel(key, value);
    }
    this.deployment.podMetadata.addLabel(CommonLabels.COMPONENT, 'metrics-server');

    this.deployment.scheduling.attract(
      new LabeledNode([NodeLabelQuery.is('kubernetes.io/os', 'linux')]),
    );
  }
}
