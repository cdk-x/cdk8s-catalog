// Runs `nx <args> --json` and parses its output as JSON.
//
// Passes --silent to pnpm itself (before the nx args): pnpm's own reporter
// prints a "Scope: all N workspace projects" line to stdout ahead of nx's
// real output whenever it decides the invocation spans more than one
// workspace package - observed on fresh CI runners (empty lockfile/store
// verification cache) but not reliably on an already-warmed local machine.
// --silent suppresses that reporter unconditionally, so stdout is always
// exactly nx's own JSON.
import { execFileSync } from 'node:child_process';

export function nxJson(args) {
  const stdout = execFileSync('pnpm', ['--silent', 'nx', ...args, '--json'], { encoding: 'utf-8' });
  return JSON.parse(stdout);
}
