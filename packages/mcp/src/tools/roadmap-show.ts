import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findPlan } from '@pc-ctx/core';
import { toJson, toError, notFound } from '../format.js';

export function registerRoadmapShowTool(server: McpServer, ctx: { plansDir: string; roadmapsDir: string }) {
  server.tool(
    'roadmap_show',
    'Show full details of a roadmap by slug: entries, status, period.',
    {
      slug: z.string().min(1).max(64).describe('Roadmap slug'),
    },
    async ({ slug }) => {
      try {
        const plan = findPlan(ctx.plansDir, ctx.roadmapsDir, slug);
        if (!plan) return notFound('roadmap', slug);

        const f = plan.frontmatter;
        const result = {
          slug: f.slug,
          title: f.title,
          status: f.status,
          period: f.period ?? null,
          priority: f.priority ?? null,
          tldr: f.tldr,
          entries: f.entries?.map(e => ({ ref: e.ref, status: e.status ?? null, note: e.note ?? null })) ?? [],
        };
        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
