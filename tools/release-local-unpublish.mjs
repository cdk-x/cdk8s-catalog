// npm registries treat published versions as immutable, so republishing the same
// version (e.g. running `release-local` again without a new commit to bump it) would
// normally fail. The local Verdaccio registry is throwaway (.verdaccio/config.yml
// grants unpublish: $all), so we clear each project's about-to-be-published version
// first. This keeps versions predictable across repeated local test runs - always the
// same "next" version until a real commit bumps it - so you can always install with
// e.g. `pnpm add @cdk-x/metric-server --registry=http://localhost:4873` and get the
// latest local build without needing to know an exact version string.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REGISTRY = 'http://localhost:4873';

const projects = JSON.parse(
  execFileSync('pnpm', ['nx', 'show', 'projects', '--json', '--with-target', 'nx-release-publish'], {
    encoding: 'utf-8',
  }),
);

for (const project of projects) {
  const { root } = JSON.parse(
    execFileSync('pnpm', ['nx', 'show', 'project', project, '--json'], { encoding: 'utf-8' }),
  );
  const { name, version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

  try {
    execFileSync('npm', ['unpublish', `${name}@${version}`, '--registry', REGISTRY, '--force'], {
      stdio: 'inherit',
    });
  } catch {
    // Nothing published at this version yet on the local registry - fine, continue.
  }
}
