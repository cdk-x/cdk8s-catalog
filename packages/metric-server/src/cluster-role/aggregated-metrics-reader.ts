import { ApiResource, ClusterRole } from 'cdk8s-plus-34';
import { Construct } from 'constructs';

export class AggregatedMetricsReaderClusterRole extends Construct {
  public readonly clusterRole: ClusterRole;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.clusterRole = new ClusterRole(this, 'ClusterRole', {
      metadata: {
        name: 'system:aggregated-metrics-reader',
        labels: {
          'rbac.authorization.k8s.io/aggregate-to-admin': 'true',
          'rbac.authorization.k8s.io/aggregate-to-edit': 'true',
          'rbac.authorization.k8s.io/aggregate-to-view': 'true',
        },
      },
    });

    this.clusterRole.allow(
      ['get', 'list', 'watch'],
      ApiResource.custom({ apiGroup: 'metrics.k8s.io', resourceType: 'pods' }),
      ApiResource.custom({ apiGroup: 'metrics.k8s.io', resourceType: 'nodes' }),
    );
  }
}
