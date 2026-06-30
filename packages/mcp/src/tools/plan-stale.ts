import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { checkStale } from '@pc-ctx/core';
import { toError, toJson } from '../format.js';

export function registerPlanStaleTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'plan_stale',
    'Detect stale plans (all tasks done but active), idle plans (>14d untouched), and outdated focus (now.md not updated today)',
    {},
    async () => {
      try {
        const result = checkStale(ctx.root);
        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
