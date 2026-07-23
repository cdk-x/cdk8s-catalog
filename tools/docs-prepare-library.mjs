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
// - api/<lang>.md + _lang-switcher.md: only if dist-jsii/docs exists (run
//   `nx run <pkg>:jsii-docs` first - tools/docs-preview.mjs and
//   .github/workflows/docs-deploy.yml both do). jsii-docgen emits one full
//   API reference per language, all sharing identical heading anchors, so
//   the switcher below can link between them and preserve a deep link to a
//   specific symbol across languages.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const { kubernetes } = JSON.parse(readFileSync('version.json', 'utf-8'));

const compatContent = `!!! info "Kubernetes compatibility"
    This version targets **Kubernetes ${kubernetes}**.
`;

const LANGUAGES = [
  { id: 'typescript', label: 'TypeScript', icon: 'material-language-typescript' },
  { id: 'python', label: 'Python', icon: 'material-language-python' },
  { id: 'java', label: 'Java', icon: 'material-language-java' },
  { id: 'csharp', label: 'C#', icon: 'material-language-csharp' },
  { id: 'go', label: 'Go', icon: 'material-language-go' },
];

function langSwitcher(prefix, exclude) {
  const links = LANGUAGES.filter((lang) => lang.id !== exclude).map(
    (lang) => `[:${lang.icon}: ${lang.label}](${prefix}${lang.id}.md)`,
  );
  return `${links.join(' · ')}\n`;
}

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

  const jsiiDocsDir = join('packages', name, 'dist-jsii', 'docs');
  if (existsSync(jsiiDocsDir)) {
    writeFileSync(join(docsDir, '_lang-switcher.md'), langSwitcher('api/'));

    const apiDir = join(docsDir, 'api');
    mkdirSync(apiDir, { recursive: true });
    for (const { id } of LANGUAGES) {
      const source = join(jsiiDocsDir, `API.${id}.md`);
      if (!existsSync(source)) continue;
      const [heading, ...rest] = readFileSync(source, 'utf-8').split('\n');
      writeFileSync(
        join(apiDir, `${id}.md`),
        [heading, '', langSwitcher('', id), ...rest].join('\n'),
      );
    }
  }

  console.log(`Prepared ${docsDir} (Kubernetes ${kubernetes})`);
}
