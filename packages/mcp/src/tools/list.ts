import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fmtTasks, readAllPlans } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson, truncateList } from '../format.js';

export function registerListTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_list',
    'List all plans with optional status/category filters. Returns a table of slug, status, category, priority, and task progress.',
    {
      status: z.enum(['active', 'paused', 'done', 'cancelled']).optional().describe('Filter by status'),
      category: z.string().optional().describe('Filter by category'),
      since: z.string().optional().describe('Filter by completed_at >= YYYY-MM-DD'),
      until: z.string().optional().describe('Filter by completed_at <= YYYY-MM-DD'),
    },
    async ({ status, category, since, until }) => {
      try {
        let plans = readAllPlans(ctx.plansDir);
        if (status) plans = plans.filter((p) => p.frontmatter.status === status);
        if (category) plans = plans.filter((p) => p.frontmatter.category === category);
        if (since) plans = plans.filter((p) => (p.frontmatter.completed_at as string) >= since);
        if (until) plans = plans.filter((p) => (p.frontmatter.completed_at as string) <= until);

        const rows = plans.map((p) => ({
          slug: p.slug,
          title: p.frontmatter.title,
          status: p.frontmatter.status,
          category: p.frontmatter.category,
          priority: p.frontmatter.priority ?? null,
          tasks: fmtTasks(p.frontmatter.tasks),
          ...(p.frontmatter.completed_at ? { completed_at: p.frontmatter.completed_at } : {}),
        }));

        const { items, total, note } = truncateList(rows);
        return { content: [{ type: 'text' as const, text: toJson(note ? { items, total, note } : items) }] };
      } catch (e) {
        return toError(String(e), 'Check that the plans directory exists and is readable.');
      }
    },
  );
}
