import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SCAFFOLD_FILES } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson } from '../format.js';

export function registerSetupTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'setup',
    'Scaffold a new personal-context directory structure with default plan, roadmap, and progress files.',
    {
      dir: z.string().optional().describe('Target directory name or path (defaults to current)'),
    },
    async ({ dir }) => {
      try {
        const target = dir ? join(process.cwd(), dir) : ctx.root;

        if (existsSync(target)) {
          if (existsSync(join(target, '.git'))) return toError(`"${target}" already exists and is a git repo.`);
          const files = readdirSync(target);
          if (files.length > 0) return toError(`"${target}" already exists and is not empty.`);
        }

        const subdirs = ['', 'bin', 'plans', 'roadmaps', 'progress', 'ideas', 'references', 'archive'];
        for (const d of subdirs) mkdirSync(join(target, d), { recursive: true });

        for (const [filepath, content] of Object.entries(SCAFFOLD_FILES)) {
          writeFileSync(join(target, filepath), content, 'utf-8');
        }

        const pkg = {
          name: 'personal-context',
          private: true,
          type: 'module',
          scripts: { ctx: 'bun run bin/ctx.ts' },
          dependencies: { '@pc-ctx/cli': '^0.1.0' },
        };
        writeFileSync(join(target, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
        const proxyBin = `#!/usr/bin/env node\nimport('@pc-ctx/cli').catch(() => {\n  console.error('Install @pc-ctx/cli first: pnpm add @pc-ctx/cli');\n  process.exit(1);\n});\n`;
        writeFileSync(join(target, 'bin', 'ctx.ts'), proxyBin, 'utf-8');

        return {
          content: [{ type: 'text' as const, text: toJson({ ok: true, path: target } as { ok: true; path: string }) }],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
