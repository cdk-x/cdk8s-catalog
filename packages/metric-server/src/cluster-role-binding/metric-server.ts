import { ClusterRoleBinding } from 'cdk8s-plus-34';
import { Construct } from 'constructs';
import { MetricServerClusterRole } from '../cluster-role/index.js';

export class MetricServerClusterRoleBinding extends Construct {
  public readonly clusterRoleBinding: ClusterRoleBinding;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const role = new MetricServerClusterRole(this, 'Role');

    this.clusterRoleBinding = new ClusterRoleBinding(this, 'ClusterRoleBinding', {
      metadata: { name: 'system:metrics-server' },
      role: role.clusterRole,
    });
  }
}
