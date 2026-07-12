// Generates a per-project changelog entry for every publishable library, using
// each project's current on-disk version (already bumped by `nx release version`).
//
// `nx release changelog` requires an explicit version when invoked directly, and
// since projectsRelationship is "independent" each library can be on a different
// version - so it can't be driven by a single `nx release changelog <version>` call
// the way a "fixed" release group could. This loops per project instead.
//
// `--first-release` is always passed here because `release-local` never creates
// git tags (git-tag=false), so there is never a previous tag for Nx to diff from.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projects = JSON.parse(
  execFileSync('pnpm', ['nx', 'show', 'projects', '--json', '--with-target', 'nx-release-publish'], {
    encoding: 'utf-8',
  }),
);

for (const project of projects) {
  const { root } = JSON.parse(
    execFileSync('pnpm', ['nx', 'show', 'project', project, '--json'], { encoding: 'utf-8' }),
  );
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

  execFileSync(
    'pnpm',
    [
      'nx',
      'release',
      'changelog',
      version,
      '-p',
      project,
      '--first-release',
      '--git-commit=false',
      '--git-tag=false',
      '--git-push=false',
    ],
    { stdio: 'inherit' },
  );
}
