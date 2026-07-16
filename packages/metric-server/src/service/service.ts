import { IPodSelector, Protocol, Service } from 'cdk8s-plus-34';
import { Construct } from 'constructs';
import { METRICS_SERVER_SECURE_PORT } from '../container/index.js';

export interface MetricServerServiceProps {
  /** Pods this Service routes to (typically the metrics-server Deployment). */
  readonly selector: IPodSelector;
  /**
   * Service port. The APIService reaches the metrics-server over this port.
   * @default 443
   */
  readonly port?: number;
  /**
   * Container port to route to.
   * @default METRICS_SERVER_SECURE_PORT (10250)
   */
  readonly targetPort?: number;
}

/**
 * The Service fronting the metrics-server pods. Exposes port 443 and routes to
 * the container's secure port (10250) so the APIService can reach it.
 */
export class MetricServerService extends Construct {
  /** The underlying cdk8s-plus Service (escape hatch). */
  public readonly service: Service;

  constructor(scope: Construct, id: string, props: MetricServerServiceProps) {
    super(scope, id);

    const releaseName: string = this.node.tryGetContext('releaseName');
    this.service = new Service(this, 'Service', {
      metadata: { name: releaseName },
    });

    this.service.bind(props.port ?? 443, {
      protocol: Protocol.TCP,
      name: 'https',
      targetPort: props.targetPort ?? METRICS_SERVER_SECURE_PORT,
    });

    this.service.select(props.selector);
  }
}
