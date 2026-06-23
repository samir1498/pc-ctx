import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { load as parseYaml } from 'js-yaml';

const OWNER = 'samir1498';
const REPO = 'personal-context';
const BRANCH = 'main';
const FOLDERS = ['plans', 'roadmaps', 'references', 'progress', 'ideas', 'processes'] as const;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

interface GhContent {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

function ghHeaders(pat: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'pc-ctx',
    Authorization: `Bearer ${pat}`,
  };
}

function ghFetch(pat: string, path: string): Promise<Response> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  return fetch(url, { headers: ghHeaders(pat) });
}

async function ghFetchRaw(pat: string, path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: { ...ghHeaders(pat), Accept: 'application/vnd.github.raw+json' },
  });
  if (!res.ok) return null;
  return res.text();
}

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown>; body?: string } | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/);
  if (!match) return null;
  const yaml = match[1];
  if (!yaml) return null;
  try {
    const frontmatter = parseYaml(yaml) as Record<string, unknown>;
    return { frontmatter, body: match[2]?.trim() || undefined };
  } catch {
    return null;
  }
}

export function startUiServer(port: number, staticDir: string, pat: string) {
  const app = new Hono();

  app.get('/api/:folder', async (c) => {
    const folder = c.req.param('folder')!;
    if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) return c.notFound();

    const res = await ghFetch(pat, folder);
    if (!res.ok) return c.json({ error: `Failed to fetch ${folder}`, status: res.status }, 500);

    const items = (await res.json()) as GhContent[];
    const results = [];
    for (const item of items) {
      if (item.type !== 'file') continue;
      const raw = await ghFetchRaw(pat, item.path);
      if (!raw) continue;
      const parsed = parseFrontmatter(raw);
      results.push({
        slug: item.name.replace(/\.\w+$/, ''),
        name: item.name,
        path: item.path,
        ...(parsed ? { frontmatter: parsed.frontmatter, body: parsed.body } : { body: raw }),
      });
    }
    return c.json(results);
  });

  app.get('/api/:folder/:slug', async (c) => {
    const folder = c.req.param('folder')!;
    const slug = c.req.param('slug')!;
    if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) return c.notFound();

    const res = await ghFetch(pat, folder);
    if (!res.ok) return c.json({ error: 'Folder not found' }, 404);

    const items = (await res.json()) as GhContent[];
    const file = items.find((i) => i.type === 'file' && i.name.replace(/\.\w+$/, '') === slug);
    if (!file) return c.json({ error: 'Not found' }, 404);

    const raw = await ghFetchRaw(pat, file.path);
    if (!raw) return c.json({ error: 'Failed to read file' }, 500);

    const parsed = parseFrontmatter(raw);
    const result: Record<string, unknown> = { slug, name: file.name, path: file.path };
    if (parsed) {
      result.frontmatter = parsed.frontmatter;
      result.body = parsed.body;
    } else {
      result.body = raw;
    }
    return c.json(result);
  });

  app.get('*', (c) => {
    const url = new URL(c.req.url);
    const filePath = url.pathname === '/' ? '/index.html' : url.pathname;
    const diskPath = join(staticDir, filePath);
    // Containment check: never serve a file resolved outside staticDir (e.g. via ../ traversal).
    const resolved = resolve(diskPath);
    if (resolved !== resolve(staticDir) && !resolved.startsWith(resolve(staticDir) + sep)) {
      return c.notFound();
    }
    try {
      const content = readFileSync(resolved);
      const ext = filePath.slice(filePath.lastIndexOf('.'));
      return c.body(content, 200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    } catch {
      const index = readFileSync(join(staticDir, 'index.html'));
      return c.body(index, 200, { 'Content-Type': 'text/html; charset=utf-8' });
    }
  });

  serve({ fetch: app.fetch, port, hostname: '127.0.0.1' });
  console.log(`\n  Web UI running at http://localhost:${port}`);
  console.log('  Press Ctrl+C to stop\n');
}
