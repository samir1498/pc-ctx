import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type PlanMeta, readAllPlans, slugify, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { toError, toJson, truncateList } from '../format.js';

/**
 * `layout: 'folder'` stores each item as `<dir>/<slug>/repo.md` instead of the
 * default flat `<dir>/<today>-<slug>.md` — used by `repos` so a repo entry can grow
 * companion files (e.g. a future `map.md`) alongside its frontmatter doc.
 */
export function registerDomainTools(
  server: McpServer,
  ctx: { root: string },
  domain: string,
  dir: string,
  label: string,
  opts: { layout?: 'flat' | 'folder' } = {},
) {
  const layout = opts.layout ?? 'flat';
  server.tool(`${domain}_list`, `List all ${label} files.`, {}, async () => {
    try {
      const items = readAllPlans(dir);
      const rows = items.map((i) => ({
        slug: i.slug,
        title: i.frontmatter.title || i.slug,
        ...(i.frontmatter.status ? { status: i.frontmatter.status } : {}),
        ...(i.frontmatter.tags ? { tags: i.frontmatter.tags } : {}),
      }));
      const { items: truncated, total, note } = truncateList(rows);
      return {
        content: [{ type: 'text' as const, text: toJson(note ? { items: truncated, total, note } : truncated) }],
      };
    } catch (e) {
      return toError(String(e));
    }
  });

  server.tool(
    `${domain}_show`,
    `Show a ${label} file by slug.`,
    { slug: z.string().describe(`${label} slug`) },
    async ({ slug }) => {
      try {
        const all = readAllPlans(dir);
        const item = all.find((i) => i.slug === slug);
        if (!item) return toError(`Not found: ${slug}`);
        return { content: [{ type: 'text' as const, text: toJson({ ...item.frontmatter, body: item.body }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );

  server.tool(
    `${domain}_add`,
    `Create a new ${label} file.`,
    {
      title: z.string().describe('Title'),
      category: z.string().optional().describe(`Category (default: ${domain})`),
      tldr: z.string().optional().describe('One-line summary (default: title)'),
      body: z
        .string()
        .optional()
        .describe('Markdown body (written verbatim, including the # heading). Omit for the default stub.'),
    },
    async ({ title, category, tldr, body }) => {
      try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const sl = slugify(title);
        const filename = layout === 'folder' ? 'repo.md' : `${today}-${sl}.md`;
        const itemDir = layout === 'folder' ? join(dir, sl) : dir;
        const filepath = join(itemDir, filename);
        if (existsSync(filepath)) return toError(`File already exists: ${filepath}`);
        // Every domain follows the same standardized required-field schema (REQUIRED_DOC_FIELDS).
        writePlanFileAtomic({
          slug: sl,
          filename,
          dir: itemDir,
          frontmatter: {
            title,
            slug: sl,
            status: 'active',
            category: category ?? domain,
            created: Number.parseInt(today),
            tldr: tldr ?? title,
          } as unknown as PlanMeta,
          body: body ?? `# ${title}\n`,
          raw: '',
        });
        return {
          content: [
            {
              type: 'text' as const,
              text: toJson({ ok: true, slug: sl, filename: join(relative(dir, itemDir), filename) }),
            },
          ],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
