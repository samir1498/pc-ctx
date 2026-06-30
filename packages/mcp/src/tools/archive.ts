import { mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans } from '@pc-ctx/core';
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
        const archiveDir = join(ctx.plansDir, 'archived');
        mkdirSync(archiveDir, { recursive: true });
        const src = join(plan.dir, plan.filename);
        const dest = join(archiveDir, plan.filename);
        renameSync(src, dest);
        return { content: [{ type: 'text' as const, text: toJson({ slug, archived: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
