import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import yaml from 'js-yaml';

export interface Task {
  id: string;
  title?: string;
  desc?: string;
  status: string;
  refs?: string[];
}

export interface PlanMeta {
  title: string;
  slug: string;
  status: string;
  category: string;
  created: number;
  tldr: string;
  tasks?: Task[];
  acceptance?: string[];
  priority?: number;
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

export function parsePlanFile(filepath: string): PlanFile | null {
  const raw = readFileSync(filepath, 'utf-8');
  const slug = basename(filepath, '.md');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  try {
    const yamlStr = match[1];
    if (!yamlStr) return null;
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

export interface Adapter {
  name: string;
  onPlanCreate?: (plan: PlanFile) => void;
  onPlanUpdate?: (plan: PlanFile) => void;
  onPlanDelete?: (slug: string) => void;
  onSync?: () => void;
}
