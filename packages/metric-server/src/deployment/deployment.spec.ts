import { CatalogChart, CommonLabels } from '@cdk-x/cdk8s-core';
import { Testing } from 'cdk8s';
import { DeploymentStrategy, PercentOrAbsolute, ServiceAccount } from 'cdk8s-plus-34';
import { DEFAULT_METRICS_SERVER_IMAGE } from '../container/index.js';
import { MetricServerDeployment } from './deployment.js';

describe('MetricServerDeployment', () => {
  const synth = (
    build: (chart: CatalogChart, sa: ServiceAccount) => void,
  ) => {
    const chart = new CatalogChart(Testing.app(), 'testing', { releaseName: 'metric-server' });
    const serviceAccount = new ServiceAccount(chart, 'ServiceAccount', {
      metadata: { name: 'metric-server' },
    });
    build(chart, serviceAccount);
    return Testing.synth(chart).find((o) => o.kind === 'Deployment');
  };

  it('attaches the configured container to the deployment', () => {
    const chart = new CatalogChart(Testing.app(), 'testing', { releaseName: 'metric-server' });
    const serviceAccount = new ServiceAccount(chart, 'ServiceAccount', {
      metadata: { name: 'metric-server' },
    });
    const dep = new MetricServerDeployment(chart, 'Deployment', { serviceAccount });

    const deployment = Testing.synth(chart).find((o) => o.kind === 'Deployment');
    const container = deployment.spec.template.spec.containers[0];
    expect(container.image).toBe(DEFAULT_METRICS_SERVER_IMAGE);
    expect(container.name).toBe(dep.container.container.name);
  });

  it('adds the metrics-server component label to the deployment and its pod template', () => {
    const deployment = synth((chart, sa) => {
      new MetricServerDeployment(chart, 'Deployment', { serviceAccount: sa });
    });

    expect(deployment.metadata.labels[CommonLabels.COMPONENT]).toBe('metrics-server');
    expect(deployment.spec.template.metadata.labels[CommonLabels.COMPONENT]).toBe(
      'metrics-server',
    );
  });

  it('defaults replicas to 1 and applies a custom strategy/replicas', () => {
    const defaultDeployment = synth((chart, sa) => {
      new MetricServerDeployment(chart, 'Deployment', { serviceAccount: sa });
    });
    expect(defaultDeployment.spec.replicas).toBe(1);

    const customDeployment = synth((chart, sa) => {
      new MetricServerDeployment(chart, 'Deployment', {
        serviceAccount: sa,
        replicas: 3,
        strategy: DeploymentStrategy.rollingUpdate({
          maxUnavailable: PercentOrAbsolute.absolute(1),
        }),
      });
    });
    expect(customDeployment.spec.replicas).toBe(3);
    expect(customDeployment.spec.strategy.rollingUpdate.maxUnavailable).toBe(1);
  });

  it('matches snapshot', () => {
    const chart = new CatalogChart(Testing.app(), 'testing', {
      releaseName: 'metric-server',
      namespace: 'kube-system',
    });
    const serviceAccount = new ServiceAccount(chart, 'ServiceAccount', {
      metadata: { name: 'metric-server' },
    });
    new MetricServerDeployment(chart, 'Deployment', { serviceAccount });
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
