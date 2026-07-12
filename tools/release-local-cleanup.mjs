// Discards the local, uncommitted side effects of `release-local`: the version
// bump in each publishable library's package.json, its CHANGELOG.md entry, and
// the resulting pnpm-lock.yaml update. Publishing to the local Verdaccio registry
// is meant purely for testing, so none of this should linger as working-tree noise.
//
// Files that already exist in HEAD are restored (index + working tree) from there;
// files that don't (e.g. a project's first-ever CHANGELOG.md) are unstaged and deleted.
//
// Note: `nx release version`/`changelog` run `git add` on the files they touch even
// with --git-commit=false ("Staging changed files with git"), so a plain
// `git checkout -- <path>` is a no-op here - it restores the working tree from the
// (already dirty) index, not from HEAD. `git checkout HEAD -- <path>` is required to
// actually discard the change. Likewise, checking "is this tracked?" via `git ls-files`
// would report a staged-but-never-committed new file as tracked, so we check
// existence in HEAD directly instead.
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function existsInHead(path) {
  try {
    execFileSync('git', ['cat-file', '-e', `HEAD:${path}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function restore(path) {
  if (existsInHead(path)) {
    execFileSync('git', ['checkout', 'HEAD', '--', path], { stdio: 'inherit' });
    return;
  }
  // Never committed: drop it from the index (if staged) and delete it.
  try {
    execFileSync('git', ['reset', '-q', 'HEAD', '--', path], { stdio: 'ignore' });
  } catch {
    // Not in the index either - nothing to unstage.
  }
  if (existsSync(path)) {
    rmSync(path, { force: true });
  }
}

const projects = JSON.parse(
  execFileSync('pnpm', ['nx', 'show', 'projects', '--json', '--with-target', 'nx-release-publish'], {
    encoding: 'utf-8',
  }),
);

for (const project of projects) {
  const { root } = JSON.parse(
    execFileSync('pnpm', ['nx', 'show', 'project', project, '--json'], { encoding: 'utf-8' }),
  );
  restore(join(root, 'package.json'));
  restore(join(root, 'CHANGELOG.md'));
}

restore('pnpm-lock.yaml');
