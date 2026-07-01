import { isAbsolute, join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { scaffoldContext } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson } from '../format.js';

export function registerSetupTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'setup',
    'Scaffold (or top up) a context directory structure (plans, roadmaps, progress, etc.). Idempotent. Does NOT run git — git init + remote setup are CLI-only.',
    {
      name: z.string().optional().describe('Context directory name (defaults to the configured root)'),
      dir: z.string().optional().describe('Parent directory for a named context (defaults to cwd)'),
    },
    async ({ name, dir }) => {
      try {
        // With a name, scaffold under dir/name; otherwise top up the configured root.
        const target = name
          ? join(dir ? (isAbsolute(dir) ? dir : join(process.cwd(), dir)) : process.cwd(), name)
          : ctx.root;

        const { created, existing } = scaffoldContext(target, name ? { name } : {});

        // The MCP server can't run git interactively, so post-scaffold git/remote
        // steps are CLI-only — point the user at the CLI (with an npx fallback).
        const git =
          created.length > 0
            ? `Scaffolded. git init + remote setup are CLI-only (the MCP can't run git): run \`ctx setup\` in ${target}, or \`npx @pc-ctx/cli setup\` if the CLI isn't installed.`
            : 'Already complete — nothing added.';

        return {
          content: [
            {
              type: 'text' as const,
              text: toJson({ ok: true, path: target, created, existing, git }),
            },
          ],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
