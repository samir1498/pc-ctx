import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
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
export const VALID_TASK_STATUSES = ['pending', 'in-progress', 'done', 'blocked'];

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
  return [...readAllPlans(plansDir), ...readAllPlans(roadmapsDir)].find(p => p.slug === slug) || null;
}

export function listResearchFiles(researchDir: string): { slug: string; filepath: string; title: string }[] {
  if (!existsSync(researchDir)) return [];
  const entries = readdirSync(researchDir, { withFileTypes: true });
  const files: { slug: string; filepath: string; title: string }[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'README.md' || entry.name === 'INDEX.md') continue;
    const fullPath = join(researchDir, entry.name);
    if (entry.isDirectory()) {
      for (const sub of readdirSync(fullPath, { withFileTypes: true })) {
        if (!sub.name.endsWith('.md') || sub.name.startsWith('.')) continue;
        const slug = basename(sub.name, '.md');
        files.push({ slug, filepath: join(fullPath, sub.name), title: slug.replace(/-/g, ' ') });
      }
    } else if (entry.name.endsWith('.md')) {
      const slug = basename(entry.name, '.md');
      files.push({ slug, filepath: fullPath, title: slug.replace(/-/g, ' ') });
    }
  }
  return files;
}

export function findResearchFile(researchDir: string, slugOrPath: string): { slug: string; filepath: string; content: string } | null {
  const files = listResearchFiles(researchDir);
  const match = files.find(f => f.slug === slugOrPath || f.filepath.endsWith(slugOrPath));
  if (!match) return null;
  return { ...match, content: readFileSync(match.filepath, 'utf-8') };
}

export function resolveRef(
  raw: string,
  plansDir: string,
  roadmapsDir: string,
  researchDir: string,
): ResolvedRef {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return { type: 'unknown', target: raw, label: raw };

  const prefix = raw.slice(0, colonIdx);
  const target = raw.slice(colonIdx + 1);

  switch (prefix) {
    case 'research': {
      const file = findResearchFile(researchDir, target);
      return file
        ? { type: 'research', target, label: target, description: `research file: ${relative(researchDir, file.filepath)}` }
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
  if (f.entries) for (const e of f.entries) if (e.ref.startsWith('research:') || e.ref.startsWith('url:')) refs.push(e.ref);
  return [...new Set(refs)];
}

export function fmtTasks(tasks?: Task[]): string {
  if (!tasks?.length) return '—';
  return `${tasks.filter(t => t.status === 'done').length}/${tasks.length}`;
}

export function fmtPrio(p?: number): string {
  return p != null ? String(p) : '—';
}

export function fmtCell(text: string, width: number): string {
  if (!text) return ''.padEnd(width);
  return text.length <= width ? text.padEnd(width) : text.slice(0, width - 3) + '…';
}

export function statusBadge(s: string): string {
  const m: Record<string, string> = { active: '●', paused: '○', done: '✓', cancelled: '✗' };
  return `${m[s] || '?'} ${s}`;
}

export function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
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

## Quick start
- \`bun run ctx status\` — overview
- \`bun run ctx list\` — all plans
- \`bun run ctx show <slug>\` — plan details
- \`bun run ctx plan add <title>\` — new plan
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
created: YYYYMMDD
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
period: YYYY-QX
tldr: Example roadmap showing the format — reference to plans with status pointers.
priority: 50
entries:
  - ref: example-plan
    status: in-progress
---
# Example Roadmap

High-level initiative map. Each entry points to a plan file in \`plans/\`.
`,
};
