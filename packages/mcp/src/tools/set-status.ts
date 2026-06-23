import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, serializePlanFile, VALID_STATUSES } from '@pc-ctx/core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toJson, toError, notFound } from '../format.js';

export function registerSetStatusTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_set_status',
    'Update a plan status to active, paused, done, or cancelled.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      status: z.enum(['active', 'paused', 'done', 'cancelled']).describe('New status'),
    },
    async ({ slug, status }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find(p => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        plan.frontmatter.status = status;
        writeFileSync(join(plan.dir, plan.filename), serializePlanFile(plan), 'utf-8');
        return { content: [{ type: 'text' as const, text: toJson({ slug, status, ok: true } as { slug: string; status: string; ok: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
