import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { fmtTasks, readAllPlans } from '@pc-ctx/core';
import { toError, toJson, truncateList } from '../format.js';

export function registerRoadmapListTool(server: McpServer, ctx: { roadmapsDir: string }) {
  server.tool(
    'roadmap_list',
    'List all roadmaps with their status, period, priority, and entry counts.',
    {},
    async () => {
      try {
        const roadmaps = readAllPlans(ctx.roadmapsDir);
        const rows = roadmaps.map((r) => ({
          slug: r.slug,
          title: r.frontmatter.title,
          status: r.frontmatter.status,
          period: r.frontmatter.period ?? null,
          priority: r.frontmatter.priority ?? null,
          entries: r.frontmatter.entries?.length ?? 0,
          tldr: r.frontmatter.tldr,
        }));
        const { items, total, note } = truncateList(rows);
        return { content: [{ type: 'text' as const, text: toJson(note ? { items, total, note } : items) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
