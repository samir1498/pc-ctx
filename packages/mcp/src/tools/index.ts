import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, slugify, writePlanFileAtomic } from '@pc-ctx/core';
import { z } from 'zod';
import { registerAddAcceptanceTool } from './add-acceptance.js';
import { registerAddRefTool } from './add-ref.js';
import { registerAddTaskTool } from './add-task.js';
import { registerAddTool } from './add.js';
import { registerArchiveTool } from './archive.js';
import { registerDomainTools } from './domain-tools.js';
import { registerGraphTool } from './graph.js';
import { registerListTool } from './list.js';
import { registerPlanReconcileTool } from './plan-reconcile.js';
import { registerPlanStaleTool } from './plan-stale.js';
import { registerProgressLogTool } from './progress-log.js';
import { registerProgressReadTool } from './progress-read.js';
import { registerReferencesTool } from './references.js';
import { registerRemoveTaskTool } from './remove-task.js';
import { registerResearchListTool } from './research-list.js';
import { registerResearchShowTool } from './research-show.js';
import { registerRoadmapAddEntryTool } from './roadmap-add-entry.js';
import { registerRoadmapListTool } from './roadmap-list.js';
import { registerRoadmapSetEntryStatusTool } from './roadmap-set-entry-status.js';
import { registerRoadmapShowTool } from './roadmap-show.js';
import { registerSetStatusTool } from './set-status.js';
import { registerSetupTool } from './setup.js';
import { registerShowTool } from './show.js';
import { registerStatusTool } from './status.js';
import { registerSyncTool } from './sync.js';
import { registerTaskStatusTool } from './task-status.js';
import { registerValidateTool } from './validate.js';
import { toError, toJson, truncateList } from '../format.js';

function registerArchiveTools(server: McpServer, archiveDir: string) {
  // archive_list with since/until filters
  server.tool(
    'archive_list',
    'List all archived item files. Supports date range filtering.',
    {
      since: z.string().optional().describe('Filter by completed_at >= YYYY-MM-DD (falls back to file mtime)'),
      until: z.string().optional().describe('Filter by completed_at <= YYYY-MM-DD (falls back to file mtime)'),
    },
    async ({ since, until }) => {
      try {
        const items = readAllPlans(archiveDir);
        type ArchiveRow = {
          slug: string;
          title: string;
          status?: string;
          completed_at?: string;
        };
        const rows: ArchiveRow[] = items.map((i) => {
          const completedAt = (i.frontmatter.completed_at as string) || '';
          const fallbackDate = completedAt || i.filename.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '';
          return {
            slug: i.slug,
            title: (i.frontmatter.title as string) || i.slug,
            ...(i.frontmatter.status ? { status: i.frontmatter.status as string } : {}),
            ...(fallbackDate ? { completed_at: fallbackDate } : {}),
          };
        });
        let filtered = rows;
        if (since) filtered = filtered.filter((r) => (r.completed_at ?? '') >= since);
        if (until) filtered = filtered.filter((r) => (r.completed_at ?? '') <= until);
        const { items: truncated, total, note } = truncateList(filtered);
        return {
          content: [{ type: 'text' as const, text: toJson(note ? { items: truncated, total, note } : truncated) }],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );

  // archive_show
  server.tool(
    'archive_show',
    'Show an archived item file by slug.',
    { slug: z.string().describe('archived item slug') },
    async ({ slug }) => {
      try {
        const all = readAllPlans(archiveDir);
        const item = all.find((i) => i.slug === slug);
        if (!item) return toError(`Not found: ${slug}`);
        return { content: [{ type: 'text' as const, text: toJson({ ...item.frontmatter, body: item.body }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );

  // archive_add
  server.tool(
    'archive_add',
    'Create a new archived item file.',
    {
      title: z.string().describe('Title'),
      category: z.string().optional().describe('Category (default: archive)'),
      tldr: z.string().optional().describe('One-line summary (default: title)'),
      body: z.string().optional().describe('Markdown body (written verbatim, including the # heading). Omit for the default stub.'),
    },
    async ({ title, category, tldr, body }) => {
      try {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const sl = slugify(title);
        const filename = `${today}-${sl}.md`;
        const filepath = join(archiveDir, filename);
        if (existsSync(filepath)) return toError(`File already exists: ${filename}`);
        writePlanFileAtomic({
          slug: sl,
          filename,
          dir: archiveDir,
          frontmatter: {
            title,
            slug: sl,
            status: 'active' as const,
            category: category ?? 'archive',
            created: Number.parseInt(today),
            tldr: tldr ?? title,
          },
          body: body ?? `# ${title}\n`,
          raw: '',
        });
        return { content: [{ type: 'text' as const, text: toJson({ ok: true, slug: sl, filename }) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}

export function registerAllTools(
  server: McpServer,
  ctx: { plansDir: string; roadmapsDir: string; researchDir: string; root: string },
) {
  registerListTool(server, ctx);
  registerShowTool(server, ctx);
  registerStatusTool(server, ctx);
  registerValidateTool(server, ctx);
  registerSetStatusTool(server, ctx);
  registerTaskStatusTool(server, ctx);
  registerAddTool(server, ctx);
  registerAddTaskTool(server, ctx);
  registerAddAcceptanceTool(server, ctx);
  registerRemoveTaskTool(server, ctx);
  registerAddRefTool(server, ctx);
  registerArchiveTool(server, ctx);
  registerReferencesTool(server, ctx);
  registerRoadmapListTool(server, ctx);
  registerRoadmapShowTool(server, ctx);
  registerRoadmapSetEntryStatusTool(server, ctx);
  registerRoadmapAddEntryTool(server, ctx);
  registerResearchListTool(server, ctx);
  registerResearchShowTool(server, ctx);
  registerGraphTool(server, ctx);
  registerPlanReconcileTool(server, ctx);
  registerPlanStaleTool(server, ctx);
  registerProgressLogTool(server, ctx);
  registerProgressReadTool(server, ctx);
  registerSyncTool(server, ctx);
  registerSetupTool(server, ctx);

  // Generic domains (no special filters)
  const genericDomains: [string, string, string][] = [
    ['ideas', join(ctx.root, 'ideas'), 'idea'],
    ['processes', join(ctx.root, 'processes'), 'process'],
    ['references', join(ctx.root, 'references'), 'reference'],
    ['handoffs', join(ctx.root, 'handoffs'), 'session handoff'],
  ];
  for (const [domain, dir, label] of genericDomains) {
    registerDomainTools(server, { root: ctx.root }, domain, dir, label);
  }

  // Archive uses custom tools with since/until on _list
  const archiveDir = join(ctx.root, 'archive');
  registerArchiveTools(server, archiveDir);
}