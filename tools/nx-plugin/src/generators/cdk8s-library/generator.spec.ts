import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';

import { cdk8sLibraryGenerator } from './generator';

// @nx/js:library ensures prettier is resolvable (and devkit's formatFiles
// imports it) - prettier v3's CJS shim internally uses a dynamic import()
// that Jest's CJS module registry can't satisfy without
// --experimental-vm-modules. Mocking it out keeps the composed generator
// chain from crashing in tests; it doesn't affect real `nx g` invocations,
// which run under plain Node.
jest.mock('prettier', () => ({
  resolveConfig: async () => null,
  getFileInfo: async () => ({ inferredParser: null }),
  format: async (content: string) => content,
}));

function seedReferenceFixtures(tree: Tree, cdk8sPlusPackage = 'cdk8s-plus-34') {
  tree.write('packages/cdk8s-core/package.json', JSON.stringify({ name: '@cdk-x/cdk8s-core', version: '0.0.1' }));
  tree.write(
    'packages/metric-server/package.json',
    JSON.stringify({
      name: '@cdk-x/metric-server',
      dependencies: {
        '@cdk-x/cdk8s-core': '^0.0.1',
        cdk8s: '^2.70.82',
        [cdk8sPlusPackage]: '^2.0.35',
        constructs: '^10.3.0',
        tslib: '^2.3.0',
      },
      devDependencies: {
        cdk8s: '2.70.82',
        [cdk8sPlusPackage]: '2.0.35',
        constructs: '10.3.0',
      },
    }),
  );
  tree.write(
    'docs/libraries/index.md',
    [
      '# Libraries',
      '',
      '| Library | Package | Deploys |',
      '|---|---|---|',
      '| [Metric Server](metric-server/) | `@cdk-x/metric-server` | metrics-server |',
      '',
      'New to the catalog? See [Building a library](../building-a-library.md)',
      'for the pattern every library follows.',
      '',
    ].join('\n'),
  );
}

describe('cdk8s-library generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seedReferenceFixtures(tree);
  });

  it('rejects non-kebab-case names', async () => {
    await expect(cdk8sLibraryGenerator(tree, { name: 'IngressNginx' })).rejects.toThrow(/kebab-case/);
  });

  it('refuses to overwrite an existing package', async () => {
    tree.write('packages/ingress-nginx/README.md', 'already here');
    await expect(cdk8sLibraryGenerator(tree, { name: 'ingress-nginx' })).rejects.toThrow(/already exists/);
  });

  it('scaffolds a catalog library matching the metric-server pattern', async () => {
    await cdk8sLibraryGenerator(tree, { name: 'ingress-nginx', description: 'deploys ingress-nginx.' });

    const projectJson = JSON.parse(tree.read('packages/ingress-nginx/project.json', 'utf-8') as string);
    expect(projectJson.name).toBe('@cdk-x/ingress-nginx');
    expect(Object.keys(projectJson.targets)).toEqual(
      expect.arrayContaining([
        'jsii-compile',
        'jsii-docs',
        'jsii-package-all',
        'jsii-publish-npm',
        'nx-release-publish',
        'docs-build',
        'docs-serve',
        'docs-deploy',
      ]),
    );

    const packageJson = JSON.parse(tree.read('packages/ingress-nginx/package.json', 'utf-8') as string);
    expect(packageJson.type).toBe('module');
    expect(packageJson.exports['.'].source).toBe('./src/index.ts');
    expect(packageJson.jsii.targets.python.module).toBe('cdk8s_catalog_ingress_nginx');
    expect(packageJson.jsii.targets.java.package).toBe('com.cdkx.cdk8scatalog.ingressnginx');
    expect(packageJson.jsii.targets.dotnet.namespace).toBe('CdkX.Cdk8sCatalog.IngressNginx');
    expect(packageJson.dependencies['@cdk-x/cdk8s-core']).toBe('^0.0.1');
    expect(packageJson.devDependencies.cdk8s).toBe('2.70.82');
    expect(packageJson.bundledDependencies).toEqual(['tslib']);

    const eslintConfig = tree.read('packages/ingress-nginx/eslint.config.mjs', 'utf-8') as string;
    expect(eslintConfig).toContain("ignoredDependencies: ['@cdk-x/cdk8s-core', 'cdk8s', 'cdk8s-plus-34']");

    const tsconfigLib = JSON.parse(tree.read('packages/ingress-nginx/tsconfig.lib.json', 'utf-8') as string);
    expect(tsconfigLib.references).toEqual([{ path: '../cdk8s-core/tsconfig.lib.json' }]);

    expect(tree.exists('packages/ingress-nginx/mkdocs.yml')).toBe(true);
    expect(tree.exists('packages/ingress-nginx/docs/index.md')).toBe(true);
    expect(tree.exists('packages/ingress-nginx/tsconfig.jsii.json')).toBe(true);
    expect(tree.exists('packages/ingress-nginx/src/lib')).toBe(false);
    expect(tree.exists('packages/ingress-nginx/src/index.ts')).toBe(true);
    expect(tree.exists('packages/ingress-nginx/src/ingress-nginx.ts')).toBe(true);
    expect(tree.exists('packages/ingress-nginx/src/ingress-nginx.spec.ts')).toBe(true);

    const chart = tree.read('packages/ingress-nginx/src/ingress-nginx.ts', 'utf-8') as string;
    expect(chart).toContain('export class IngressNginx extends CatalogChart');

    const librariesIndex = tree.read('docs/libraries/index.md', 'utf-8') as string;
    expect(librariesIndex).toContain(
      '| [IngressNginx](ingress-nginx/) | `@cdk-x/ingress-nginx` | deploys ingress-nginx. |',
    );
  });

  it('follows whichever cdk8s-plus-<N> metric-server depends on, not a hardcoded version', async () => {
    // Simulates a "main" branch that has moved on to Kubernetes 1.35 (a "1.x"
    // maintenance branch would stay on cdk8s-plus-34) - see
    // docs/building-a-library.md. The generator must not hardcode "-34".
    tree = createTreeWithEmptyWorkspace();
    seedReferenceFixtures(tree, 'cdk8s-plus-35');

    await cdk8sLibraryGenerator(tree, { name: 'ingress-nginx' });

    const packageJson = JSON.parse(tree.read('packages/ingress-nginx/package.json', 'utf-8') as string);
    expect(packageJson.dependencies).not.toHaveProperty('cdk8s-plus-34');
    expect(packageJson.dependencies['cdk8s-plus-35']).toBe('^2.0.35');
    expect(packageJson.peerDependencies['cdk8s-plus-35']).toBe('^2.0.35');
    expect(packageJson.devDependencies['cdk8s-plus-35']).toBe('2.0.35');

    const eslintConfig = tree.read('packages/ingress-nginx/eslint.config.mjs', 'utf-8') as string;
    expect(eslintConfig).toContain("ignoredDependencies: ['@cdk-x/cdk8s-core', 'cdk8s', 'cdk8s-plus-35']");
  });

  it('fails clearly if metric-server has no cdk8s-plus-<N> dependency', async () => {
    tree.write(
      'packages/metric-server/package.json',
      JSON.stringify({ name: '@cdk-x/metric-server', dependencies: {}, devDependencies: {} }),
    );

    await expect(cdk8sLibraryGenerator(tree, { name: 'ingress-nginx' })).rejects.toThrow(/cdk8s-plus-<N>/);
  });
});
