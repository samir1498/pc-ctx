import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findPlan, fmtTasks } from '@pc-ctx/core';
import { toJson, toError, notFound } from '../format.js';

export function registerShowTool(server: McpServer, ctx: { plansDir: string; roadmapsDir: string }) {
  server.tool(
    'plan_show',
    'Show full details of a single plan by slug: metadata, tasks, acceptance criteria, references, and backlinks.',
    {
      slug: z.string().min(1).max(64).describe('Plan slug (e.g. "pc-ctx-core")'),
    },
    async ({ slug }) => {
      try {
        const plan = findPlan(ctx.plansDir, ctx.roadmapsDir, slug);
        if (!plan) return notFound('plan', slug);

        const f = plan.frontmatter;
        const result = {
          slug: f.slug,
          title: f.title,
          status: f.status,
          category: f.category,
          priority: f.priority ?? null,
          tldr: f.tldr,
          tasks: f.tasks?.map(t => ({ id: t.id, title: t.title, desc: t.desc, status: t.status })) ?? [],
          taskSummary: fmtTasks(f.tasks),
          acceptance: f.acceptance ?? [],
          references: f.references ?? [],
        };

        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
