import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { setPlanStatus } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerSetStatusTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_set_status',
    'Update a plan status to active, paused, done, or cancelled. Done also moves the plan to plans/archived/.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      status: z.enum(['active', 'paused', 'done', 'cancelled']).describe('New status'),
    },
    async ({ slug, status }) => {
      try {
        const plan = setPlanStatus(ctx.plansDir, slug, status);
        if (!plan) return notFound('plan', slug);
        const archived = status === 'done';
        return { content: [{ type: 'text' as const, text: toJson({ slug, status, archived, ok: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
