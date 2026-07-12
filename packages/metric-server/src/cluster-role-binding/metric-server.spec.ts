import { Testing } from 'cdk8s';
import { ServiceAccount } from 'cdk8s-plus-34';
import { MetricServerClusterRoleBinding } from './metric-server.js';

describe('MetricServerClusterRoleBinding', () => {
  it('creates the binding with name system:metrics-server', () => {
    const chart = Testing.chart();
    new MetricServerClusterRoleBinding(chart, 'Binding');

    const binding = Testing.synth(chart).find((o) => o.kind === 'ClusterRoleBinding');
    expect(binding.metadata.name).toBe('system:metrics-server');
  });

  it('references the system:metrics-server cluster role', () => {
    const chart = Testing.chart();
    new MetricServerClusterRoleBinding(chart, 'Binding');

    const binding = Testing.synth(chart).find((o) => o.kind === 'ClusterRoleBinding');
    expect(binding.roleRef.name).toBe('system:metrics-server');
  });

  it('allows adding subjects after construction', () => {
    const chart = Testing.chart();
    const sa = new ServiceAccount(chart, 'SA', { metadata: { name: 'metric-server' } });
    const binding = new MetricServerClusterRoleBinding(chart, 'Binding');
    binding.clusterRoleBinding.addSubjects(sa);

    const synth = Testing.synth(chart).find((o) => o.kind === 'ClusterRoleBinding');
    expect(synth.subjects[0].kind).toBe('ServiceAccount');
    expect(synth.subjects[0].name).toBe('metric-server');
  });

  it('matches snapshot', () => {
    const chart = Testing.chart();
    new MetricServerClusterRoleBinding(chart, 'Binding');
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
