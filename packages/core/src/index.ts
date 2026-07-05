import { execSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import yaml from 'js-yaml';

export interface Task {
  id: string;
  title?: string;
  desc?: string;
  status: string;
  refs?: string[];
}

export interface Acceptance {
  id: string;
  desc: string;
  status?: string;
}

export interface RoadmapEntry {
  ref: string;
  status?: string;
  note?: string;
}

export interface PlanMeta {
  title: string;
  slug: string;
  status: string;
  category: string;
  created: number;
  tldr: string;
  tasks?: Task[];
  acceptance?: Acceptance[] | string[];
  priority?: number;
  tags?: string[];
  period?: string;
  entries?: RoadmapEntry[];
  references?: string[];
  [key: string]: unknown;
}

export interface PlanFile {
  slug: string;
  filename: string;
  dir: string;
  frontmatter: PlanMeta;
  body: string;
  raw: string;
}

export interface ResolvedRef {
  type: 'research' | 'plan' | 'roadmap' | 'url' | 'unknown';
  target: string;
  label: string;
  description?: string;
}

export const VALID_STATUSES = ['active', 'paused', 'done', 'cancelled'];
export const VALID_TASK_STATUSES = ['pending', 'in-progress', 'done', 'blocked', 'cancelled'];
/** Frontmatter fields required on every standardized document, across all domains. */
export const REQUIRED_DOC_FIELDS = ['title', 'slug', 'status', 'category', 'created', 'tldr'];

export function parsePlanFile(filepath: string): PlanFile | null {
  let raw: string;
  try {
    raw = readFileSync(filepath, 'utf-8');
  } catch {
    return null;
  }
  const slug = basename(filepath, '.md');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const yamlStr = match[1];
  if (!yamlStr) return null;
  try {
    const frontmatter = yaml.load(yamlStr) as PlanMeta;
    return {
      slug: frontmatter.slug || slug,
      filename: basename(filepath),
      dir: dirname(filepath),
      frontmatter,
      body: (match[2] || '').trim(),
      raw,
    };
  } catch {
    return null;
  }
}

export function serializePlanFile(plan: PlanFile): string {
  const yamlStr = yaml.dump(plan.frontmatter, {
    lineWidth: 120,
    quotingType: "'",
    forceQuotes: false,
    noCompatMode: true,
  });
  return `---\n${yamlStr}---\n${plan.body}\n`;
}

/**
 * Write a plan file atomically: serialize, write to a temp sibling, then rename
 * into place. The rename is atomic on the same filesystem, so a crash mid-write
 * can never leave a half-written plan file.
 */
export function writePlanFileAtomic(plan: PlanFile): void {
  const finalPath = join(plan.dir, plan.filename);
  const tmpPath = `${finalPath}.tmp`;
  // Ensure the target domain folder exists — a fresh context root may not have every
  // domain dir (e.g. references/handoffs), and *_add would otherwise throw ENOENT.
  mkdirSync(plan.dir, { recursive: true });
  writeFileSync(tmpPath, serializePlanFile(plan), 'utf-8');
  renameSync(tmpPath, finalPath);
}

export interface ValidateResult {
  checked: number;
  errors: string[];
  warnings: string[];
  valid: boolean;
}

/**
 * The document domains that live under a context root, as [name, relative-dir] pairs.
 * `research` is excluded: it lives in a separate repo and has no required-field schema.
 */
export function domainDirs(root: string): [string, string][] {
  return [
    ['plans', join(root, 'plans')],
    ['roadmaps', join(root, 'roadmaps')],
    ['ideas', join(root, 'ideas')],
    ['processes', join(root, 'processes')],
    ['progress', join(root, 'progress')],
    ['references', join(root, 'references')],
    ['archive', join(root, 'archive')],
    ['handoffs', join(root, 'handoffs')],
  ];
}

/**
 * Validate frontmatter across one or more domains. Every domain enforces the same
 * standardized schema (REQUIRED_DOC_FIELDS, a valid status, and well-formed task
 * statuses). Single source of truth shared by the CLI `validate` command and the MCP
 * `plan_validate` tool. Files without YAML frontmatter are skipped (not counted).
 *
 * The `progress` domain uses a different, minimal schema (type, updated) and is
 * excluded from required-field validation.
 */
export const SKIP_VALIDATION_DOMAINS = new Set(['progress']);

export function validateDomains(domains: [string, string][]): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0;

  for (const [domain, dir] of domains) {
    if (SKIP_VALIDATION_DOMAINS.has(domain)) continue;
    const docs = readAllPlans(dir);
    checked += docs.length;
    for (const p of docs) {
      const f = p.frontmatter;
      const id = f.slug ?? p.slug;
      for (const field of REQUIRED_DOC_FIELDS) {
        if (f[field] == null || f[field] === '') errors.push(`${domain}/${id}: missing required field "${field}"`);
      }
      if (f.status && !VALID_STATUSES.includes(f.status)) errors.push(`${domain}/${id}: invalid status "${f.status}"`);
      if (f.tasks)
        for (const t of f.tasks)
          if (!VALID_TASK_STATUSES.includes(t.status))
            errors.push(`${domain}/${id}.tasks.${t.id}: invalid status "${t.status}"`);
      if (f.created && typeof f.created !== 'number')
        warnings.push(`${domain}/${id}: "created" should be a number, got "${f.created}"`);
    }
  }

  return { checked, errors, warnings, valid: errors.length === 0 };
}

export function readAllPlans(dir: string, excludeArchived = true): PlanFile[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const plans: PlanFile[] = [];
  for (const entry of entries) {
    if (excludeArchived && (entry.name === 'archived' || entry.name.startsWith('.'))) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) plans.push(...readAllPlans(fullPath));
    else if (entry.name.endsWith('.md')) {
      const plan = parsePlanFile(fullPath);
      if (plan) plans.push(plan);
    }
  }
  return plans;
}

export function findPlan(plansDir: string, roadmapsDir: string, slug: string): PlanFile | null {
  return [...readAllPlans(plansDir), ...readAllPlans(roadmapsDir)].find((p) => p.slug === slug) || null;
}

export function listResearchFiles(researchDir: string): { slug: string; filepath: string; title: string }[] {
  if (!existsSync(researchDir)) return [];
  const files: { slug: string; filepath: string; title: string }[] = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md') && entry.name !== 'README.md' && entry.name !== 'INDEX.md') {
        // slug = path relative to the research root, sans extension, so it is unique across folders
        const slug = relative(researchDir, fullPath).replace(/\\/g, '/').replace(/\.md$/, '');
        files.push({ slug, filepath: fullPath, title: basename(slug).replace(/-/g, ' ') });
      }
    }
  };

  walk(researchDir);
  return files;
}

export function findResearchFile(
  researchDir: string,
  slugOrPath: string,
): { slug: string; filepath: string; content: string } | null {
  const files = listResearchFiles(researchDir);
  // Prefer an exact full-slug (path) match; it is always unambiguous.
  let match = files.find((f) => f.slug === slugOrPath);
  if (!match) {
    // Fall back to a bare basename or path-suffix match, but only when it resolves to one file.
    const candidates = files.filter((f) => basename(f.slug) === slugOrPath || f.filepath.endsWith(slugOrPath));
    if (candidates.length === 1) match = candidates[0];
  }
  if (!match) return null;
  return { ...match, content: readFileSync(match.filepath, 'utf-8') };
}

export function resolveRef(raw: string, plansDir: string, roadmapsDir: string, researchDir: string): ResolvedRef {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return { type: 'unknown', target: raw, label: raw };

  const prefix = raw.slice(0, colonIdx);
  const target = raw.slice(colonIdx + 1);

  switch (prefix) {
    case 'research': {
      const file = findResearchFile(researchDir, target);
      return file
        ? {
            type: 'research',
            target,
            label: target,
            description: `research file: ${relative(researchDir, file.filepath)}`,
          }
        : { type: 'research', target, label: target, description: '(not found locally)' };
    }
    case 'plan': {
      const plan = findPlan(plansDir, roadmapsDir, target);
      return plan
        ? { type: 'plan', target, label: target, description: `[${plan.frontmatter.status}] ${plan.frontmatter.tldr}` }
        : { type: 'plan', target, label: target, description: '(not found)' };
    }
    case 'url':
      return { type: 'url', target, label: target };
    default:
      return { type: 'unknown', target: raw, label: raw };
  }
}

export function collectRefs(plan: PlanFile): string[] {
  const f = plan.frontmatter;
  const refs: string[] = [...(f.references || [])];
  if (f.tasks) for (const t of f.tasks) if (t.refs) refs.push(...t.refs);
  if (f.entries)
    for (const e of f.entries) if (e.ref.startsWith('research:') || e.ref.startsWith('url:')) refs.push(e.ref);
  return [...new Set(refs)];
}

export function fmtTasks(tasks?: Task[]): string {
  if (!tasks?.length) return '—';
  return `${tasks.filter((t) => t.status === 'done').length}/${tasks.length}`;
}

export function fmtPrio(p?: number): string {
  return p != null ? String(p) : '—';
}

export function fmtCell(text: string, width: number): string {
  if (!text) return ''.padEnd(width);
  return text.length <= width ? text.padEnd(width) : `${text.slice(0, width - 3)}…`;
}

export function statusBadge(s: string): string {
  const m: Record<string, string> = { active: '●', paused: '○', done: '✓', cancelled: '✗' };
  return `${m[s] || '?'} ${s}`;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Read a progress file (now.md, daily.md, or weekly) with its minimal frontmatter.
 * Returns { frontmatter, body } or null if the file doesn't exist.
 */
export function readProgressFile(filepath: string): { frontmatter: Record<string, unknown>; body: string } | null {
  if (!existsSync(filepath)) return null;
  const raw = readFileSync(filepath, 'utf-8');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match || !match[1]) return { frontmatter: {}, body: raw.trim() };
  try {
    return { frontmatter: yaml.load(match[1]) as Record<string, unknown>, body: (match[2] || '').trim() };
  } catch {
    return { frontmatter: {}, body: raw.trim() };
  }
}

export function writeProgressFile(filepath: string, frontmatter: Record<string, unknown>, body: string): void {
  mkdirSync(dirname(filepath), { recursive: true });
  const yamlStr = yaml.dump(frontmatter, { lineWidth: 120, quotingType: "'", forceQuotes: true, noCompatMode: true });
  writeFileSync(filepath, `---\n${yamlStr}---\n${body}\n`, 'utf-8');
}

export interface ProgressLogOptions {
  text: string;
  tags?: string[];
  updateNow?: boolean;
}

/**
 * Log a progress entry: appends a timestamped bullet to daily.md and optionally updates now.md.
 *
 * - `daily.md` is created with frontmatter (type, title, updated, tags) if it doesn't exist.
 * - Each entry is appended as `## YYYY-MM-DD HH:MM UTC` followed by `- {text}`.
 * - If `tags` are provided, they're appended after the text: `- {text} (@tag1, @tag2)`.
 * - If `updateNow` is true, now.md's `updated` frontmatter field is set to today.
 */
export function progressLog(progressDir: string, opts: ProgressLogOptions): { dailyEntry: string } {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timestamp = `${now.toISOString().replace('T', ' ').slice(0, 16).replace(/-/g, '-')} UTC`;
  const tagsSuffix = opts.tags?.length ? ` (${opts.tags.map((t) => `@${t}`).join(', ')})` : '';
  const bullet = `- ${opts.text}${tagsSuffix}`;

  // --- daily.md ---
  const dailyPath = join(progressDir, 'daily.md');
  const dailyFm: Record<string, unknown> = {
    type: 'daily',
  };
  const dailyEntry = `\n## ${timestamp}\n\n${bullet}\n`;
  const existing = readProgressFile(dailyPath);
  if (existing) {
    const newBody = existing.body.trimEnd() + dailyEntry;
    writeProgressFile(dailyPath, existing.frontmatter, newBody);
  } else {
    writeProgressFile(dailyPath, dailyFm, `# ${dateStr}\n${dailyEntry}`);
  }

  // --- now.md (optional update) ---
  if (opts.updateNow) {
    const nowPath = join(progressDir, 'now.md');
    const nowFm: Record<string, unknown> = {
      type: 'now',
      updated: dateStr,
    };
    const nowBody = `## Active\n- ${opts.text}\n\n## Done recently\n\n## Pending\n\n## Not started\n`;
    if (!existsSync(nowPath)) {
      writeProgressFile(nowPath, nowFm, nowBody);
    } else {
      const nowExisting = readProgressFile(nowPath);
      if (nowExisting) {
        nowExisting.frontmatter.updated = dateStr;
        writeProgressFile(nowPath, nowExisting.frontmatter, nowExisting.body);
      }
    }
  }

  return { dailyEntry: bullet };
}

/**
 * Archive a progress file when it grows too large.
 * Moves the file to `archive/<date>-<filename>` and creates a fresh one with the same frontmatter.
 * Returns { archived: string, fresh: string } paths, or throws if the file doesn't exist.
 */
export function progressArchive(progressDir: string, filename: string): { archived: string; fresh: string } {
  const filepath = join(progressDir, filename);
  if (!existsSync(filepath)) throw new Error(`File not found: ${filename}`);

  const dateStr = new Date().toISOString().slice(0, 10);
  const archiveDir = join(progressDir, '..', 'archive');
  mkdirSync(archiveDir, { recursive: true });

  const archiveName = `${dateStr}-${filename}`;
  const archivePath = join(archiveDir, archiveName);
  renameSync(filepath, archivePath);

  // Create fresh file with the same frontmatter shape but empty body
  const freshFm: Record<string, unknown> = {};
  if (filename === 'now.md') {
    freshFm.type = 'now';
    freshFm.updated = dateStr;
    writeProgressFile(filepath, freshFm, '## Active\n\n## Done recently\n\n## Pending\n\n## Not started\n');
  } else if (filename === 'daily.md') {
    freshFm.type = 'daily';
    freshFm.updated = dateStr;
    writeProgressFile(filepath, freshFm, `# ${dateStr}\n`);
  } else {
    throw new Error(`Archiving not supported for: ${filename}. Use now.md or daily.md.`);
  }

  return { archived: archivePath, fresh: filepath };
}

export interface ProgressReadResult {
  frontmatter: Record<string, unknown>;
  body: string;
}

export function progressRead(progressDir: string, filename: string): ProgressReadResult {
  const filepath = join(progressDir, filename);
  const result = readProgressFile(filepath);
  if (!result) throw new Error(`File not found: ${filename}`);
  return result;
}

export interface StaleEntry {
  type: 'plan-done-inactive' | 'plan-idle' | 'focus-stale';
  slug?: string;
  title?: string;
  detail: string;
}

export function checkStale(root: string): StaleEntry[] {
  const stale: StaleEntry[] = [];
  const plansDir = join(root, 'plans');
  const progressDir = join(root, 'progress');
  const now = new Date();

  // Heuristic 1: all tasks done but plan active
  if (existsSync(plansDir)) {
    for (const file of readdirSync(plansDir)) {
      if (!file.endsWith('.md')) continue;
      const result = readProgressFile(join(plansDir, file));
      if (!result) continue;
      const tasks = result.frontmatter.tasks as { id: string; status: string }[] | undefined;
      const status = result.frontmatter.status as string | undefined;
      if (status === 'active' && tasks?.length && tasks.every((t) => t.status === 'done')) {
        stale.push({
          type: 'plan-done-inactive',
          slug: result.frontmatter.slug as string | undefined,
          title: result.frontmatter.title as string | undefined,
          detail: 'All tasks done but status is active',
        });
      }
    }

    // Heuristic 2: active plan untouched >14d
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    for (const file of readdirSync(plansDir)) {
      if (!file.endsWith('.md')) continue;
      const result = readProgressFile(join(plansDir, file));
      if (!result) continue;
      const status = result.frontmatter.status as string | undefined;
      if (status !== 'active') continue;
      const mtime = statSync(join(plansDir, file)).mtime;
      if (mtime < fourteenDaysAgo) {
        stale.push({
          type: 'plan-idle',
          slug: result.frontmatter.slug as string | undefined,
          title: result.frontmatter.title as string | undefined,
          detail: `Last modified ${Math.round((now.getTime() - mtime.getTime()) / 86400000)}d ago`,
        });
      }
    }
  }

  // Heuristic 3: now.md not updated today
  const nowPath = join(progressDir, 'now.md');
  if (existsSync(nowPath)) {
    const nowFile = readProgressFile(nowPath);
    if (nowFile) {
      const updatedRaw = nowFile.frontmatter.updated;
      const updated = updatedRaw instanceof Date ? updatedRaw.toISOString().slice(0, 10) : String(updatedRaw || '');
      const today = now.toISOString().slice(0, 10);
      if (updated !== today) {
        stale.push({
          type: 'focus-stale',
          detail: `now.md updated ${updated || 'never'} (today is ${today})`,
        });
      }
    }
  }

  return stale;
}

export interface GitCommitRef {
  hash: string;
  date: string;
  timestamp: number;
  subject: string;
  slug: string;
  task?: string;
  action: 'start' | 'progress' | 'close' | 'repo';
  repo?: string;
  type: 'plan' | 'roadmap';
}

export interface GitReconcileResult {
  matched: GitCommitRef[];
  unmatched: { hash: string; subject: string; trailer: string; reason: string }[];
}

function parseCtxTrailers(body: string): { slug: string; task?: string; action: 'start' | 'progress' | 'close' | 'repo'; repo?: string }[] {
  const results: { slug: string; task?: string; action: 'start' | 'progress' | 'close' | 'repo'; repo?: string }[] = [];
  const lines = body.split('\n');
  for (const line of lines) {
    const match = line.match(/^ctx:\s*([a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?)\s+(start|progress|close|repo:[a-zA-Z0-9_-]+)\s*$/);
    if (match) {
      const ref = match[1]!;
      const rawAction = match[2]!;
      const slashIdx = ref.indexOf('/');
      if (rawAction.startsWith('repo:')) {
        results.push({ slug: ref.slice(0, slashIdx === -1 ? ref.length : slashIdx), task: slashIdx === -1 ? undefined : ref.slice(slashIdx + 1), action: 'repo', repo: rawAction.slice(5) });
      } else {
        const action = rawAction as 'start' | 'progress' | 'close';
        if (slashIdx === -1) {
          results.push({ slug: ref, action });
        } else {
          results.push({ slug: ref.slice(0, slashIdx), task: ref.slice(slashIdx + 1), action });
        }
      }
    }
  }
  return results;
}

export function gitReconcile(root: string, opts: { commits?: number; apply?: boolean } = {}): GitReconcileResult {
  const n = opts.commits ?? 50;
  const matched: GitCommitRef[] = [];
  const unmatched: { hash: string; subject: string; trailer: string; reason: string }[] = [];

  const logOutput = execSync(`git log --format="%H|||%ct|||%s|||%b" -${n}`, { cwd: root, encoding: 'utf-8' });
  const commits = logOutput.trim().split('\n|||\n');

  for (const block of commits) {
    const parts = block.split('|||');
    if (parts.length < 3) continue;
    const hash = parts[0]!;
    const ts = parts[1]!;
    const subject = parts[2] || '';
    const body = parts.slice(3).join('|||');
    const timestamp = Number.parseInt(ts, 10);
    const date = new Date(timestamp * 1000).toISOString().slice(0, 10);

    const ctxRefs = parseCtxTrailers(body);
    for (const ctxRefItem of ctxRefs) {
      const planDir = join(root, 'plans');
      const planFiles = readdirSync(planDir).filter((f) => f.endsWith('.md'));
      const matchedPlanFile = planFiles.find((f) => {
        const content = readFileSync(join(planDir, f), 'utf-8');
        return new RegExp(`slug:\\s*'?${ctxRefItem.slug}'?`).test(content);
      });
      let matchedType: 'plan' | 'roadmap' = 'plan';
      let matchedFilePath: string | undefined;

      if (matchedPlanFile) {
        matchedFilePath = join(planDir, matchedPlanFile);
      } else {
        const roadmapDir = join(root, 'roadmaps');
        if (existsSync(roadmapDir)) {
          const roadmapFiles = readdirSync(roadmapDir).filter((f) => f.endsWith('.md'));
          const matchedRoadmapFile = roadmapFiles.find((f) => {
            const content = readFileSync(join(roadmapDir, f), 'utf-8');
            return new RegExp(`slug:\\s*'?${ctxRefItem.slug}'?`).test(content);
          });
          if (matchedRoadmapFile) {
            matchedFilePath = join(roadmapDir, matchedRoadmapFile);
            matchedType = 'roadmap';
          }
        }
      }

      if (!matchedFilePath) {
        unmatched.push({
          hash,
          subject,
          trailer: `${ctxRefItem.slug}${ctxRefItem.task ? `/${ctxRefItem.task}` : ''}`,
          reason: 'plan or roadmap not found',
        });
        continue;
      }

      if (ctxRefItem.action === 'repo') {
        // repo action is plan-level only, no task validation needed
        matched.push({
          hash,
          date,
          timestamp,
          subject,
          slug: ctxRefItem.slug,
          task: ctxRefItem.task,
          action: ctxRefItem.action,
          repo: ctxRefItem.repo,
          type: matchedType,
        });
        continue;
      }

      if (matchedType === 'plan' && ctxRefItem.task) {
        const plan = readProgressFile(matchedFilePath);
        if (!plan) {
          unmatched.push({
            hash,
            subject,
            trailer: `${ctxRefItem.slug}/${ctxRefItem.task}`,
            reason: 'plan file unreadable',
          });
          continue;
        }
        const tasks = plan.frontmatter.tasks as { id: string; status: string }[] | undefined;
        const taskStr: string = ctxRefItem.task;
        if (!tasks?.find((t) => t.id === taskStr)) {
          unmatched.push({ hash, subject, trailer: `${ctxRefItem.slug}/${ctxRefItem.task}`, reason: 'task not found' });
          continue;
        }
      }

      matched.push({
        hash,
        date,
        timestamp,
        subject,
        slug: ctxRefItem.slug,
        task: ctxRefItem.task,
        action: ctxRefItem.action,
        repo: ctxRefItem.repo,
        type: matchedType,
      });
    }
  }

  // Apply if requested
  if (opts.apply && matched.length) {
    // Group matched by slug
    const bySlug: Record<string, GitCommitRef[]> = {};
    for (const m of matched) {
      if (!bySlug[m.slug]) bySlug[m.slug] = [];
      bySlug[m.slug]!.push(m);
    }

    for (const [slugVal, gitRefs] of Object.entries(bySlug)) {
      const gitRefType = gitRefs[0]?.type || 'plan';

      if (gitRefType === 'roadmap') {
        const roadmapDir = join(root, 'roadmaps');
        if (!existsSync(roadmapDir)) continue;
        const roadmapFilePath = readdirSync(roadmapDir).find(
          (f) => f.endsWith('.md') && readFileSync(join(roadmapDir, f), 'utf-8').includes(`slug: ${slugVal}`),
        );
        if (!roadmapFilePath) continue;
        const roadmapPath = join(roadmapDir, roadmapFilePath);
        const roadmapData = readProgressFile(roadmapPath);
        if (!roadmapData) continue;

        const fm = roadmapData.frontmatter;
        const entries = (fm.entries as { ref: string; status?: string; note?: string }[] | undefined) || [];

        for (const gitRef of gitRefs) {
          if (gitRef.action === 'close') {
            fm.status = 'done';
            fm.completed = gitRef.date;
            for (const entry of entries) {
              if (entry.status !== 'done') {
                entry.status = 'done';
              }
            }
          } else if (gitRef.action === 'start') {
            if (fm.status !== 'active') {
              fm.status = 'active';
            }
          } else if (gitRef.action === 'progress') {
            if (!fm.started) {
              fm.started = gitRef.date;
            }
            if (fm.status !== 'active') {
              fm.status = 'active';
            }
          }
        }

        fm.entries = entries;
        writeProgressFile(roadmapPath, fm, roadmapData.body);
        continue;
      }

      const plansDir = join(root, 'plans');
      const planFilePath = readdirSync(plansDir).find(
        (f) => f.endsWith('.md') && readFileSync(join(plansDir, f), 'utf-8').includes(`slug: ${slugVal}`),
      );
      if (!planFilePath) continue;
      const planPath = join(plansDir, planFilePath);
      const planData = readProgressFile(planPath);
      if (!planData) continue;

      const fm = planData.frontmatter;
      const tasksList =
        (fm.tasks as { id: string; status: string; completed?: string; started?: string }[] | undefined) || [];

      for (const gitRef of gitRefs) {
        if (gitRef.action === 'repo') {
          if (gitRef.repo) {
            fm.repo = gitRef.repo;
          }
        } else if (gitRef.action === 'close') {
          if (gitRef.task) {
            const task = tasksList.find((t) => t.id === gitRef.task);
            if (task && task.status !== 'done') {
              task.status = 'done';
              task.completed = gitRef.date;
            }
          } else {
            for (const task of tasksList) {
              if (task.status !== 'done') {
                task.status = 'done';
                task.completed = gitRef.date;
              }
            }
            fm.status = 'done';
            fm.completed = gitRef.date;
          }
        } else if (gitRef.action === 'start') {
          if (gitRef.task) {
            const task = tasksList.find((t) => t.id === gitRef.task);
            if (task && !task.started) {
              task.started = gitRef.date;
              if (task.status === 'pending') task.status = 'in-progress';
            }
          } else if (!fm.started) {
            fm.started = gitRef.date;
          }
        } else if (gitRef.action === 'progress') {
          if (gitRef.task) {
            const task = tasksList.find((t) => t.id === gitRef.task);
            if (task && task.status === 'pending') {
              task.status = 'in-progress';
              if (!task.started) task.started = gitRef.date;
            }
          }
        }
      }

      if (fm.status === 'active' && tasksList.length && tasksList.every((t) => t.status === 'done') && !fm.completed) {
        fm.completed = gitRefs[gitRefs.length - 1]!.date;
        fm.status = 'done';
      }

      fm.tasks = tasksList;
      writeProgressFile(planPath, fm, planData.body);
    }
  }

  return { matched, unmatched };
}

export const SCAFFOLD_FILES: Record<string, string> = {
  '.gitignore': `node_modules/
package-lock.json
.open-mem/
*.swp
*.swo
`,
  'README.md': `# Context System

A shared folder for planning, progress, ideas, and references.
Uses \`pc-ctx\` CLI for deterministic plan/roadmap management.

## MCP tools (preferred)
All plan/roadmap/research operations have MCP tools. Use them over raw CLI:
- \`plan_list\` / \`plan_show\` / \`plan_status\` / \`plan_validate\`
- \`plan_set_status\` / \`plan_task_status\` / \`plan_add\` / \`plan_add_task\`
- \`plan_references\` — refs + backlinks
- \`roadmap_list\` / \`roadmap_show\`
- \`research_list\` / \`research_show\`

Fall back to \`ctx <subcommand>\` if MCP tools are unavailable.

## Quick start
- \`ctx status\` — overview
- \`ctx list\` — all plans
- \`ctx show <slug>\` — plan details
- \`ctx plan add <title>\` — new plan
`,
  'progress/now.md': `---
type: now
updated: YYYY-MM-DD
---

## Active
Run \`bun run ctx status\` for full overview.
Run \`bun run ctx show <slug>\` for plan details.

## Done recently

## Pending

## Not started
`,
  'progress/daily.md': `---
type: daily
---

# YYYY-MM-DD

## YYYY-MM-DD HH:MM UTC
- (intraday log entries)
`,
  'progress/YYYY-Www.md': `---
type: weekly
title: Week WW (YYYY-MM-DD → YYYY-MM-DD)
period:
  start: YYYY-MM-DD
  end: YYYY-MM-DD
updated: YYYY-MM-DD
tags: []
---

## Day
- (weekly summary entries)
`,
  'plans/example.md': `---
title: Example Plan
slug: example-plan
status: active
category: learning
created: 20260101
tldr: Template plan demonstrating YAML frontmatter conventions.
priority: 30
tasks:
  - id: T1
    title: Set up the context system
    status: done
  - id: T2
    title: Create a first real plan
    status: in-progress
acceptance:
  - Context system is working and plans are version-controlled.
references: []
---
# Example Plan

## Goal

Show how plans work.

## Scope

N/A — this is a template.
`,
  'roadmaps/example.md': `---
title: Example Roadmap
slug: example-roadmap
status: active
category: planning
created: 20260101
period: YYYY-QX
tldr: Example roadmap showing the format. References plans with status pointers.
priority: 50
entries:
  - ref: example-plan
    status: in-progress
---
# Example Roadmap

High-level initiative map. Each entry points to a plan file in \`plans/\`.
`,
  'handoffs/example.md': `---
title: Example session handoff
slug: example-handoff
status: active
category: general
created: 20260101
tldr: One-line summary of what this session did and where it left off.
session: 20260101
branch: main
tasks:
  - id: H1
    desc: First thing the next session should do
    status: pending
references: []
---
# Example session handoff

## Done
- What this session completed.

## Current state
- Where things stand right now (branches, deploys, open PRs).

## Next steps
- Tracked in \`tasks\` above; expand here if needed.

## Blockers / open questions
- Anything the next session needs answered.
`,
};

// Canonical context subdirectories ('' = the root itself).
export const CONTEXT_SUBDIRS = [
  '',
  'bin',
  'plans',
  'roadmaps',
  'progress',
  'ideas',
  'processes',
  'references',
  'archive',
  'handoffs',
] as const;

export interface ScaffoldResult {
  created: string[];
  existing: string[];
}

// Idempotent scaffold: creates any missing dirs/files under `target`, leaving
// existing ones untouched, and reports what was added vs already present. Safe
// to re-run to top up a partial/older context. Does NOT touch git.
export function scaffoldContext(target: string, opts: { name?: string } = {}): ScaffoldResult {
  const name = opts.name ?? (basename(target) || 'personal-context');
  const created: string[] = [];
  const existing: string[] = [];
  const note = (label: string, isNew: boolean) => (isNew ? created : existing).push(label);

  for (const d of CONTEXT_SUBDIRS) {
    const p = join(target, d);
    const isNew = !existsSync(p);
    if (isNew) mkdirSync(p, { recursive: true });
    note(d === '' ? '.' : `${d}/`, isNew);
  }

  for (const [filepath, content] of Object.entries(SCAFFOLD_FILES)) {
    const p = join(target, filepath);
    const isNew = !existsSync(p);
    if (isNew) {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content, 'utf-8');
    }
    note(filepath, isNew);
  }

  const pkgPath = join(target, 'package.json');
  const pkgIsNew = !existsSync(pkgPath);
  if (pkgIsNew) {
    const pkg = {
      name,
      private: true,
      type: 'module',
      scripts: { ctx: 'bun run bin/ctx.ts' },
      dependencies: { '@pc-ctx/cli': '^0.5.0' },
    };
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
  }
  note('package.json', pkgIsNew);

  const binPath = join(target, 'bin', 'ctx.ts');
  const binIsNew = !existsSync(binPath);
  if (binIsNew) {
    const proxyBin = `#!/usr/bin/env node\nimport('@pc-ctx/cli').catch(() => {\n  console.error('Install @pc-ctx/cli first: pnpm add @pc-ctx/cli');\n  process.exit(1);\n});\n`;
    writeFileSync(binPath, proxyBin, 'utf-8');
  }
  note('bin/ctx.ts', binIsNew);

  return { created, existing };
}
