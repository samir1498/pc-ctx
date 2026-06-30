import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { progressRead } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson } from '../format.js';

export function registerProgressReadTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'progress_read',
    'Read a progress file (now.md or daily.md) and return its frontmatter and body',
    {
      file: z.string().describe('File name to read (now.md or daily.md)'),
    },
    async ({ file }) => {
      try {
        const result = progressRead(join(ctx.root, 'progress'), file);
        return {
          content: [{ type: 'text' as const, text: toJson({ frontmatter: result.frontmatter, body: result.body }) }],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
