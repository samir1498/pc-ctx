import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { archivePlanFile, readAllPlans } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerArchiveTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_archive',
    'Move a plan to the archive.',
    {
      slug: z.string().min(1).describe('Plan slug'),
    },
    async ({ slug }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find((p) => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        archivePlanFile(ctx.plansDir, plan.dir, plan.filename);
        return { content: [{ type: 'text' as const, text: toJson({ slug, archived: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
