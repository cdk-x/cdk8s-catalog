import { CatalogChart } from '@cdk-x/cdk8s-core';
import { Testing } from 'cdk8s';
import { MetricServerServiceAccount } from './service-account.js';

describe('MetricServerServiceAccount', () => {
  const synth = (releaseName = 'metric-server') => {
    const chart = new CatalogChart(Testing.app(), 'testing', { releaseName });
    new MetricServerServiceAccount(chart, 'ServiceAccount');
    return Testing.synth(chart).find((o) => o.kind === 'ServiceAccount');
  };

  it('defaults the name to metric-server', () => {
    expect(synth().metadata.name).toBe('metric-server');
  });

  it('honours a custom releaseName', () => {
    expect(synth('custom-sa').metadata.name).toBe('custom-sa');
  });

  it('matches snapshot', () => {
    const chart = new CatalogChart(Testing.app(), 'testing', {
      releaseName: 'metric-server',
      namespace: 'kube-system',
    });
    new MetricServerServiceAccount(chart, 'ServiceAccount');
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
