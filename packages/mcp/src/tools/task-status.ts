import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VALID_TASK_STATUSES, readAllPlans, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerTaskStatusTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_task_status',
    'Update a task status to pending, in-progress, done, blocked, or cancelled.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      id: z.string().min(1).describe('Task ID'),
      status: z.enum(VALID_TASK_STATUSES as [string, ...string[]]).describe('New task status'),
    },
    async ({ slug, id, status }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find((p) => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        if (!plan.frontmatter.tasks) return toError(`Plan "${slug}" has no tasks.`);
        const task = plan.frontmatter.tasks.find((t) => t.id === id);
        if (!task) return toError(`Task "${id}" not found in "${slug}".`);
        task.status = status;
        writePlanFileAtomic(plan);
        return {
          content: [
            {
              type: 'text' as const,
              text: toJson({ slug, taskId: id, status, ok: true } as {
                slug: string;
                taskId: string;
                status: string;
                ok: true;
              }),
            },
          ],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
