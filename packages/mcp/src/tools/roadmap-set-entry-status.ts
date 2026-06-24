import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { notFound, toError, toJson } from '../format.js';

export function registerRoadmapSetEntryStatusTool(server: McpServer, ctx: { roadmapsDir: string }) {
  server.tool(
    'roadmap_set_entry_status',
    'Set the status (and optionally the note) of an existing roadmap entry, identified by its ref. ' +
      'Entry status is free-form (e.g. planned, next, done, parked). Omitting note leaves it unchanged.',
    {
      slug: z.string().min(1).describe('Roadmap slug'),
      ref: z.string().min(1).describe('Entry ref (the plan slug the entry points at)'),
      status: z.string().min(1).describe('New entry status (free-form, e.g. planned/next/done/parked)'),
      note: z.string().optional().describe('Optional new note; omit to leave the existing note unchanged'),
    },
    async ({ slug, ref, status, note }) => {
      try {
        const roadmap = readAllPlans(ctx.roadmapsDir).find((r) => r.slug === slug);
        if (!roadmap) return notFound('roadmap', slug);
        const entry = roadmap.frontmatter.entries?.find((e) => e.ref === ref);
        if (!entry) return toError(`Entry "${ref}" not found in roadmap "${slug}".`);
        entry.status = status;
        if (note !== undefined) entry.note = note;
        writePlanFileAtomic(roadmap);
        return {
          content: [
            {
              type: 'text' as const,
              text: toJson({ slug, ref, status, note: entry.note ?? null, ok: true }),
            },
          ],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
