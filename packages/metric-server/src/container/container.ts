import { Duration, Size } from 'cdk8s';
import {
  Capability,
  ConnectionScheme,
  Container,
  ContainerResources,
  Cpu,
  ImagePullPolicy,
  Probe,
  Protocol,
  SeccompProfileType,
  Volume,
} from 'cdk8s-plus-34';
import { Construct } from 'constructs';

/**
 * The container port the metrics-server listens on (`--secure-port`).
 * The Service and probes are wired to this port.
 */
export const METRICS_SERVER_SECURE_PORT = 10250;

/** Default upstream registry for the metrics-server image. */
export const DEFAULT_METRICS_SERVER_REGISTRY = 'registry.k8s.io';
/** Default upstream repository for the metrics-server image. */
export const DEFAULT_METRICS_SERVER_REPOSITORY = 'metrics-server/metrics-server';
/** Default upstream tag for the metrics-server image. */
export const DEFAULT_METRICS_SERVER_TAG = 'v0.8.0';
/** Default upstream image for the metrics-server container, composed from the parts above. */
export const DEFAULT_METRICS_SERVER_IMAGE =
  `${DEFAULT_METRICS_SERVER_REGISTRY}/${DEFAULT_METRICS_SERVER_REPOSITORY}:${DEFAULT_METRICS_SERVER_TAG}`;

/**
 * Well-known `metrics-server` command-line flags.
 *
 * Use these with {@link MetricServerContainer.addArg} for autocomplete and to
 * avoid typos. `addArg` still accepts plain strings, so any flag not listed
 * here can also be passed.
 */
export enum MetricsServerArg {
  CERT_DIR = 'cert-dir',
  SECURE_PORT = 'secure-port',
  KUBELET_PREFERRED_ADDRESS_TYPES = 'kubelet-preferred-address-types',
  KUBELET_USE_NODE_STATUS_PORT = 'kubelet-use-node-status-port',
  METRIC_RESOLUTION = 'metric-resolution',
}

/**
 * Health probes for the metrics-server container. Each is optional; when
 * omitted a sensible HTTPS default targeting the secure port is used.
 */
export interface MetricServerProbesOptions {
  readonly liveness?: Probe;
  readonly readiness?: Probe;
  readonly startup?: Probe;
}

/**
 * Parts of the metrics-server image, each individually overridable. The most
 * common override — pointing at a private registry/mirror — only needs
 * `registry`; `repository` and `tag` keep their defaults.
 */
export interface MetricServerImageProps {
  /**
   * Container registry hostname.
   * @default DEFAULT_METRICS_SERVER_REGISTRY
   */
  readonly registry?: string;
  /**
   * Image repository (registry-relative path).
   * @default DEFAULT_METRICS_SERVER_REPOSITORY
   */
  readonly repository?: string;
  /**
   * Image tag.
   * @default DEFAULT_METRICS_SERVER_TAG
   */
  readonly tag?: string;
}

export interface MetricServerContainerProps {
  /**
   * Container image, split by part so a private registry/mirror can be set
   * without repeating the rest of the path.
   * @default DEFAULT_METRICS_SERVER_IMAGE
   */
  readonly image?: MetricServerImageProps;
  /**
   * Image pull policy.
   * @default ImagePullPolicy.IF_NOT_PRESENT
   */
  readonly imagePullPolicy?: ImagePullPolicy;
  /** Container resource requests/limits. Defaults: 100m CPU / 200Mi memory requests. */
  readonly resources?: ContainerResources;
  /**
   * Extra/overriding command-line flags, keyed by flag name (without `--`).
   * Merged over the defaults; an empty value renders a bare flag. Use
   * {@link MetricsServerArg} for well-known flag names (e.g.
   * `[MetricsServerArg.CERT_DIR]: '/tmp'`) — any other string key works too.
   */
  readonly args?: Record<string, string>;
  /** Health probe overrides. */
  readonly probes?: MetricServerProbesOptions;
}

/**
 * The metrics-server container.
 *
 * Ships sensible defaults (image, args, probes, security context) that can be
 * overridden via props, extended after construction with {@link addArg}, or —
 * for anything not modelled here — mutated through the exposed {@link container}
 * escape hatch (the raw cdk8s-plus `Container`, e.g. `container.mount(...)`).
 */
export class MetricServerContainer extends Construct {
  /** The underlying cdk8s-plus Container (escape hatch for advanced tweaks). */
  public readonly container: Container;

  /** Deduplicates flags by name; populated with defaults, then grown by addArg. */
  private readonly argsMap: Map<string, string>;
  /** Live reference handed to Container.args; rebuilt by renderArgs() on every change. */
  private readonly renderedArgs: string[] = [];

  constructor(
    scope: Construct,
    id: string,
    props: MetricServerContainerProps = {},
  ) {
    super(scope, id);
    const releaseName: string = this.node.tryGetContext('releaseName');

    this.argsMap = new Map(
      Object.entries({
        [MetricsServerArg.CERT_DIR]: '/tmp',
        [MetricsServerArg.SECURE_PORT]: String(METRICS_SERVER_SECURE_PORT),
        [MetricsServerArg.KUBELET_PREFERRED_ADDRESS_TYPES]:
          'InternalIP,ExternalIP,Hostname',
        [MetricsServerArg.KUBELET_USE_NODE_STATUS_PORT]: '',
        [MetricsServerArg.METRIC_RESOLUTION]: '15s',
        ...props.args,
      }),
    );
    this.renderArgs();

    const registry = props.image?.registry ?? DEFAULT_METRICS_SERVER_REGISTRY;
    const repository =
      props.image?.repository ?? DEFAULT_METRICS_SERVER_REPOSITORY;
    const tag = props.image?.tag ?? DEFAULT_METRICS_SERVER_TAG;

    this.container = new Container({
      name: releaseName,
      image: `${registry}/${repository}:${tag}`,
      imagePullPolicy:
        props.imagePullPolicy ?? ImagePullPolicy.IF_NOT_PRESENT,
      // Live reference: addArg mutates this array before synth.
      args: this.renderedArgs,
      ports: [
        {
          number: METRICS_SERVER_SECURE_PORT,
          name: 'https',
          protocol: Protocol.TCP,
        },
      ],
      liveness:
        props.probes?.liveness ??
        Probe.fromHttpGet('/livez', {
          scheme: ConnectionScheme.HTTPS,
          port: METRICS_SERVER_SECURE_PORT,
          periodSeconds: Duration.seconds(10),
          failureThreshold: 3,
        }),
      readiness:
        props.probes?.readiness ??
        Probe.fromHttpGet('/readyz', {
          scheme: ConnectionScheme.HTTPS,
          port: METRICS_SERVER_SECURE_PORT,
          initialDelaySeconds: Duration.seconds(20),
          periodSeconds: Duration.seconds(10),
          failureThreshold: 3,
        }),
      startup: props.probes?.startup,
      resources: {
        cpu: {
          request: props.resources?.cpu?.request ?? Cpu.millis(100),
          limit: props.resources?.cpu?.limit,
        },
        memory: {
          request: props.resources?.memory?.request ?? Size.mebibytes(200),
          limit: props.resources?.memory?.limit,
        },
      },
      securityContext: {
        capabilities: {
          drop: [Capability.ALL],
        },
        user: 1000,
        seccompProfile: {
          type: SeccompProfileType.RUNTIME_DEFAULT,
        },
      },
      volumeMounts: [
        {
          path: '/tmp',
          volume: Volume.fromEmptyDir(this, 'VolumeTmp', 'tmp-dir'),
        },
      ],
    });
  }

  /**
   * Add or override a single container flag. An empty value renders a bare
   * flag (e.g. `--kubelet-use-node-status-port`).
   */
  public addArg(key: string, value = ''): this {
    this.argsMap.set(key, value);
    this.renderArgs();
    return this;
  }

  /** Rebuilds the live `--key=value` / `--key` array from argsMap. */
  private renderArgs(): void {
    this.renderedArgs.length = 0;
    this.renderedArgs.push(
      ...[...this.argsMap].map(([key, value]) =>
        value === '' ? `--${key}` : `--${key}=${value}`,
      ),
    );
  }
}
