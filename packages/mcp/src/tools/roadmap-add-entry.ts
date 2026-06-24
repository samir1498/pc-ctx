import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerRoadmapAddEntryTool(server: McpServer, ctx: { roadmapsDir: string }) {
  server.tool(
    'roadmap_add_entry',
    'Add an entry to a roadmap. The ref is the plan slug the entry points at. ' +
      'Entry status is free-form (e.g. planned, next, done, parked).',
    {
      slug: z.string().min(1).describe('Roadmap slug'),
      ref: z.string().min(1).describe('Entry ref (the plan slug to point at)'),
      status: z.string().optional().describe('Entry status (free-form, e.g. planned/next/done/parked)'),
      note: z.string().optional().describe('Optional note'),
    },
    async ({ slug, ref, status, note }) => {
      try {
        const roadmap = readAllPlans(ctx.roadmapsDir).find((r) => r.slug === slug);
        if (!roadmap) return notFound('roadmap', slug);
        if (!roadmap.frontmatter.entries) roadmap.frontmatter.entries = [];
        if (roadmap.frontmatter.entries.some((e) => e.ref === ref))
          return toError(`Entry "${ref}" already exists in roadmap "${slug}".`);
        roadmap.frontmatter.entries.push({ ref, ...(status ? { status } : {}), ...(note ? { note } : {}) });
        writePlanFileAtomic(roadmap);
        return {
          content: [
            {
              type: 'text' as const,
              text: toJson({ slug, ref, ok: true }),
            },
          ],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
