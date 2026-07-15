# Shared base package `@cdk-x/cdk8s-core`

## Context

El catálogo va a tener muchas librerías (metric-server, argocd, etc.) que comparten
los mismos recursos Kubernetes. En lugar de que cada librería reimplemente los
`addXxx` fluidos sobre cdk8s-plus, se extrae un paquete compartido con constructs
genéricos y reutilizables. Las librerías del catálogo **extienden por herencia**
esos constructs y solo aportan sus defaults y lógica específica.

Scope v1: **`CoreDeployment`**, **`CoreServiceAccount`**, **`CoreService`**.
RBAC se deja para una iteración posterior.

---

## Arquitectura objetivo

```
@cdk-x/cdk8s-core           <-- nuevo paquete
  src/
    deployment/             CoreDeployment + props + spec
    service-account/        CoreServiceAccount + props + spec
    service/                CoreService + props + spec
    index.ts

@cdk-x/metric-server        <-- actualizado
  src/
    deployment/             MetricServerDeployment extends CoreDeployment
    service-account/        MetricServerServiceAccount extends CoreServiceAccount
    service/                MetricServerService extends CoreService
    ...resto igual...
```

---

## `CoreDeployment` — diseño detallado

```ts
export interface CoreDeploymentProps {
  readonly name: string;
  readonly image: string;                    // required; sin default en core
  readonly serviceAccount?: ServiceAccount;
  readonly replicas?: number;                // @default 1
  readonly imagePullPolicy?: ImagePullPolicy;// @default IF_NOT_PRESENT
  readonly strategy?: DeploymentStrategy;    // @default rollingUpdate maxUnavailable=0
  readonly resources?: ContainerResources;
  readonly args?: Record<string, string>;
  readonly probes?: CoreProbeOptions;        // { liveness?, readiness?, startup? }
}
```

**Métodos fluidos** (todos retornan `this`):
- `addArgs(args: Record<string, string>): this` — deduplica por clave, re-renderiza live array
- `addArg(key: string, value?: string): this` — delega en addArgs
- `addVolume(path: string, volume: Volume, options?: MountOptions): this` — `container.mount()`
- `addInitContainer(props: ContainerProps): this` — `deployment.addInitContainer()`
- `addEnv(name: string, value: EnvValue): this` — `container.env.addVariable()`
- `addToleration(toleration: Toleration): this` — `deployment.scheduling.tolerate()`
- `addTolerations(tolerations: Toleration[]): this` — loop sobre addToleration
- `addNodeSelector(key: string, value: string): this` — `deployment.scheduling.attract(new LabeledNode([NodeLabelQuery.is(key, value)]))`
- `addAffinity(affinity: NodeAffinity | PodAffinity | PodAntiAffinity): this` — vía la API de scheduling de cdk8s-plus; verificar firma exacta durante implementación
- `addPodAnnotation(key: string, value: string): this` — vía `JsonPatch.add` sobre `/spec/template/metadata/annotations`
- `addPodLabel(key: string, value: string): this` — vía `JsonPatch.add` sobre `/spec/template/metadata/labels`

**Escape hatch:** `public readonly deployment: Deployment`, `public readonly container: Container`

**Mecanismo args (verificado):** `Map<string,string>` + live array sincronizado.
La Deployment de cdk8s-plus llama `_toKube()` en synth, que lee el array por referencia.
NO usar `Lazy.any` como args entero (el getter hace `[...this._args]` que no itera un Lazy).

---

## `CoreServiceAccount` y `CoreService`

```ts
// CoreServiceAccount — wrapper fino, principalmente para consistencia y escape hatch
export interface CoreServiceAccountProps {
  readonly name: string;
}

// CoreService
export interface CoreServiceProps {
  readonly selector: IPodSelector;   // required
  readonly name?: string;
  readonly port?: number;            // @default 443
  readonly targetPort?: number;      // @default port (1:1 si no se especifica)
  readonly protocol?: Protocol;      // @default TCP
}
```

---

## Herencia en metric-server

Patrón en cada construct:

```ts
// MetricServerDeployment — establece defaults; hereda todos los addXxx
export interface MetricServerDeploymentProps extends Omit<CoreDeploymentProps, 'image'> {
  readonly serviceAccount: ServiceAccount;  // required aquí
  readonly image?: string;                  // opcional porque tenemos default
}

export class MetricServerDeployment extends CoreDeployment {
  constructor(scope, id, props: MetricServerDeploymentProps) {
    super(scope, id, {
      ...props,
      image: props.image ?? DEFAULT_METRICS_SERVER_IMAGE,
      args: {
        [MetricsServerArg.CERT_DIR]: '/tmp',
        [MetricsServerArg.SECURE_PORT]: String(METRICS_SERVER_SECURE_PORT),
        ...props.args,
      },
    });
    // Node affinity, security context, volumen /tmp — todo aquí, no en CoreDeployment
  }
}
```

Mismo patrón para `MetricServerServiceAccount extends CoreServiceAccount` y
`MetricServerService extends CoreService` (más simples; principalmente pasan
defaults de puerto/nombre).

---

## Implementación paso a paso

### 1. Scaffolding `@cdk-x/cdk8s-core`
```sh
pnpm nx g @nx/js:lib packages/cdk8s-core --publishable --importPath @cdk-x/cdk8s-core
pnpm add cdk8s cdk8s-plus-34 constructs --filter @cdk-x/cdk8s-core
```
Aplicar las mismas config de tsconfig/eslint que metric-server
(ESM, nodenext, `tsconfig.lib.json` + `tsconfig.spec.json`, `.spec.swcrc`).

### 2. Implementar los tres constructs en `@cdk-x/cdk8s-core`
- `deployment/`: `CoreDeployment` + `CoreDeploymentProps` + `CoreProbeOptions`.
  Primero verificar en cdk8s-plus-34 la API de `addInitContainer`, `container.mount`,
  `container.env.addVariable`, `deployment.scheduling.tolerate` antes de codificar.
  `addPodAnnotation`/`addPodLabel` usan `deployment.apiObject.addJsonPatch`.
- `service-account/`: `CoreServiceAccount`, wrapper fino.
- `service/`: `CoreService` con bind + selector genéricos.
- Tests por kind: targeted assertions sobre la API genérica (sin defaults de metric-server).

### 3. Migrar metric-server a usar herencia
- `MetricServerDeployment extends CoreDeployment` — quitar lógica genérica, dejar solo defaults/enum/security context.
- `MetricServerServiceAccount extends CoreServiceAccount` — pasar `name`.
- `MetricServerService extends CoreService` — pasar defaults de puerto 443/targetPort.
- Añadir `@cdk-x/cdk8s-core` como dependencia de `@cdk-x/metric-server`.
- Eliminar el código genérico duplicado (args map, live array) de metric-server — lo hereda.

### 4. Actualizar tests
- Tests de `@cdk-x/cdk8s-core`: validan la API genérica (addArgs post-construcción,
  addVolume, addInitContainer, addEnv, addToleration, addNodeSelector, addAffinity,
  addPodAnnotation).
- Tests de metric-server: validan los **defaults específicos** (imagen, secure-port,
  probes en 10250, service 443→10250) — no re-testean la lógica genérica.
- Regenerar el snapshot del chart.

### 5. Actualizar guía de documentación
- `docs/cdk8s-library-pattern.md`: añadir sección "Consumir `@cdk-x/cdk8s-core`" con el
  patrón de herencia y el uso de `Omit<CoreXxxProps, 'field'>` para hacer opcionales
  campos que tienen default en la app.

---

## Verificación
- `pnpm nx build cdk8s-core` — sin errores
- `pnpm nx test  cdk8s-core` — CoreDeployment: addArgs, addArg, addVolume, addInitContainer, addEnv, addToleration, addTolerations, addNodeSelector, addAffinity, addPodAnnotation — todo pasa
- `pnpm nx build metric-server && pnpm nx test metric-server` — defaults y snapshot intactos
- `pnpm nx lint cdk8s-core && pnpm nx lint metric-server` — sin errores

---

## Notas de riesgo

- **`addPodAnnotation`/`addPodLabel`**: cdk8s-plus puede no exponer metadata del pod template
  de forma mutable. Si es así, usar `deployment.apiObject.addJsonPatch(JsonPatch.add(
  '/spec/template/metadata/annotations/key', value))`. Verificar durante implementación.
- **`addInitContainer`**: confirmar que `deployment.addInitContainer()` existe en cdk8s-plus-34
  antes de exponerlo en la API pública.
- **`container.env.addVariable`**: confirmar la firma exacta en cdk8s-plus-34.
- **`addAffinity`**: cdk8s-plus-34 usa `deployment.scheduling` para affinities; confirmar la
  API concreta (puede ser `scheduling.colocate`, `scheduling.spread`, etc.) durante implementación.
- **`addNodeSelector`**: `LabeledNode` + `NodeLabelQuery` (ya se usa en metric-server para el
  nodo Linux) — patrón ya verificado; `addNodeSelector` es un thin wrapper sobre ese patrón.
