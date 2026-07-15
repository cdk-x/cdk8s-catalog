// Deploys a single library's own docs site to gh-pages, isolated under
// libraries/<name>/ via mike's --deploy-prefix (verified this doesn't clash
// with the catalog's own Kubernetes-version-scoped deployment at the root of
// the same branch, or with other libraries' prefixes - each gets its own
// versions.json/latest scoped to its prefix).
//
// Versioned by the library's own package.json version, not the Kubernetes
// version - a library's major version tracks the Kubernetes generation it
// targets (e.g. 1.x.x for Kubernetes 1.34, 2.x.x for 1.35, ...), so multiple
// major-version lines coexist under the same prefix and dropdown.
//
// Only `main` moves the "latest" alias/default, for the same reason as the
// catalog's own docs-deploy: once a Kubernetes generation gets its own
// maintenance branch, that branch must only touch its own already-published
// versions, never steal "latest" back from whatever main is currently
// building.
//
// For a local preview that doesn't touch gh-pages at all, use
// `nx run @cdk-x/cdk8s-catalog:docs-preview` instead.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const library = process.argv[2];
if (!library) {
  console.error('Usage: node tools/docs-deploy-library.mjs <library>');
  process.exit(1);
}

const { version } = JSON.parse(
  readFileSync(`packages/${library}/package.json`, 'utf-8'),
);
const branch = execFileSync('git', ['branch', '--show-current'], {
  encoding: 'utf-8',
}).trim();

const configFile = `packages/${library}/mkdocs.yml`;
const deployPrefix = `libraries/${library}`;

execFileSync('node', ['tools/docs-prepare-library.mjs'], { stdio: 'inherit' });

const mike = (args) =>
  execFileSync('mike', [...args, '--config-file', configFile, '--deploy-prefix', deployPrefix], {
    stdio: 'inherit',
  });

if (branch === 'main') {
  mike(['deploy', '--push', '--update-aliases', version, 'latest']);
  mike(['set-default', '--push', 'latest']);
} else {
  console.log(
    `On branch "${branch}" (not main) - deploying ${library}@${version} without touching the "latest" alias.`,
  );
  mike(['deploy', '--push', version]);
}
