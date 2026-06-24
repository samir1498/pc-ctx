import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { slugify, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson } from '../format.js';

export function registerAddTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_add',
    'Create a new plan with the given title and optional metadata.',
    {
      title: z.string().min(1).describe('Plan title'),
      category: z.string().optional().default('other').describe('Plan category'),
      priority: z.number().int().min(0).max(100).optional().describe('Priority (0-100)'),
      status: z.enum(['active', 'paused', 'done', 'cancelled']).optional().default('active').describe('Initial status'),
      tldr: z.string().optional().describe('One-line summary'),
      ref: z.string().optional().describe('Reference (research:<slug>, plan:<slug>, url:<url>)'),
      body: z
        .string()
        .optional()
        .describe('Markdown body (written verbatim, including the # heading). Omit for the default stub.'),
    },
    async ({ title, category, priority, status, tldr, ref, body }) => {
      try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const slug = slugify(title);
        const filename = `${today}-${slug}.md`;
        const filepath = join(ctx.plansDir, filename);
        if (existsSync(filepath)) return toError(`File "${filename}" already exists.`);

        const plan = {
          slug,
          filename,
          dir: ctx.plansDir,
          frontmatter: {
            title,
            slug,
            status: status ?? 'active',
            category,
            created: Number.parseInt(today),
            tldr: tldr ?? 'TODO: add summary',
            priority,
            tasks: [],
            acceptance: [],
            references: ref ? [ref] : undefined,
          },
          body: body ?? `# ${title}\n\n## Goal\n\nTODO: define goal\n\n## Scope\n\nTODO: define scope\n`,
          raw: '',
        };

        writePlanFileAtomic(plan);
        return {
          content: [
            {
              type: 'text' as const,
              text: toJson({ slug, filename, ok: true } as { slug: string; filename: string; ok: true }),
            },
          ],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
