import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans } from '@pc-ctx/core';
import { toJson, toError, truncateList } from '../format.js';
import { join } from 'path';
import { writeFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function registerDomainTools(server: McpServer, ctx: { root: string }, domain: string, dir: string, label: string) {
  server.tool(
    `${domain}_list`,
    `List all ${label} files.`,
    {},
    async () => {
      try {
        const items = readAllPlans(dir);
        const rows = items.map(i => ({
          slug: i.slug,
          title: i.frontmatter.title || i.slug,
          ...(i.frontmatter.status ? { status: i.frontmatter.status } : {}),
          ...(i.frontmatter.tags ? { tags: i.frontmatter.tags } : {}),
        }));
        const { items: truncated, total, note } = truncateList(rows);
        return { content: [{ type: 'text' as const, text: toJson(note ? { items: truncated, total, note } : truncated) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );

  server.tool(
    `${domain}_show`,
    `Show a ${label} file by slug.`,
    { slug: z.string().describe(`${label} slug`) },
    async ({ slug }) => {
      try {
        const all = readAllPlans(dir);
        const item = all.find(i => i.slug === slug);
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
    { title: z.string().describe('Title') },
    async ({ title }) => {
      try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const sl = slugify(title);
        const filename = `${today}-${sl}.md`;
        const filepath = join(dir, filename);
        if (existsSync(filepath)) return toError(`File already exists: ${filename}`);
        const frontmatter: Record<string, unknown> = { title, slug: sl, created: parseInt(today) };
        writeFileSync(filepath, `---\n${yaml.dump(frontmatter, { lineWidth: 120 })}---\n`, 'utf-8');
        return { content: [{ type: 'text' as const, text: toJson({ ok: true, slug: sl, filename }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
