import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, serializePlanFile, VALID_TASK_STATUSES } from '@pc-ctx/core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toJson, toError, notFound } from '../format.js';

export function registerTaskStatusTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_task_status',
    'Update a task status to pending, in-progress, done, or blocked.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      id: z.string().min(1).describe('Task ID'),
      status: z.enum(['pending', 'in-progress', 'done', 'blocked']).describe('New task status'),
    },
    async ({ slug, id, status }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find(p => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        if (!plan.frontmatter.tasks) return toError(`Plan "${slug}" has no tasks.`);
        const task = plan.frontmatter.tasks.find(t => t.id === id);
        if (!task) return toError(`Task "${id}" not found in "${slug}".`);
        task.status = status;
        writeFileSync(join(plan.dir, plan.filename), serializePlanFile(plan), 'utf-8');
        return { content: [{ type: 'text' as const, text: toJson({ slug, taskId: id, status, ok: true } as { slug: string; taskId: string; status: string; ok: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
