import { CatalogChart } from '@cdk-x/cdk8s-core';
import { Testing } from 'cdk8s';
import { Pod } from 'cdk8s-plus-34';
import {
  DEFAULT_METRICS_SERVER_IMAGE,
  METRICS_SERVER_SECURE_PORT,
  MetricServerContainer,
  MetricsServerArg,
} from './container.js';

describe('MetricServerContainer', () => {
  const synth = (build: (chart: CatalogChart) => MetricServerContainer) => {
    const chart = new CatalogChart(Testing.app(), 'testing', {
      releaseName: 'metric-server',
    });
    const msContainer = build(chart);
    const pod = new Pod(chart, 'Pod', {});
    pod.attachContainer(msContainer.container);
    const rendered = Testing.synth(chart).find((o) => o.kind === 'Pod');
    return rendered.spec.containers[0];
  };

  it('renders defaults (image, secure port, default args, https probes)', () => {
    const container = synth(
      (chart) => new MetricServerContainer(chart, 'Container'),
    );

    expect(container.image).toBe(DEFAULT_METRICS_SERVER_IMAGE);
    expect(container.ports[0].containerPort).toBe(METRICS_SERVER_SECURE_PORT);
    expect(container.args).toContain(`--secure-port=${METRICS_SERVER_SECURE_PORT}`);
    expect(container.args).toContain('--kubelet-use-node-status-port');
    expect(container.livenessProbe.httpGet.port).toBe(METRICS_SERVER_SECURE_PORT);
    expect(container.readinessProbe.httpGet.port).toBe(METRICS_SERVER_SECURE_PORT);
  });

  it('overrides a default arg via props (dedup by flag name)', () => {
    const container = synth(
      (chart) =>
        new MetricServerContainer(chart, 'Container', {
          args: { [MetricsServerArg.METRIC_RESOLUTION]: '30s' },
        }),
    );

    expect(container.args).toContain('--metric-resolution=30s');
    expect(container.args).not.toContain('--metric-resolution=15s');
  });

  it('reflects addArg called AFTER construction at synth time', () => {
    const container = synth((chart) => {
      const msContainer = new MetricServerContainer(chart, 'Container');
      msContainer.addArg('kubelet-insecure-tls');
      msContainer.addArg(MetricsServerArg.SECURE_PORT, '10251');
      return msContainer;
    });

    expect(container.args).toContain('--kubelet-insecure-tls');
    expect(container.args).toContain('--secure-port=10251');
    expect(container.args).not.toContain('--secure-port=10250');
  });

  it('accepts a custom registry, keeping the default repository/tag', () => {
    const container = synth(
      (chart) =>
        new MetricServerContainer(chart, 'Container', {
          image: { registry: 'registry.internal' },
        }),
    );

    expect(container.image).toBe(
      'registry.internal/metrics-server/metrics-server:v0.8.0',
    );
  });

  it('accepts a custom repository/tag, keeping the default registry', () => {
    const container = synth(
      (chart) =>
        new MetricServerContainer(chart, 'Container', {
          image: { repository: 'mirror/metrics-server', tag: 'v0.7.2' },
        }),
    );

    expect(container.image).toBe('registry.k8s.io/mirror/metrics-server:v0.7.2');
  });

  it('matches snapshot', () => {
    const chart = new CatalogChart(Testing.app(), 'testing', {
      releaseName: 'metric-server',
      namespace: 'kube-system',
    });
    const msContainer = new MetricServerContainer(chart, 'Container');
    const pod = new Pod(chart, 'Pod', {});
    pod.attachContainer(msContainer.container);
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
