import {
  CatalogChart,
  CatalogChartProps,
  readCatalogLibraryInfo,
} from '@cdk-x/cdk8s-core';
import { Construct } from 'constructs';
import { MetricServerApiService } from './api-service/index.js';
import { AggregatedMetricsReaderClusterRole } from './cluster-role/index.js';
import {
  AuthDelegatorClusterRoleBinding,
  MetricServerClusterRoleBinding,
} from './cluster-role-binding/index.js';
import {
  MetricServerDeployment,
  MetricServerDeploymentProps,
} from './deployment/index.js';
import { AuthReaderRoleBinding } from './role-binding/index.js';
import { MetricServerService } from './service/index.js';
import { MetricServerServiceAccount } from './service-account/index.js';

export interface MetricServerProps extends CatalogChartProps {
  /** Deployment overrides (replicas, strategy, image, resources, probes, args). */
  readonly deployment?: Omit<MetricServerDeploymentProps, 'serviceAccount'>;
}

/**
 * A ready-to-deploy Kubernetes metrics-server, composed from one construct per
 * kind. Sub-constructs are exposed as public readonly fields so callers can
 * extend them (e.g. `metricServer.deployment.addArgs(...)`).
 */
export class MetricServer extends CatalogChart {
  public readonly serviceAccount: MetricServerServiceAccount;
  public readonly deployment: MetricServerDeployment;
  public readonly service: MetricServerService;
  public readonly apiService: MetricServerApiService;

  constructor(scope: Construct, id: string, props: MetricServerProps = {}) {
    const releaseName = props.releaseName ?? 'metric-server';
    super(scope, id, {
      namespace: 'kube-system',
      ...props,
      releaseName,
      catalogLibrary: readCatalogLibraryInfo(import.meta.url),
    });

    // ServiceAccount the pods run as / RBAC subject.
    this.serviceAccount = new MetricServerServiceAccount(this, 'ServiceAccount');
    const subject = this.serviceAccount.serviceAccount;

    new AggregatedMetricsReaderClusterRole(this, 'AggregatedMetricsReader');

    // Explicit dependencies pin the manifest's apply order (ServiceAccount
    // before its bindings/Deployment, Deployment before Service, Service
    // before APIService) to the actual resource graph, instead of leaving it
    // as an accident of construction order.
    const authDelegatorBinding = new AuthDelegatorClusterRoleBinding(this, 'AuthDelegator');
    authDelegatorBinding.clusterRoleBinding.addSubjects(subject);
    authDelegatorBinding.node.addDependency(this.serviceAccount);

    const metricsServerBinding = new MetricServerClusterRoleBinding(this, 'MetricsServerBinding');
    metricsServerBinding.clusterRoleBinding.addSubjects(subject);
    metricsServerBinding.node.addDependency(this.serviceAccount);

    const authReaderBinding = new AuthReaderRoleBinding(this, 'AuthReader');
    authReaderBinding.roleBinding.addSubjects(subject);
    authReaderBinding.node.addDependency(this.serviceAccount);

    this.deployment = new MetricServerDeployment(this, 'Deployment', {
      serviceAccount: subject,
      ...props.deployment,
    });
    this.deployment.node.addDependency(this.serviceAccount);

    this.service = new MetricServerService(this, 'Service', {
      selector: this.deployment.deployment,
      targetPort: this.deployment.securePort,
    });
    this.service.node.addDependency(this.deployment);

    this.apiService = new MetricServerApiService(this, 'ApiService');
    this.apiService.node.addDependency(this.service);
  }
}
