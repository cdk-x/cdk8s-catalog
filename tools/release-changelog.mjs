// Generates a per-project changelog entry for every publishable library, using
// each project's current on-disk version (already bumped by `nx release version`).
//
// `nx release changelog` requires an explicit version when invoked directly, and
// since projectsRelationship is "independent" each library can be on a different
// version - so it can't be driven by a single `nx release changelog <version>` call
// the way a "fixed" release group could. This loops per project instead.
//
// Used by the real release workflow (.github/workflows/release.yml), where git
// actions are enabled. Any CLI args passed to this script (e.g. --git-commit
// --git-tag --first-release --dry-run) are forwarded as-is to each `nx release
// changelog` invocation. Deliberately kept separate from
// tools/release-local-changelog.mjs (verdaccio dry-run path) so the two flows
// can't affect each other.
//
// --projects=<comma/space-separated Nx project names> is handled here, not
// forwarded (each `nx release changelog` call already gets its own explicit
// `-p <project>`) - mirrors the `projects` workflow_dispatch input, so a
// first-release run can target just the new library.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rawArgs = process.argv.slice(2);
const projectsArg = rawArgs.find((arg) => arg.startsWith('--projects='));
const filter = projectsArg
  ? projectsArg
      .slice('--projects='.length)
      .split(/[\s,]+/)
      .map((name) => name.trim())
      .filter(Boolean)
  : [];
const extraArgs = rawArgs.filter((arg) => arg !== projectsArg);

const projects = JSON.parse(
  execFileSync('pnpm', ['nx', 'show', 'projects', '--json', '--with-target', 'nx-release-publish'], {
    encoding: 'utf-8',
  }),
).filter((project) => filter.length === 0 || filter.includes(project));

for (const project of projects) {
  const { root } = JSON.parse(
    execFileSync('pnpm', ['nx', 'show', 'project', project, '--json'], { encoding: 'utf-8' }),
  );
  const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

  execFileSync(
    'pnpm',
    ['nx', 'release', 'changelog', version, '-p', project, '--git-push=false', ...extraArgs],
    { stdio: 'inherit' },
  );
}
