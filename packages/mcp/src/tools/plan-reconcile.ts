import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { gitReconcile } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson } from '../format.js';

export function registerPlanReconcileTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'plan_reconcile',
    'Scan git log for ctx: trailers and cross-reference against plan tasks. Default dry-run; set apply:true to modify plan files.',
    {
      apply: z.boolean().optional().describe('Apply changes to plan files (default false = dry-run)'),
      commits: z.number().optional().describe('Number of recent commits to scan (default 50)'),
    },
    async ({ apply, commits }) => {
      try {
        const result = gitReconcile(ctx.root, { apply, commits });
        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
