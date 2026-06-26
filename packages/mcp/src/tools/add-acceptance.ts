import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerAddAcceptanceTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_add_acceptance',
    'Add acceptance criteria to a plan.',
    {
      slug: z.string().min(1).describe('Plan slug'),
      description: z.string().min(1).describe('Acceptance criteria description'),
    },
    async ({ slug, description }) => {
      try {
        const plan = readAllPlans(ctx.plansDir).find((p) => p.slug === slug);
        if (!plan) return notFound('plan', slug);
        if (!plan.frontmatter.acceptance) plan.frontmatter.acceptance = [];
        if (Array.isArray(plan.frontmatter.acceptance)) {
          (plan.frontmatter.acceptance as string[]).push(description);
        }
        writePlanFileAtomic(plan);
        return { content: [{ type: 'text' as const, text: toJson({ slug, ok: true }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
