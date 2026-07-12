import { CatalogChart } from '@cdk-x/cdk8s-core';
import { ServiceAccount } from 'cdk8s-plus-34';
import { Construct } from 'constructs';

/**
 * The ServiceAccount the metrics-server pods run as, and the RBAC subject the
 * cluster role bindings are attached to.  The name is taken from the enclosing
 * CatalogChart's releaseName.
 */
export class MetricServerServiceAccount extends Construct {
  /** The underlying cdk8s-plus ServiceAccount (escape hatch / RBAC subject). */
  public readonly serviceAccount: ServiceAccount;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const { releaseName } = CatalogChart.of(this);
    this.serviceAccount = new ServiceAccount(this, 'ServiceAccount', {
      metadata: { name: releaseName },
      // metrics-server authenticates to the API server using its own SA
      // token (delegated authentication) - without it, the pod panics with
      // "failed to get delegated authentication kubeconfig" on startup.
      automountToken: true,
    });
  }
}
