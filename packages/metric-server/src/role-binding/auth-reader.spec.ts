import { Testing } from 'cdk8s';
import { ServiceAccount } from 'cdk8s-plus-34';
import { AuthReaderRoleBinding } from './auth-reader.js';

describe('AuthReaderRoleBinding', () => {
  it('creates the binding with name metrics-server-auth-reader', () => {
    const chart = Testing.chart();
    new AuthReaderRoleBinding(chart, 'Binding');

    const binding = Testing.synth(chart).find((o) => o.kind === 'RoleBinding');
    expect(binding.metadata.name).toBe('metrics-server-auth-reader');
  });

  it('references the extension-apiserver-authentication-reader role', () => {
    const chart = Testing.chart();
    new AuthReaderRoleBinding(chart, 'Binding');

    const binding = Testing.synth(chart).find((o) => o.kind === 'RoleBinding');
    expect(binding.roleRef.name).toBe('extension-apiserver-authentication-reader');
  });

  it('allows adding subjects after construction', () => {
    const chart = Testing.chart();
    const sa = new ServiceAccount(chart, 'SA', { metadata: { name: 'metric-server' } });
    const binding = new AuthReaderRoleBinding(chart, 'Binding');
    binding.roleBinding.addSubjects(sa);

    const synth = Testing.synth(chart).find((o) => o.kind === 'RoleBinding');
    expect(synth.subjects[0].kind).toBe('ServiceAccount');
    expect(synth.subjects[0].name).toBe('metric-server');
  });

  it('matches snapshot', () => {
    const chart = Testing.chart();
    new AuthReaderRoleBinding(chart, 'Binding');
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
