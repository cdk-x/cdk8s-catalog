// Builds the catalog + every library's docs into a local, disposable
// directory (.docs-preview/, gitignored - never a git branch, never
// touches/creates gh-pages) laid out exactly like the real deploy would
// (catalog flat at root, each library under libraries/<name>/<version>/ with
// its own versions.json/latest), then serves it with a plain static file
// server so the cross-links and each library's version dropdown can be
// checked for real before anything is actually deployed.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// mkdocs resolves a relative --site-dir against the config file's own
// directory, not the cwd - every --site-dir below must be absolute so a
// library's build (config lives in packages/<name>/) still lands under this
// same repo-root-relative preview tree.
const PREVIEW_DIR = resolve('.docs-preview');
const PORT = 8000;
const LOCAL_URL = `http://localhost:${PORT}/`;

// Each library's mkdocs.yml links back to the catalog root (e.g. the "Home"
// nav item) via this real, absolute production URL - it has to be absolute
// since it points at a completely separate mkdocs build. Read it once here
// so it can be rewritten to LOCAL_URL in every generated page below, or
// clicking "Home" during a local preview would leave localhost entirely.
const ROOT_SITE_URL = readFileSync('mkdocs.yml', 'utf-8').match(/^site_url:\s*(\S+)/m)[1];

function rewriteRootUrlToLocal(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const path = join(entry.parentPath ?? entry.path, entry.name);
    const html = readFileSync(path, 'utf-8');
    const rewritten = html.split(ROOT_SITE_URL).join(LOCAL_URL);
    if (rewritten !== html) writeFileSync(path, rewritten);
  }
}

rmSync(PREVIEW_DIR, { recursive: true, force: true });
mkdirSync(PREVIEW_DIR, { recursive: true });

console.log('Building catalog...');
execFileSync('mkdocs', ['build', '--strict', '--site-dir', PREVIEW_DIR], { stdio: 'inherit' });

// So docs-prepare-library.mjs always finds dist-jsii/docs, whether or not
// it's already been built - run-many silently skips any project without a
// jsii-docs target.
execFileSync('pnpm', ['nx', 'run-many', '-t', 'jsii-docs'], { stdio: 'inherit' });

execFileSync('node', ['tools/docs-prepare-library.mjs'], { stdio: 'inherit' });

for (const name of readdirSync('packages')) {
  const configFile = join('packages', name, 'mkdocs.yml');
  try {
    if (!statSync(configFile).isFile()) continue;
  } catch {
    continue; // no mkdocs.yml for this package
  }

  const { version } = JSON.parse(readFileSync(join('packages', name, 'package.json'), 'utf-8'));
  const libraryDir = join(PREVIEW_DIR, 'libraries', name);
  const versionDir = join(libraryDir, version);

  console.log(`Building ${name}@${version}...`);
  execFileSync('mkdocs', ['build', '--strict', '--config-file', configFile, '--site-dir', versionDir], {
    stdio: 'inherit',
  });
  rewriteRootUrlToLocal(versionDir);

  cpSync(versionDir, join(libraryDir, 'latest'), { recursive: true });
  writeFileSync(
    join(libraryDir, 'versions.json'),
    JSON.stringify([{ version, title: version, aliases: ['latest'] }], null, 2),
  );
  writeFileSync(
    join(libraryDir, 'index.html'),
    `<!doctype html><meta http-equiv="refresh" content="0; url=latest/">`,
  );
}

console.log(`\nServing ${PREVIEW_DIR} at http://localhost:${PORT}/ (Ctrl+C to stop)\n`);
execFileSync('python3', ['-m', 'http.server', String(PORT), '--directory', PREVIEW_DIR], {
  stdio: 'inherit',
});
