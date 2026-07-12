import { CatalogChart } from '@cdk-x/cdk8s-core';
import { Testing } from 'cdk8s';
import { MetricServerApiService } from './api-service.js';

describe('MetricServerApiService', () => {
  const synth = (releaseName = 'metric-server', namespace = 'kube-system') => {
    const chart = new CatalogChart(Testing.app(), 'testing', { releaseName, namespace });
    new MetricServerApiService(chart, 'APIService');
    return Testing.synth(chart).find((o) => o.kind === 'APIService');
  };

  it('registers v1beta1.metrics.k8s.io against the chart namespace', () => {
    const apiService = synth();
    expect(apiService.metadata.name).toBe('v1beta1.metrics.k8s.io');
    expect(apiService.spec.group).toBe('metrics.k8s.io');
    expect(apiService.spec.version).toBe('v1beta1');
    expect(apiService.spec.service.name).toBe('metric-server');
    expect(apiService.spec.service.namespace).toBe('kube-system');
  });

  it('honours a custom releaseName and namespace via the chart', () => {
    const apiService = synth('ms', 'monitoring');
    expect(apiService.spec.service.name).toBe('ms');
    expect(apiService.spec.service.namespace).toBe('monitoring');
  });

  it('matches snapshot', () => {
    const chart = new CatalogChart(Testing.app(), 'testing', {
      releaseName: 'metric-server',
      namespace: 'kube-system',
    });
    new MetricServerApiService(chart, 'APIService');
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
