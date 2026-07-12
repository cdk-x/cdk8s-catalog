import { readCatalogLibraryInfo } from './package-info.js';

describe('readCatalogLibraryInfo', () => {
  it('reads name (scope stripped) and version from the given package.json', () => {
    const info = readCatalogLibraryInfo(
      import.meta.url,
      './__fixtures__/fake-package/package.json',
    );

    expect(info).toEqual({ name: 'fake-lib', version: '9.9.9' });
  });

  it('reads this package own info (name/version) with an explicit relative path', () => {
    // This spec file lives two levels under the package root (src/lib/), so the
    // default '../package.json' (meant for files directly under src/) doesn't apply here.
    const info = readCatalogLibraryInfo(import.meta.url, '../../package.json');

    expect(info.name).toBe('cdk8s-core');
    expect(info.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
