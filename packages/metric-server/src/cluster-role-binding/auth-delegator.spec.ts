import { Testing } from 'cdk8s';
import { ServiceAccount } from 'cdk8s-plus-34';
import { AuthDelegatorClusterRoleBinding } from './auth-delegator.js';

describe('AuthDelegatorClusterRoleBinding', () => {
  it('creates the binding with name metrics-server:system:auth-delegator', () => {
    const chart = Testing.chart();
    new AuthDelegatorClusterRoleBinding(chart, 'Binding');

    const binding = Testing.synth(chart).find((o) => o.kind === 'ClusterRoleBinding');
    expect(binding.metadata.name).toBe('metrics-server:system:auth-delegator');
  });

  it('references the system:auth-delegator role', () => {
    const chart = Testing.chart();
    new AuthDelegatorClusterRoleBinding(chart, 'Binding');

    const binding = Testing.synth(chart).find((o) => o.kind === 'ClusterRoleBinding');
    expect(binding.roleRef.name).toBe('system:auth-delegator');
  });

  it('allows adding subjects after construction', () => {
    const chart = Testing.chart();
    const sa = new ServiceAccount(chart, 'SA', { metadata: { name: 'metric-server' } });
    const binding = new AuthDelegatorClusterRoleBinding(chart, 'Binding');
    binding.clusterRoleBinding.addSubjects(sa);

    const synth = Testing.synth(chart).find((o) => o.kind === 'ClusterRoleBinding');
    expect(synth.subjects[0].kind).toBe('ServiceAccount');
    expect(synth.subjects[0].name).toBe('metric-server');
  });

  it('matches snapshot', () => {
    const chart = Testing.chart();
    new AuthDelegatorClusterRoleBinding(chart, 'Binding');
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
