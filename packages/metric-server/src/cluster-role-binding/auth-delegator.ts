import { ClusterRole, ClusterRoleBinding } from 'cdk8s-plus-34';
import { Construct } from 'constructs';

export class AuthDelegatorClusterRoleBinding extends Construct {
  public readonly clusterRoleBinding: ClusterRoleBinding;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.clusterRoleBinding = new ClusterRoleBinding(
      this,
      'ClusterRoleBinding',
      {
        metadata: { name: 'metrics-server:system:auth-delegator' },
        role: ClusterRole.fromClusterRoleName(
          this,
          'Role',
          'system:auth-delegator',
        ),
      },
    );
  }
}
