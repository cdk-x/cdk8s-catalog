import { Testing } from 'cdk8s';
import { AggregatedMetricsReaderClusterRole } from './aggregated-metrics-reader.js';

describe('AggregatedMetricsReaderClusterRole', () => {
  it('creates the ClusterRole with name system:aggregated-metrics-reader', () => {
    const chart = Testing.chart();
    new AggregatedMetricsReaderClusterRole(chart, 'Reader');

    const role = Testing.synth(chart).find((o) => o.kind === 'ClusterRole');
    expect(role.metadata.name).toBe('system:aggregated-metrics-reader');
  });

  it('sets all three aggregation labels', () => {
    const chart = Testing.chart();
    new AggregatedMetricsReaderClusterRole(chart, 'Reader');

    const role = Testing.synth(chart).find((o) => o.kind === 'ClusterRole');
    expect(
      role.metadata.labels['rbac.authorization.k8s.io/aggregate-to-admin'],
    ).toBe('true');
    expect(
      role.metadata.labels['rbac.authorization.k8s.io/aggregate-to-edit'],
    ).toBe('true');
    expect(
      role.metadata.labels['rbac.authorization.k8s.io/aggregate-to-view'],
    ).toBe('true');
  });

  it('allows get/list/watch on metrics.k8s.io pods and nodes', () => {
    const chart = Testing.chart();
    new AggregatedMetricsReaderClusterRole(chart, 'Reader');

    const role = Testing.synth(chart).find((o) => o.kind === 'ClusterRole');
    const allResources = role.rules.flatMap(
      (r: { resources: string[] }) => r.resources,
    );
    expect(allResources).toEqual(expect.arrayContaining(['pods', 'nodes']));
    for (const rule of role.rules) {
      expect(rule.apiGroups).toContain('metrics.k8s.io');
      expect(rule.verbs).toEqual(
        expect.arrayContaining(['get', 'list', 'watch']),
      );
    }
  });

  it('matches snapshot', () => {
    const chart = Testing.chart();
    new AggregatedMetricsReaderClusterRole(chart, 'Reader');
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
