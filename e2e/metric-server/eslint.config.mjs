import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: ['{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}'],
          // This project installs from a local Verdaccio registry (its own
          // package-lock.json, outside the pnpm workspace) to test the real
          // published package rather than workspace source. Nx builds its
          // graph's npm nodes from the root pnpm-lock.yaml, which never sees
          // this nested lockfile, so it can never detect `@cdk-x/metric-server`
          // as "used" here even though `src/main.ts` imports it directly.
          checkObsoleteDependencies: false,
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    ignores: ['**/out-tsc'],
  },
];
