import { Role, RoleBinding } from 'cdk8s-plus-34';
import { Construct } from 'constructs';

export class AuthReaderRoleBinding extends Construct {
  public readonly roleBinding: RoleBinding;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.roleBinding = new RoleBinding(this, 'RoleBinding', {
      metadata: { name: 'metrics-server-auth-reader' },
      role: Role.fromRoleName(this, 'Role', 'extension-apiserver-authentication-reader'),
    });
  }
}
