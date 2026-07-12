import { App, YamlOutputType } from 'cdk8s';
import { MetricServer } from '@cdk-x/metric-server';

// A single, dependency-ordered file so `kubectl apply -f` doesn't need to guess
// resource order (cdk8s already topologically sorts within one output file).
const app = new App({ outdir: 'manifests', yamlOutputType: YamlOutputType.FILE_PER_APP });
new MetricServer(app, 'metric-server');
app.synth();
