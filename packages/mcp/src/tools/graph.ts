import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { collectRefs, findPlan, readAllPlans, resolveRef } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson } from '../format.js';

export function registerGraphTool(
  server: McpServer,
  ctx: { plansDir: string; roadmapsDir: string; researchDir: string },
) {
  server.tool(
    'graph',
    'Show inter-plan dependency graph. Optionally filter to a specific plan to see its direct edges.',
    {
      slug: z.string().optional().describe('Filter to a specific plan slug'),
    },
    async ({ slug }) => {
      try {
        const allDocs = [...readAllPlans(ctx.plansDir), ...readAllPlans(ctx.roadmapsDir)];
        const edges: { from: string; to: string; type: string; description?: string }[] = [];

        if (slug) {
          const plan = findPlan(ctx.plansDir, ctx.roadmapsDir, slug);
          if (!plan)
            return {
              content: [{ type: 'text' as const, text: toJson({ error: `Plan "${slug}" not found.` }) }],
              isError: true as const,
            };

          for (const r of collectRefs(plan)) {
            const resolved = resolveRef(r, ctx.plansDir, ctx.roadmapsDir, ctx.researchDir);
            edges.push({ from: slug, to: resolved.label, type: resolved.type, description: resolved.description });
          }
          for (const doc of allDocs) {
            if (doc.slug === slug) continue;
            if (collectRefs(doc).some((r) => r === `plan:${slug}`)) {
              edges.push({
                from: doc.slug,
                to: slug,
                type: 'backlink',
                description: `referenced by ${doc.frontmatter.title}`,
              });
            }
          }
        } else {
          for (const doc of allDocs) {
            for (const r of collectRefs(doc)) {
              const resolved = resolveRef(r, ctx.plansDir, ctx.roadmapsDir, ctx.researchDir);
              edges.push({
                from: doc.slug,
                to: resolved.label,
                type: resolved.type,
                description: resolved.description,
              });
            }
          }
        }

        const result = slug ? { slug, edges } : { edges };
        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
