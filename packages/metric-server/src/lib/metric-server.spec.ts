import { metricServer } from './metric-server.js';

describe('metricServer', () => {
  it('should work', () => {
    expect(metricServer()).toEqual('metric-server');
  });
});
