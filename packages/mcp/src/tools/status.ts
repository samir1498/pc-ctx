import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fmtTasks, readAllPlans } from '@pc-ctx/core';
import { toError, toJson } from '../format.js';

export function registerStatusTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_status',
    'Show grouped status overview of all plans: active, paused, and done counts by category.',
    {},
    async () => {
      try {
        const plans = readAllPlans(ctx.plansDir);
        const active = plans.filter((p) => p.frontmatter.status === 'active');
        const paused = plans.filter((p) => p.frontmatter.status === 'paused');
        const done = plans.filter((p) => p.frontmatter.status === 'done');

        const byCat: Record<string, unknown[]> = {};
        for (const p of active) {
          const cat = p.frontmatter.category || 'other';
          if (!byCat[cat]) byCat[cat] = [];
          byCat[cat].push({
            slug: p.slug,
            priority: p.frontmatter.priority ?? null,
            tasks: fmtTasks(p.frontmatter.tasks),
            tldr: p.frontmatter.tldr,
          });
        }

        const result = {
          summary: `${active.length} active · ${paused.length} paused · ${done.length} done`,
          active: { total: active.length, byCategory: byCat },
          paused: paused.map((p) => ({ slug: p.slug, tldr: p.frontmatter.tldr })),
          done: done.map((p) => ({ slug: p.slug })),
        };

        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
