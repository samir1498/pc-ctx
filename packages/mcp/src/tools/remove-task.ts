import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerRemoveTaskTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_remove_task',
    'Remove a task from a plan.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      id: z.string().min(1).describe('Task ID'),
    },
    async ({ slug, id }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find((p) => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        if (!plan.frontmatter.tasks) return toError(`Plan "${slug}" has no tasks.`);
        const idx = plan.frontmatter.tasks.findIndex((t) => t.id === id);
        if (idx === -1) return toError(`Task "${id}" not found in "${slug}".`);
        plan.frontmatter.tasks.splice(idx, 1);
        writePlanFileAtomic(plan);
        return { content: [{ type: 'text' as const, text: toJson({ slug, taskId: id, ok: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
