// Lists every jsii-publishable project (name + root dir) as a JSON array on
// stdout, e.g. [{"name":"cdk8s-core","root":"packages/cdk8s-core"}, ...].
//
// Used by the release workflow to build dynamic matrices (per-package publish
// jobs) without ever having to hardcode/update a package list in the YAML as
// new libraries are added to the catalog.
//
// Optional first arg: comma/space-separated Nx project names (e.g.
// "@cdk-x/metric-server") to filter down to - mirrors the `projects`
// workflow_dispatch input, so a first-release run can target just the new
// library instead of every project with a jsii-publish-npm target.
import { execFileSync } from 'node:child_process';

const filter = (process.argv[2] ?? '')
  .split(/[\s,]+/)
  .map((name) => name.trim())
  .filter(Boolean);

const projects = JSON.parse(
  execFileSync('pnpm', ['nx', 'show', 'projects', '--json', '--with-target', 'jsii-publish-npm'], {
    encoding: 'utf-8',
  }),
).filter((project) => filter.length === 0 || filter.includes(project));

const result = projects.map((project) => {
  const { root } = JSON.parse(
    execFileSync('pnpm', ['nx', 'show', 'project', project, '--json'], { encoding: 'utf-8' }),
  );
  return { name: root.split('/').pop(), root };
});

process.stdout.write(JSON.stringify(result));
