import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { collectRefs, findPlan, readAllPlans, resolveRef } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerReferencesTool(
  server: McpServer,
  ctx: { plansDir: string; roadmapsDir: string; researchDir: string },
) {
  server.tool(
    'plan_references',
    'Show all references (outbound) and backlinks (inbound) for a plan.',
    {
      slug: z.string().min(1).describe('Plan slug'),
    },
    async ({ slug }) => {
      try {
        const plan = findPlan(ctx.plansDir, ctx.roadmapsDir, slug);
        if (!plan) return notFound('plan', slug);

        const refs = collectRefs(plan);
        const outbound = refs.map((r) => resolveRef(r, ctx.plansDir, ctx.roadmapsDir, ctx.researchDir));

        const allDocs = [...readAllPlans(ctx.plansDir), ...readAllPlans(ctx.roadmapsDir)];
        const backlinks = allDocs
          .filter((d) => d.slug !== slug && collectRefs(d).some((r) => r === `plan:${slug}`))
          .map((d) => ({ slug: d.slug, title: d.frontmatter.title, tldr: d.frontmatter.tldr }));

        const result = { slug, title: plan.frontmatter.title, outbound, backlinks };
        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
