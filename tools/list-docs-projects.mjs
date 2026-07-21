// Lists every library with docs (i.e. a `docs-deploy` Nx target) as a JSON
// array of short names on stdout, e.g. ["metric-server"].
//
// The root catalog project (@cdk-x/cdk8s-catalog) also has a docs-deploy
// target but is deliberately excluded here - it's deployed as its own
// always-run step in .github/workflows/docs-deploy.yml, not looped over
// with the libraries.
//
// Optional first arg filters the result, accepting either shape (the two
// workflow triggers produce different formats):
//   - a JSON array of {name, root} objects, e.g. build-jsii's `projects`
//     output from release.yml (matched by `.name`)
//   - a comma/space-separated list of short names, e.g. "metric-server
//     cdk8s-core" (the workflow_dispatch-friendly form)
// Empty/omitted = no filter, every doc-enabled library.
import { execFileSync } from 'node:child_process';

const ROOT_PROJECT = '@cdk-x/cdk8s-catalog';

function parseFilter(raw) {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    return JSON.parse(trimmed).map((entry) => entry.name);
  }

  return trimmed
    .split(/[\s,]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

const filter = parseFilter(process.argv[2]);

const projects = JSON.parse(
  execFileSync('pnpm', ['nx', 'show', 'projects', '--json', '--with-target', 'docs-deploy'], {
    encoding: 'utf-8',
  }),
).filter((project) => project !== ROOT_PROJECT);

const result = projects
  .map((project) => {
    const { root } = JSON.parse(
      execFileSync('pnpm', ['nx', 'show', 'project', project, '--json'], { encoding: 'utf-8' }),
    );
    return root.split('/').pop();
  })
  .filter((name) => filter.length === 0 || filter.includes(name));

process.stdout.write(JSON.stringify(result));
