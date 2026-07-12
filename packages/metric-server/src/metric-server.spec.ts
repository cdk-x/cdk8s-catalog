import { readCatalogLibraryInfo } from '@cdk-x/cdk8s-core';
import { Testing } from 'cdk8s';
import { MetricServer } from './metric-server.js';

describe('MetricServer', () => {
  const synthChart = () => {
    const app = Testing.app();
    const chart = new MetricServer(app, 'metric-server');
    return Testing.synth(chart);
  };

  it('composes the expected set of kinds', () => {
    const kinds = synthChart()
      .map((o) => o.kind)
      .sort();
    expect(kinds).toEqual(
      [
        'APIService',
        'ClusterRole',
        'ClusterRole',
        'ClusterRoleBinding',
        'ClusterRoleBinding',
        'Deployment',
        'RoleBinding',
        'Service',
        'ServiceAccount',
      ].sort(),
    );
  });

  it('runs in the kube-system namespace with the standard app.kubernetes.io labels', () => {
    const deployment = synthChart().find((o) => o.kind === 'Deployment');
    expect(deployment.metadata.namespace).toBe('kube-system');
    expect(deployment.metadata.labels['app.kubernetes.io/name']).toBe('metric-server');
    expect(deployment.metadata.labels['app.kubernetes.io/instance']).toBe('metric-server');
  });

  it('forwards deployment overrides from MetricServerProps', () => {
    const app = Testing.app();
    const chart = new MetricServer(app, 'metric-server', {
      deployment: { replicas: 3 },
    });

    const deployment = Testing.synth(chart).find(
      (o) => o.kind === 'Deployment',
    );
    expect(deployment.spec.replicas).toBe(3);
  });

  it('allows adding container args via chart.deployment.container.addArg', () => {
    const app = Testing.app();
    const chart = new MetricServer(app, 'metric-server');
    chart.deployment.container.addArg('kubelet-insecure-tls');
    const deployment = Testing.synth(chart).find(
      (o) => o.kind === 'Deployment',
    );
    expect(deployment.spec.template.spec.containers[0].args).toContain(
      '--kubelet-insecure-tls',
    );
  });

  it('stamps the cdk8s-catalog library name/version labels on every resource', () => {
    const { version } = readCatalogLibraryInfo(import.meta.url);
    const deployment = synthChart().find((o) => o.kind === 'Deployment');

    expect(deployment.metadata.labels['cdk8s-catalog/library-name']).toBe(
      'metric-server',
    );
    expect(deployment.metadata.labels['cdk8s-catalog/library-version']).toBe(
      version,
    );
  });

  it('matches the manifest snapshot', () => {
    expect(synthChart()).toMatchSnapshot();
  });
});
