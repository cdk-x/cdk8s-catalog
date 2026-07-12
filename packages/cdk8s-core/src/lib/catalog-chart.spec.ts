import { Testing } from 'cdk8s';
import { Construct } from 'constructs';
import { CatalogChart, CatalogLabels, CommonLabels } from './catalog-chart.js';

describe('CatalogChart', () => {
  it('defaults releaseName to the construct id', () => {
    const chart = new CatalogChart(Testing.app(), 'my-app');
    expect(chart.releaseName).toBe('my-app');
  });

  it('uses the provided releaseName', () => {
    const chart = new CatalogChart(Testing.app(), 'my-app', { releaseName: 'custom-name' });
    expect(chart.releaseName).toBe('custom-name');
  });

  it('of() returns the nearest CatalogChart ancestor', () => {
    const chart = new CatalogChart(Testing.app(), 'chart', { releaseName: 'test' });
    const child = new Construct(chart, 'child');
    const grandchild = new Construct(child, 'grandchild');
    expect(CatalogChart.of(grandchild)).toBe(chart);
  });

  it('of() returns the chart itself when called on a CatalogChart', () => {
    const chart = new CatalogChart(Testing.app(), 'chart');
    expect(CatalogChart.of(chart)).toBe(chart);
  });

  it('of() throws when no CatalogChart ancestor exists', () => {
    const app = Testing.app();
    const orphan = new Construct(app, 'orphan');
    expect(() => CatalogChart.of(orphan)).toThrow(/No CatalogChart ancestor/);
  });

  it('applies the standard app.kubernetes.io common labels by default', () => {
    const chart = new CatalogChart(Testing.app(), 'my-app');
    expect(chart.labels[CommonLabels.NAME]).toBe('my-app');
    expect(chart.labels[CommonLabels.INSTANCE]).toBe('my-app');
    expect(chart.labels[CommonLabels.MANAGED_BY]).toBe('cdk8s');
    expect(chart.labels[CommonLabels.VERSION]).toBeUndefined();
    expect(chart.labels[CommonLabels.PART_OF]).toBeUndefined();
  });

  it('uses appName/releaseName independently when provided', () => {
    const chart = new CatalogChart(Testing.app(), 'my-app', {
      appName: 'metrics-server',
      releaseName: 'metrics-server-prod',
    });
    expect(chart.labels[CommonLabels.NAME]).toBe('metrics-server');
    expect(chart.labels[CommonLabels.INSTANCE]).toBe('metrics-server-prod');
  });

  it('includes version/part-of only when provided', () => {
    const chart = new CatalogChart(Testing.app(), 'my-app', {
      appVersion: 'v1.2.3',
      partOf: 'observability-stack',
    });
    expect(chart.labels[CommonLabels.VERSION]).toBe('v1.2.3');
    expect(chart.labels[CommonLabels.PART_OF]).toBe('observability-stack');
  });

  it('lets explicit labels override the computed defaults', () => {
    const chart = new CatalogChart(Testing.app(), 'my-app', {
      labels: { [CommonLabels.MANAGED_BY]: 'helm' },
    });
    expect(chart.labels[CommonLabels.MANAGED_BY]).toBe('helm');
  });

  it('includes catalog library labels only when catalogLibrary is provided', () => {
    const withLibrary = new CatalogChart(Testing.app(), 'my-app', {
      catalogLibrary: { name: 'metric-server', version: '0.0.1' },
    });
    expect(withLibrary.labels[CatalogLabels.LIBRARY_NAME]).toBe('metric-server');
    expect(withLibrary.labels[CatalogLabels.LIBRARY_VERSION]).toBe('0.0.1');

    const withoutLibrary = new CatalogChart(Testing.app(), 'my-app');
    expect(withoutLibrary.labels[CatalogLabels.LIBRARY_NAME]).toBeUndefined();
    expect(withoutLibrary.labels[CatalogLabels.LIBRARY_VERSION]).toBeUndefined();
  });
});
