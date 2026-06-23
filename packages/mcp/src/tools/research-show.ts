import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findResearchFile } from '@pc-ctx/core';
import { toJson, toError } from '../format.js';

export function registerResearchShowTool(server: McpServer, ctx: { researchDir: string }) {
  server.tool(
    'research_show',
    'Show the full content of a research file by slug.',
    {
      slug: z.string().min(1).describe('Research file slug or partial path'),
    },
    async ({ slug }) => {
      try {
        const file = findResearchFile(ctx.researchDir, slug);
        if (!file) return { content: [{ type: 'text' as const, text: toJson({ error: `Research file "${slug}" not found.` }) }], isError: true as const };
        return { content: [{ type: 'text' as const, text: toJson({ slug: file.slug, content: file.content }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
