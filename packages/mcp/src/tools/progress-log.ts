import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { progressLog } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson } from '../format.js';

export function registerProgressLogTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'progress_log',
    'Append a timestamped entry to the daily progress log. Creates daily.md with frontmatter if needed. Optionally updates now.md.',
    {
      text: z.string().describe('Progress text to log'),
      tags: z.array(z.string()).optional().describe('Optional tags (e.g. ["backend", "postgres"])'),
      updateNow: z.boolean().optional().describe('Also update now.md last-updated date'),
    },
    async ({ text, tags, updateNow }) => {
      try {
        const result = progressLog(join(ctx.root, 'progress'), { text, tags, updateNow });
        return { content: [{ type: 'text' as const, text: toJson({ ok: true, entry: result.dailyEntry }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
