// Prepares generated assets shared by every library's docs site
// (packages/*/docs/), before mkdocs builds them:
//
// - _compat.md: a Kubernetes-compatibility admonition, derived from
//   version.json so it always reflects the branch it runs on - each
//   library's major version tracks the Kubernetes generation it targets
//   (e.g. 1.x.x for Kubernetes 1.34, 2.x.x for 1.35, ...).
// - stylesheets/extra.css: copied from the catalog's own docs/ so each
//   library's site matches the catalog's look, without every
//   packages/*/mkdocs.yml needing its own copy kept in sync by hand.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { kubernetes } = JSON.parse(readFileSync('version.json', 'utf-8'));

const compatContent = `!!! info "Kubernetes compatibility"
    This version targets **Kubernetes ${kubernetes}**.
`;

for (const name of readdirSync('packages')) {
  const docsDir = join('packages', name, 'docs');
  try {
    if (!statSync(docsDir).isDirectory()) continue;
  } catch {
    continue; // no docs/ for this package
  }

  writeFileSync(join(docsDir, '_compat.md'), compatContent);

  const stylesheetsDir = join(docsDir, 'stylesheets');
  mkdirSync(stylesheetsDir, { recursive: true });
  copyFileSync('docs/stylesheets/extra.css', join(stylesheetsDir, 'extra.css'));

  console.log(`Prepared ${docsDir} (Kubernetes ${kubernetes})`);
}
