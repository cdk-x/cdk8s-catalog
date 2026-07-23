// Runs `nx <args> --json` and parses its output as JSON.
//
// Deliberately invokes `pnpm exec nx` rather than `pnpm nx`: the latter goes
// through pnpm's own "run an unrecognized command as a workspace binary"
// resolution path, which prints its own lockfile/supply-chain verification
// banner to stdout ahead of nx's real output - `pnpm exec` skips that path
// entirely, so stdout is exactly nx's own JSON with nothing to strip.
import { execFileSync } from 'node:child_process';

export function nxJson(args) {
  const stdout = execFileSync('pnpm', ['exec', 'nx', ...args, '--json'], { encoding: 'utf-8' });
  return JSON.parse(stdout);
}
