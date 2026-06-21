/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'circular dependencies make code harder to reason about',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'modules not imported by anything',
      from: { orphan: true, pathNot: ['packages/cli/src/index\\.ts', 'packages/mcp/src/index\\.ts', '.*\\.spec\\.ts'] },
      to: {},
    },
    {
      name: 'core-not-to-cli-or-mcp',
      severity: 'error',
      comment: '@pc-ctx/core is the bottom layer and must not depend on cli or mcp',
      from: { path: '^packages/core/src/' },
      to: { path: '^packages/(cli|mcp)/src/' },
    },
    {
      name: 'cli-not-to-mcp',
      severity: 'error',
      comment: '@pc-ctx/cli must not depend on @pc-ctx/mcp',
      from: { path: '^packages/cli/src/' },
      to: { path: '^packages/mcp/src/' },
    },
    {
      name: 'mcp-not-to-cli',
      severity: 'error',
      comment: '@pc-ctx/mcp must not depend on @pc-ctx/cli',
      from: { path: '^packages/mcp/src/' },
      to: { path: '^packages/cli/src/' },
    },
  ],
  options: {
    doNotFollow: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer'] },
    includeOnly: '^packages',
    exclude: { path: '(node_modules|dist)' },
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'default'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+',
        theme: {
          modules: [
            {
              criteria: { source: '^packages/core/src/' },
              attributes: { color: '#a855f7', shape: 'box', style: 'filled', fillcolor: '#f3e8ff' },
            },
            {
              criteria: { source: '^packages/cli/src/' },
              attributes: { color: '#3b82f6', shape: 'box', style: 'filled', fillcolor: '#eff6ff' },
            },
            {
              criteria: { source: '^packages/mcp/src/' },
              attributes: { color: '#22c55e', shape: 'box', style: 'filled', fillcolor: '#f0fdf4' },
            },
          ],
        },
      },
    },
  },
};
