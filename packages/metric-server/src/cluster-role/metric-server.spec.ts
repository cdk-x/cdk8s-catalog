import { Testing } from 'cdk8s';
import { MetricServerClusterRole } from './metric-server.js';

describe('MetricServerClusterRole', () => {
  it('creates the ClusterRole with name system:metrics-server', () => {
    const chart = Testing.chart();
    new MetricServerClusterRole(chart, 'Role');

    const role = Testing.synth(chart).find((o) => o.kind === 'ClusterRole');
    expect(role.metadata.name).toBe('system:metrics-server');
  });

  it('allows get on nodes/metrics and get/list/watch on pods and nodes', () => {
    const chart = Testing.chart();
    new MetricServerClusterRole(chart, 'Role');

    const role = Testing.synth(chart).find((o) => o.kind === 'ClusterRole');
    const allResources = role.rules.flatMap(
      (r: { resources: string[] }) => r.resources,
    );
    expect(allResources).toEqual(
      expect.arrayContaining(['nodes/metrics', 'pods', 'nodes']),
    );

    const readRule = role.rules.find((r: { resources: string[] }) =>
      r.resources.some((res: string) => ['pods', 'nodes'].includes(res)),
    );
    expect(readRule.verbs).toEqual(
      expect.arrayContaining(['get', 'list', 'watch']),
    );
  });

  it('matches snapshot', () => {
    const chart = Testing.chart();
    new MetricServerClusterRole(chart, 'Role');
    expect(Testing.synth(chart)).toMatchSnapshot();
  });
});
