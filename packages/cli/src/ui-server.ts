import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { load as parseYaml } from 'js-yaml';

const FOLDERS = ['plans', 'roadmaps', 'references', 'progress', 'ideas', 'processes', 'handoffs', 'archive'] as const;

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

interface FolderEntry {
  slug: string;
  name: string;
  path: string;
  frontmatter?: Record<string, unknown>;
  body?: string;
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

function toEntry(folder: string, name: string, raw: string): FolderEntry {
  const parsed = parseFrontmatter(raw);
  return {
    slug: name.replace(/\.\w+$/, ''),
    name,
    path: `${folder}/${name}`,
    ...(parsed ? { frontmatter: parsed.frontmatter, body: parsed.body } : { body: raw }),
  };
}

// Read a folder straight from a local context checkout — instant, offline, no PAT.
// Returns null when the folder doesn't exist (treated as an empty domain).
function readFolderLocal(root: string, folder: string): FolderEntry[] | null {
  const dir = join(root, folder);
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  const results: FolderEntry[] = [];
  for (const name of names) {
    if (!name.endsWith('.md') && !name.endsWith('.mdx')) continue;
    try {
      const full = join(dir, name);
      if (!statSync(full).isFile()) continue;
      results.push(toEntry(folder, name, readFileSync(full, 'utf-8')));
    } catch {
      // skip unreadable file
    }
  }
  return results;
}

// One GraphQL request returns the folder listing AND every file's content —
// replaces an N+1 REST fan-out (1 list call + 1 call per file) that was slow
// against large repos (e.g. 78 plan files = 79 sequential round-trips).
const TREE_QUERY = `
  query($owner: String!, $repo: String!, $expr: String!) {
    repository(owner: $owner, name: $repo) {
      object(expression: $expr) {
        ... on Tree {
          entries {
            name
            type
            object { ... on Blob { text isBinary } }
          }
        }
      }
    }
  }
`;

interface GqlTreeEntry {
  name: string;
  type: string;
  object: { text: string | null; isBinary: boolean } | null;
}

interface GqlResponse {
  data?: { repository?: { object: { entries: GqlTreeEntry[] } | null } };
  errors?: { message: string }[];
}

async function fetchFolder(
  pat: string,
  owner: string,
  repo: string,
  branch: string,
  folder: string,
): Promise<FolderEntry[] | null> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      'User-Agent': 'pc-ctx',
    },
    body: JSON.stringify({ query: TREE_QUERY, variables: { owner, repo, expr: `${branch}:${folder}` } }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL request failed: ${res.status}`);
  const json = (await res.json()) as GqlResponse;
  if (json.errors?.length) throw new Error(`GitHub GraphQL error: ${json.errors.map((e) => e.message).join('; ')}`);

  const tree = json.data?.repository?.object;
  if (!tree) return null; // folder not present in the repo yet

  const results: FolderEntry[] = [];
  for (const entry of tree.entries) {
    if (entry.type !== 'blob' || !entry.object || entry.object.isBinary || entry.object.text == null) continue;
    const parsed = parseFrontmatter(entry.object.text);
    results.push({
      slug: entry.name.replace(/\.\w+$/, ''),
      name: entry.name,
      path: `${folder}/${entry.name}`,
      ...(parsed ? { frontmatter: parsed.frontmatter, body: parsed.body } : { body: entry.object.text }),
    });
  }
  return results;
}

export function startUiServer(
  port: number,
  staticDir: string,
  pat: string,
  contentRepo: string,
  branch = 'main',
  localRoot = '',
) {
  let owner = '';
  let repo = '';
  if (!localRoot) {
    const parts = contentRepo.split('/');
    owner = parts[0] ?? '';
    repo = parts[1] ?? '';
    if (!owner || !repo) throw new Error(`Invalid content repo "${contentRepo}" — expected "owner/name"`);
  }

  // Local checkout wins when a root is given: instant, offline, no PAT.
  const loadFolder = (folder: string): FolderEntry[] | null | Promise<FolderEntry[] | null> =>
    localRoot ? readFolderLocal(localRoot, folder) : fetchFolder(pat, owner, repo, branch, folder);

  const app = new Hono();

  app.get('/api/:folder', async (c) => {
    const folder = c.req.param('folder')!;
    if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) return c.notFound();
    try {
      const entries = await loadFolder(folder);
      return c.json(entries ?? []);
    } catch (err) {
      return c.json({ error: `Failed to fetch ${folder}`, message: (err as Error).message }, 502);
    }
  });

  app.get('/api/:folder/:slug', async (c) => {
    const folder = c.req.param('folder')!;
    const slug = c.req.param('slug')!;
    if (!FOLDERS.includes(folder as (typeof FOLDERS)[number])) return c.notFound();
    try {
      const entries = await loadFolder(folder);
      const file = entries?.find((e) => e.slug === slug);
      if (!file) return c.json({ error: 'Not found' }, 404);
      return c.json(file);
    } catch (err) {
      return c.json({ error: 'Failed to read file', message: (err as Error).message }, 502);
    }
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
  console.log(localRoot ? `  Content: ${localRoot} (local filesystem)` : `  Content: ${contentRepo} @ ${branch}`);
  console.log('  Press Ctrl+C to stop\n');
}
