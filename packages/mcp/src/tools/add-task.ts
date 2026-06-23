import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, serializePlanFile } from '@pc-ctx/core';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { toJson, toError, notFound } from '../format.js';

export function registerAddTaskTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_add_task',
    'Add a task to an existing plan.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      id: z.string().min(1).describe('Task ID (e.g. T3)'),
      desc: z.string().min(1).describe('Task description'),
      status: z.enum(['pending', 'in-progress', 'done', 'blocked']).optional().default('pending').describe('Initial task status'),
    },
    async ({ slug, id, desc, status }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find(p => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        if (!plan.frontmatter.tasks) plan.frontmatter.tasks = [];
        if (plan.frontmatter.tasks.some(t => t.id === id)) return toError(`Task "${id}" already exists in "${slug}".`);
        plan.frontmatter.tasks.push({ id, desc, status: status ?? 'pending' });
        writeFileSync(join(plan.dir, plan.filename), serializePlanFile(plan), 'utf-8');
        return { content: [{ type: 'text' as const, text: toJson({ slug, taskId: id, ok: true } as { slug: string; taskId: string; ok: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
