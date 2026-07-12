import { CatalogChart } from '@cdk-x/cdk8s-core';
import { ApiObject } from 'cdk8s';
import { Construct } from 'constructs';

/**
 * Registers `v1beta1.metrics.k8s.io` with the Kubernetes API aggregation layer,
 * pointing it at the metrics-server Service.  Service name and namespace are
 * taken from the enclosing CatalogChart.
 */
export class MetricServerApiService extends Construct {
  /** The underlying APIService ApiObject (escape hatch). */
  public readonly apiService: ApiObject;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const catalogChart = CatalogChart.of(this);
    this.apiService = new ApiObject(this, 'APIService', {
      apiVersion: 'apiregistration.k8s.io/v1',
      kind: 'APIService',
      metadata: {
        name: 'v1beta1.metrics.k8s.io',
      },
      spec: {
        group: 'metrics.k8s.io',
        groupPriorityMinimum: 100,
        insecureSkipTLSVerify: true,
        service: {
          name: catalogChart.releaseName,
          namespace: catalogChart.namespace,
        },
        version: 'v1beta1',
        versionPriority: 100,
      },
    });
  }
}
