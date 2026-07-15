// Deploys the catalog's own evergreen docs (Home, Core, Libraries index)
// directly to the root of gh-pages - no version folder, no redirect stub,
// unlike a library's docs (which are versioned by mike, see
// tools/docs-deploy-library.mjs).
//
// mike always organizes content under a version folder with a redirect at
// the root, and plain `mkdocs gh-deploy` replaces the whole branch tree
// (wiping libraries/*, which each library deploys independently under its
// own prefix) - neither fits "catalog content lives flat at the root,
// libraries/* is left alone". So this does the git plumbing directly: build
// the site, then in a throwaway worktree of gh-pages, replace everything at
// the root except .git and libraries/ with the fresh build.
//
// Only deploys from `main` - an older maintenance branch (e.g. once main
// moves on to target a newer Kubernetes generation) must not overwrite the
// catalog's evergreen content with its own older copy.
//
// For a local preview that doesn't touch gh-pages at all, use
// `nx run @cdk-x/cdk8s-catalog:docs-preview` instead.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const branch = execFileSync('git', ['branch', '--show-current'], {
  encoding: 'utf-8',
}).trim();

if (branch !== 'main') {
  console.log(
    `On branch "${branch}" (not main) - the catalog site is only deployed from main.`,
  );
  process.exit(0);
}

execFileSync('mkdocs', ['build', '--strict'], { stdio: 'inherit' });

let hasGhPages = true;
try {
  execFileSync('git', ['rev-parse', '--verify', 'gh-pages'], { stdio: 'ignore' });
} catch {
  hasGhPages = false;
}

const worktreeDir = mkdtempSync(join(tmpdir(), 'cdk8s-catalog-gh-pages-'));
if (hasGhPages) {
  execFileSync('git', ['worktree', 'add', worktreeDir, 'gh-pages'], { stdio: 'inherit' });
} else {
  execFileSync('git', ['worktree', 'add', '--orphan', '-b', 'gh-pages', worktreeDir], {
    stdio: 'inherit',
  });
}

try {
  for (const entry of readdirSync(worktreeDir)) {
    if (entry === '.git' || entry === 'libraries') continue;
    rmSync(join(worktreeDir, entry), { recursive: true, force: true });
  }
  cpSync('site', worktreeDir, { recursive: true });
  // GitHub Pages runs Jekyll by default, which ignores files/dirs starting
  // with an underscore or dot - this opts out of that processing entirely.
  writeFileSync(join(worktreeDir, '.nojekyll'), '');

  execFileSync('git', ['add', '-A'], { cwd: worktreeDir, stdio: 'inherit' });
  const hasChanges =
    execFileSync('git', ['status', '--porcelain'], { cwd: worktreeDir, encoding: 'utf-8' }).trim()
      .length > 0;
  if (hasChanges) {
    execFileSync('git', ['commit', '-m', 'Deploy catalog site'], {
      cwd: worktreeDir,
      stdio: 'inherit',
    });
    execFileSync('git', ['push', 'origin', 'gh-pages'], { cwd: worktreeDir, stdio: 'inherit' });
  } else {
    console.log('Nothing to deploy - catalog site unchanged.');
  }
} finally {
  execFileSync('git', ['worktree', 'remove', worktreeDir, '--force']);
}
