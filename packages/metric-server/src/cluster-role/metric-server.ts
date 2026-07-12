import { ApiResource, ClusterRole } from 'cdk8s-plus-34';
import { Construct } from 'constructs';

export class MetricServerClusterRole extends Construct {
  public readonly clusterRole: ClusterRole;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.clusterRole = new ClusterRole(this, 'ClusterRole', {
      metadata: { name: 'system:metrics-server' },
    });

    this.clusterRole.allow(
      ['get'],
      ApiResource.custom({ apiGroup: '', resourceType: 'nodes/metrics' }),
    );

    this.clusterRole.allow(
      ['get', 'list', 'watch'],
      ApiResource.PODS,
      ApiResource.NODES,
    );
  }
}
