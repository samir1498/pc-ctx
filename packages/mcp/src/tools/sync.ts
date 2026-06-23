import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { spawnSync } from 'node:child_process';
import { toJson, toError } from '../format.js';

export function registerSyncTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'sync',
    'Sync plans to/from the Git remote. Pulls before pushing by default.',
    {
      push: z.boolean().optional().default(false).describe('Push only, skip pull'),
      pull: z.boolean().optional().default(false).describe('Pull only, skip push'),
    },
    async ({ push, pull }) => {
      try {
        const messages: string[] = [];

        if (!push) {
          messages.push('Pulling from remote...');
          const pullResult = spawnSync('git', ['pull'], { cwd: ctx.root, stdio: 'pipe', encoding: 'utf-8' });
          if (pullResult.status !== 0) return toError(`Pull failed: ${pullResult.stderr || pullResult.stdout}`);
          messages.push(pullResult.stdout.trim());
        }

        if (!pull) {
          messages.push('Pushing to remote...');
          const pushResult = spawnSync('git', ['push'], { cwd: ctx.root, stdio: 'pipe', encoding: 'utf-8' });
          if (pushResult.status !== 0) return toError(`Push failed: ${pushResult.stderr || pushResult.stdout}`);
          messages.push(pushResult.stdout.trim());
        }

        const result = { ok: true, messages };
        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
