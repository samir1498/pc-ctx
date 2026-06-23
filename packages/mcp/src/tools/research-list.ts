import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { listResearchFiles } from '@pc-ctx/core';
import { toJson, toError, truncateList } from '../format.js';

export function registerResearchListTool(server: McpServer, ctx: { researchDir: string }) {
  server.tool(
    'research_list',
    'List all research files with their slug and file path.',
    {},
    async () => {
      try {
        const files = listResearchFiles(ctx.researchDir);
        const rows = files.map(f => ({ slug: f.slug, title: f.title }));
        const { items, total, note } = truncateList(rows);
        return { content: [{ type: 'text' as const, text: toJson(note ? { items, total, note } : items) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
