import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, fmtTasks } from '@pc-ctx/core';
import { toJson, toError, truncateList } from '../format.js';

export function registerListTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_list',
    'List all plans with optional status/category filters. Returns a table of slug, status, category, priority, and task progress.',
    {
      status: z.enum(['active', 'paused', 'done', 'cancelled']).optional().describe('Filter by status'),
      category: z.string().optional().describe('Filter by category'),
    },
    async ({ status, category }) => {
      try {
        let plans = readAllPlans(ctx.plansDir);
        if (status) plans = plans.filter(p => p.frontmatter.status === status);
        if (category) plans = plans.filter(p => p.frontmatter.category === category);

        const rows = plans.map(p => ({
          slug: p.slug,
          title: p.frontmatter.title,
          status: p.frontmatter.status,
          category: p.frontmatter.category,
          priority: p.frontmatter.priority ?? null,
          tasks: fmtTasks(p.frontmatter.tasks),
        }));

        const { items, total, note } = truncateList(rows);
        return { content: [{ type: 'text' as const, text: toJson(note ? { items, total, note } : items) }] };
      } catch (e) {
        return toError(String(e), 'Check that the plans directory exists and is readable.');
      }
    },
  );
}
