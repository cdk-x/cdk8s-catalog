import { createRequire } from 'node:module';

export interface CatalogLibraryInfo {
  readonly name: string;
  readonly version: string;
}

/**
 * Reads `{ name, version }` from a `package.json`, resolved relative to
 * `moduleUrl` (pass `import.meta.url` from the calling module). The npm scope
 * (e.g. `@cdk-x/`) is stripped from `name`.
 *
 * @param moduleUrl `import.meta.url` of the calling module.
 * @param relativePathToPackageJson path to `package.json` relative to that module.
 * @default '../package.json' — correct when called from a file directly under
 * the package's `src/` (e.g. the root chart class, one level deep).
 */
export function readCatalogLibraryInfo(
  moduleUrl: string,
  relativePathToPackageJson = '../package.json',
): CatalogLibraryInfo {
  const require = createRequire(moduleUrl);
  const pkg = require(relativePathToPackageJson) as {
    name: string;
    version: string;
  };
  return { name: pkg.name.replace(/^@[^/]+\//, ''), version: pkg.version };
}
