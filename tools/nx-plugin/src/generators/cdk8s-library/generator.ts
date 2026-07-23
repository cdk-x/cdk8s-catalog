import {
  formatFiles,
  generateFiles,
  installPackagesTask,
  names,
  runTasksInSerial,
  updateJson,
  type GeneratorCallback,
  type Tree,
} from '@nx/devkit';
import { libraryGenerator } from '@nx/js';
import * as path from 'node:path';
import type { Cdk8sLibraryGeneratorSchema } from './schema';

const NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
// Matches the `ignoredFiles: [...]` array @nx/eslint's dependency-checks
// template emits, tolerant of quote style / single- vs multi-line formatting
// (the raw generateFiles output isn't run through prettier until this
// generator's own final formatFiles call).
const IGNORED_FILES_ARRAY_PATTERN = /ignoredFiles:\s*\[[^\]]*\]/;

interface ReferencePackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface ReferenceVersions {
  coreRange: string;
  cdk8sRange: string;
  cdk8sPlusPackage: string;
  cdk8sPlusRange: string;
  constructsRange: string;
  coreVersion: string;
  cdk8sVersion: string;
  cdk8sPlusVersion: string;
  constructsVersion: string;
}

/**
 * cdk8s-plus ships one npm package per Kubernetes minor version
 * (cdk8s-plus-34 for 1.34, cdk8s-plus-35 for 1.35, ...). This catalog tracks
 * one Kubernetes version per branch (see docs/building-a-library.md) - a
 * "1.x" maintenance branch stays on cdk8s-plus-34 while main moves on to
 * cdk8s-plus-35, etc. Detecting the package name from whatever
 * metric-server actually depends on (instead of hardcoding "-34") keeps this
 * generator correct on every branch without needing a code change per
 * Kubernetes bump.
 */
function findCdk8sPlusPackageName(dependencies: Record<string, string> | undefined): string {
  const match = Object.keys(dependencies ?? {}).find((name) => /^cdk8s-plus-\d+$/.test(name));
  if (!match) {
    throw new Error(
      'Expected packages/metric-server/package.json to declare a "cdk8s-plus-<N>" dependency (the cdk8s-plus package matching the Kubernetes version this branch targets).',
    );
  }
  return match;
}

function readJson<T>(tree: Tree, filePath: string): T {
  const content = tree.read(filePath, 'utf-8');
  if (!content) {
    throw new Error(`Expected ${filePath} to exist - run this generator from the cdk8s-catalog workspace root.`);
  }
  return JSON.parse(content) as T;
}

/**
 * Every catalog library depends on @cdk-x/cdk8s-core + cdk8s-plus-<N>, pinned
 * to whatever's currently installed. Reading them from metric-server (the
 * canonical reference implementation, see docs/building-a-library.md) keeps
 * this generator from drifting out of sync as those pins get bumped.
 */
function readReferenceVersions(tree: Tree): ReferenceVersions {
  const reference = readJson<ReferencePackageJson>(tree, 'packages/metric-server/package.json');
  const { version: coreVersion } = readJson<{ version: string }>(tree, 'packages/cdk8s-core/package.json');
  const cdk8sPlusPackage = findCdk8sPlusPackageName(reference.dependencies);

  const dependencyRange = (name: string): string => {
    const range = reference.dependencies?.[name];
    if (!range) {
      throw new Error(`Expected packages/metric-server/package.json to declare a "${name}" dependency.`);
    }
    return range;
  };
  const devDependencyVersion = (name: string): string => {
    const version = reference.devDependencies?.[name];
    if (!version) {
      throw new Error(`Expected packages/metric-server/package.json to declare a "${name}" devDependency.`);
    }
    return version;
  };

  return {
    coreRange: dependencyRange('@cdk-x/cdk8s-core'),
    cdk8sRange: dependencyRange('cdk8s'),
    cdk8sPlusPackage,
    cdk8sPlusRange: dependencyRange(cdk8sPlusPackage),
    constructsRange: dependencyRange('constructs'),
    coreVersion,
    cdk8sVersion: devDependencyVersion('cdk8s'),
    cdk8sPlusVersion: devDependencyVersion(cdk8sPlusPackage),
    constructsVersion: devDependencyVersion('constructs'),
  };
}

/**
 * The jsii and docs targets every catalog library needs on top of whatever
 * @nx/js:library already inferred (build/test/lint) - see
 * packages/metric-server/project.json, the reference implementation.
 */
function catalogTargets(name: string) {
  const cwd = `packages/${name}`;
  return {
    'jsii-compile': {
      executor: 'nx:run-commands',
      dependsOn: ['^jsii-compile'],
      options: { cwd, command: 'jsii --tsconfig tsconfig.jsii.json' },
      outputs: ['{projectRoot}/dist', '{projectRoot}/.jsii'],
    },
    'jsii-docs': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-compile'],
      options: {
        cwd,
        command: 'jsii-docgen -l typescript -l python -l java -l csharp -l go -o dist-jsii/docs/API',
      },
      outputs: ['{projectRoot}/dist-jsii/docs'],
    },
    'jsii-package-npm': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-compile'],
      options: { cwd, command: 'jsii-pacmak -t js --outdir dist-jsii .' },
      outputs: ['{projectRoot}/dist-jsii/js'],
    },
    'jsii-package-python': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-compile'],
      options: { cwd, command: 'jsii-pacmak -t python --outdir dist-jsii .' },
      outputs: ['{projectRoot}/dist-jsii/python'],
    },
    'jsii-package-java': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-compile', '^jsii-package-java'],
      options: {
        cwd,
        command:
          'jsii-pacmak -t java --outdir dist-jsii . && mkdir -p ~/.m2/repository && cp -r dist-jsii/java/. ~/.m2/repository/',
      },
      outputs: ['{projectRoot}/dist-jsii/java'],
    },
    'jsii-package-dotnet': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-compile', '^jsii-package-dotnet'],
      options: {
        cwd,
        command:
          'mkdir -p ~/.nuget-local-feed && (dotnet nuget add source ~/.nuget-local-feed --name cdk8s-catalog-local || true) && jsii-pacmak -t dotnet --outdir dist-jsii . && cp dist-jsii/dotnet/*.nupkg ~/.nuget-local-feed/',
      },
      outputs: ['{projectRoot}/dist-jsii/dotnet'],
    },
    'jsii-package-go': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-compile', '^jsii-package-go'],
      options: { cwd, command: 'jsii-pacmak -t go --outdir dist-jsii .' },
      outputs: ['{projectRoot}/dist-jsii/go'],
    },
    'jsii-package-all': {
      executor: 'nx:noop',
      dependsOn: [
        'jsii-docs',
        'jsii-package-npm',
        'jsii-package-python',
        'jsii-package-java',
        'jsii-package-dotnet',
        'jsii-package-go',
      ],
    },
    'jsii-publish-npm': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-package-npm'],
      options: { cwd, command: 'publib-npm dist-jsii/js' },
    },
    'jsii-publish-python': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-package-python'],
      options: { cwd, command: 'publib-pypi dist-jsii/python' },
    },
    'jsii-publish-java': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-package-java'],
      options: { cwd, command: 'publib-maven dist-jsii/java' },
    },
    'jsii-publish-dotnet': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-package-dotnet'],
      options: { cwd, command: 'publib-nuget dist-jsii/dotnet' },
    },
    'jsii-publish-go': {
      executor: 'nx:run-commands',
      dependsOn: ['jsii-package-go'],
      options: { cwd, command: 'publib-golang dist-jsii/go' },
    },
    'nx-release-publish': {
      dependsOn: ['^nx-release-publish', 'jsii-compile'],
    },
    'docs-build': {
      executor: 'nx:run-commands',
      options: { command: `node tools/docs-prepare-library.mjs && mkdocs build --config-file ${cwd}/mkdocs.yml --strict` },
    },
    'docs-serve': {
      executor: 'nx:run-commands',
      options: { command: `node tools/docs-prepare-library.mjs && mkdocs serve --config-file ${cwd}/mkdocs.yml` },
    },
    'docs-deploy': {
      executor: 'nx:run-commands',
      options: { command: `node tools/docs-deploy-library.mjs ${name}` },
    },
  };
}

/**
 * Layers the jsii + catalog-dependency delta on top of the package.json
 * @nx/js:library already produced (ESM exports map, tslib dependency, ...).
 */
function addJsiiPackageJson(
  tree: Tree,
  projectRoot: string,
  name: string,
  className: string,
  pythonModule: string,
  javaPackageSegment: string,
  keywords: string[],
  versions: ReferenceVersions,
): void {
  updateJson(tree, `${projectRoot}/package.json`, (json) => {
    json.name = `@cdk-x/${name}`;
    json.type = 'module';
    json.main = './dist/index.js';
    json.module = './dist/index.js';
    json.types = './dist/index.d.ts';
    json.exports = {
      './package.json': './package.json',
      '.': {
        source: './src/index.ts',
        types: './dist/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
    };
    json.files = ['dist', '.jsii', '!**/*.tsbuildinfo'];
    json.author = { name: 'cdk-x', organization: true };
    json.license = 'MIT';
    json.keywords = keywords;
    json.repository = {
      type: 'git',
      url: 'https://github.com/cdk-x/cdk8s-catalog.git',
      directory: projectRoot,
    };
    json.jsii = {
      outdir: 'dist-jsii',
      targets: {
        python: {
          distName: `cdk8s-catalog-${name}`,
          module: `cdk8s_catalog_${pythonModule}`,
        },
        java: {
          package: `com.cdkx.cdk8scatalog.${javaPackageSegment}`,
          maven: { groupId: 'com.cdk-x', artifactId: `cdk8s-catalog-${name}` },
        },
        dotnet: {
          namespace: `CdkX.Cdk8sCatalog.${className}`,
          packageId: `CdkX.Cdk8sCatalog.${className}`,
        },
        go: { moduleName: 'github.com/cdk-x/cdk8s-catalog-go' },
      },
    };
    json.dependencies = {
      ...json.dependencies,
      '@cdk-x/cdk8s-core': versions.coreRange,
      cdk8s: versions.cdk8sRange,
      [versions.cdk8sPlusPackage]: versions.cdk8sPlusRange,
      constructs: versions.constructsRange,
    };
    json.peerDependencies = {
      '@cdk-x/cdk8s-core': versions.coreRange,
      cdk8s: versions.cdk8sRange,
      [versions.cdk8sPlusPackage]: versions.cdk8sPlusRange,
      constructs: versions.constructsRange,
    };
    json.devDependencies = {
      '@cdk-x/cdk8s-core': versions.coreVersion,
      cdk8s: versions.cdk8sVersion,
      [versions.cdk8sPlusPackage]: versions.cdk8sPlusVersion,
      constructs: versions.constructsVersion,
    };
    json.bundledDependencies = ['tslib'];
    return json;
  });
}

/**
 * Two reasons @nx/dependency-checks needs to ignore some deps here, neither
 * of which @nx/js:library's eslint.config.mjs template has an option for
 * (so it's patched in as text):
 *  - @cdk-x/cdk8s-core: jsii can't parse the "workspace:*" protocol as a
 *    semver range, so package.json pins it to a real range instead - without
 *    this, the rule would rewrite it back to "workspace:*" on every
 *    --fix/sync.
 *  - cdk8s, cdk8s-plus-<N>: every catalog library depends on these (see
 *    docs/building-a-library.md), but the freshly generated skeleton has no
 *    per-kind constructs yet, so nothing imports them. Remove these two from
 *    ignoredDependencies once the first src/<kind>/ construct is added.
 */
function ignoreUnusedCatalogDependenciesInEslintChecks(
  tree: Tree,
  projectRoot: string,
  cdk8sPlusPackage: string,
): void {
  const eslintPath = `${projectRoot}/eslint.config.mjs`;
  const content = tree.read(eslintPath, 'utf-8');
  if (!content) {
    throw new Error(`Expected ${eslintPath} to exist after running @nx/js:library.`);
  }
  if (!IGNORED_FILES_ARRAY_PATTERN.test(content)) {
    throw new Error(
      `Could not find the @nx/dependency-checks ignoredFiles array in ${eslintPath} - @nx/js:library's eslint template may have changed.`,
    );
  }
  tree.write(
    eslintPath,
    content.replace(
      IGNORED_FILES_ARRAY_PATTERN,
      (match) => `${match}, ignoredDependencies: ['@cdk-x/cdk8s-core', 'cdk8s', '${cdk8sPlusPackage}']`,
    ),
  );
}

/**
 * Registers the new library in docs/libraries/index.md's table - the one
 * piece of "catalog registration" that isn't automatic by target/folder
 * presence (see tools/list-release-projects.mjs, tools/list-docs-projects.mjs
 * and tools/docs-prepare-library.mjs, none of which need this generator to
 * touch them). Best-effort: if the table's shape ever changes, this silently
 * leaves the row for the author to add by hand instead of corrupting the file.
 */
function registerInLibrariesIndex(tree: Tree, name: string, className: string, description: string): void {
  const indexPath = 'docs/libraries/index.md';
  const content = tree.read(indexPath, 'utf-8');
  if (!content) return;

  const marker = '\n\nNew to the catalog?';
  if (!content.includes(marker)) return;

  const row = `| [${className}](${name}/) | \`@cdk-x/${name}\` | ${description} |`;
  tree.write(indexPath, content.replace(marker, `\n${row}${marker}`));
}

export async function cdk8sLibraryGenerator(
  tree: Tree,
  options: Cdk8sLibraryGeneratorSchema,
): Promise<GeneratorCallback> {
  if (!NAME_PATTERN.test(options.name)) {
    throw new Error(`"${options.name}" must be kebab-case (e.g. "ingress-nginx").`);
  }

  const projectRoot = `packages/${options.name}`;
  if (tree.exists(projectRoot)) {
    throw new Error(`${projectRoot} already exists.`);
  }

  const versions = readReferenceVersions(tree);
  const { className, fileName } = names(options.name);
  const description = options.description ?? `@cdk-x/${options.name} - a cdk8s catalog library.`;
  const keywords = ['cdk8s', 'cdk', 'constructs', 'kubernetes', ...(options.keywords ?? [])];

  // Base TS library scaffold - tsconfig*, jest, eslint, README, package.json,
  // project.json, the root tsconfig.json project reference - all come from
  // Nx's own generator instead of being hand-duplicated here.
  const libraryTask = await libraryGenerator(tree, {
    directory: projectRoot,
    publishable: true,
    importPath: `@cdk-x/${options.name}`,
    bundler: 'tsc',
    unitTestRunner: 'jest',
    linter: 'eslint',
    useProjectJson: true,
    testEnvironment: 'node',
  });

  // Replace the default src/lib/<name>.ts scaffold with the catalog's flat
  // per-kind layout (docs/building-a-library.md): a composition-root Chart
  // at src/<name>.ts, one folder per Kubernetes kind added by hand later.
  tree.delete(`${projectRoot}/src/lib`);
  generateFiles(tree, path.join(__dirname, 'files'), projectRoot, {
    name: options.name,
    className,
    description,
  });

  addJsiiPackageJson(
    tree,
    projectRoot,
    options.name,
    className,
    fileName.replace(/-/g, '_'),
    options.name.replace(/-/g, ''),
    keywords,
    versions,
  );
  ignoreUnusedCatalogDependenciesInEslintChecks(tree, projectRoot, versions.cdk8sPlusPackage);

  updateJson(tree, `${projectRoot}/tsconfig.lib.json`, (json) => {
    json.references = [{ path: '../cdk8s-core/tsconfig.lib.json' }];
    return json;
  });

  updateJson(tree, `${projectRoot}/project.json`, (json) => {
    delete json['// targets'];
    json.name = `@cdk-x/${options.name}`;
    json.targets = catalogTargets(options.name);
    return json;
  });

  registerInLibrariesIndex(tree, options.name, className, description);

  await formatFiles(tree);

  // prettier's markdown formatter (run above) escapes the underscore in
  // "_compat.md"/"_lang-switcher.md" as "\_compat.md" inside the --8<--
  // snippet-include lines, which mkdocs' pymdownx.snippets then can't
  // resolve as a path. Unescape those two include lines after formatting.
  const docsIndexPath = `${projectRoot}/docs/index.md`;
  const docsIndexContent = tree.read(docsIndexPath, 'utf-8');
  if (docsIndexContent?.includes('\\_')) {
    tree.write(docsIndexPath, docsIndexContent.replace(/\\_/g, '_'));
  }

  return runTasksInSerial(libraryTask, () => installPackagesTask(tree));
}

export default cdk8sLibraryGenerator;
