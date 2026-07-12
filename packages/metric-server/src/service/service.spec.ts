import { CatalogChart } from '@cdk-x/cdk8s-core';
import { Testing } from 'cdk8s';
import { ServiceAccount } from 'cdk8s-plus-34';
import { MetricServerDeployment } from '../deployment/index.js';
import { MetricServerService } from './service.js';

describe('MetricServerService', () => {
  const synthService = () => {
    const chart = new CatalogChart(Testing.app(), 'testing', { releaseName: 'metric-server', namespace: 'kube-system' });
    const serviceAccount = new ServiceAccount(chart, 'ServiceAccount', {
      metadata: { name: 'metric-server' },
    });
    const deployment = new MetricServerDeployment(chart, 'Deployment', { serviceAccount });
    new MetricServerService(chart, 'Service', { selector: deployment.deployment });
    return Testing.synth(chart).find((o) => o.kind === 'Service');
  };

  it('exposes 443 and routes to the container secure port 10250', () => {
    const port = synthService().spec.ports[0];
    expect(port.port).toBe(443);
    expect(port.targetPort).toBe(10250);
    expect(port.name).toBe('https');
  });

  it('selects the deployment pods', () => {
    const service = synthService();
    expect(service.spec.selector).toBeDefined();
    expect(Object.keys(service.spec.selector).length).toBeGreaterThan(0);
  });

  it('matches snapshot', () => {
    const service = synthService();
    expect(service).toMatchSnapshot();
  });
});
