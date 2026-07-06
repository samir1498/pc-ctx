export default {
  entry: ['packages/*/src/index.ts'],
  project: ['packages/*/src/**/*.ts'],
  ignore: ['packages/*/src/**/*.spec.ts', 'packages/core/src/backfill-completed-at.ts'],
  ignoreExportsUsedInFile: true,
  ignoreBinaries: ['fallow', 'dot', 'gh'],
  ignoreDependencies: ['@types/node', '@vitest/coverage-v8', 'typescript', '@pc-ctx/core'],
};
