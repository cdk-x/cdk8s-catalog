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
          // jsii can't parse the "workspace:*" protocol as a semver range
          // when resolving @cdk-x/cdk8s-core as a jsii dependency, so it's
          // pinned to a real range instead - this rule would otherwise
          // rewrite it back to "workspace:*" on every --fix/sync.
          ignoredDependencies: ['@cdk-x/cdk8s-core'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
  {
    // `src/old` is kept as reference material only; it is excluded from the
    // build (see tsconfig.lib.json) and not linted.
    ignores: ['**/out-tsc', 'src/old/**'],
  },
];
