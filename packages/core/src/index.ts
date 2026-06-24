import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
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
 */
export function validateDomains(domains: [string, string][]): ValidateResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let checked = 0;

  for (const [domain, dir] of domains) {
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
  'progress/now.md': `# Now

## Today's Focus
- (what you're actively working on — 3-5 lines max)

## Active
Run \`bun run ctx status\` for full overview.
Run \`bun run ctx show <slug>\` for plan details.
`,
  'progress/daily.md': `# YYYY-MM-DD

## YYYY-MM-DD HH:MM UTC
- (intraday log entries)
`,
  'progress/YYYY-Www.md': `# Week WW (YYYY-MM-DD → YYYY-MM-DD)

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
