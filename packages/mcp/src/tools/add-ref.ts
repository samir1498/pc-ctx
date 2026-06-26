import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerAddRefTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_add_ref',
    'Add a reference to a plan.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      ref: z.string().min(1).describe('Reference (plan:<slug>, research:<slug>, url:<url>)'),
    },
    async ({ slug, ref }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find((p) => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        if (!plan.frontmatter.references) plan.frontmatter.references = [];
        plan.frontmatter.references.push(ref);
        writePlanFileAtomic(plan);
        return { content: [{ type: 'text' as const, text: toJson({ slug, ref, ok: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
