import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  VALID_STATUSES,
  VALID_TASK_STATUSES,
  findResearchFile,
  fmtPrio,
  fmtTasks,
  listResearchFiles,
  parsePlanFile,
  readAllPlans,
  serializePlanFile,
  slugify,
  statusBadge,
  writePlanFileAtomic,
} from './index';

const VALID_PLAN = `---
title: Test Plan
slug: test-plan
status: active
category: test
created: 20260621
tldr: A test plan for unit tests.
priority: 50
tasks:
  - id: T1
    title: Do something
    status: pending
  - id: T2
    title: Do another thing
    status: done
acceptance:
  - All tests pass
references: []
---
# Test Plan

Some body content.
`;

describe('parsePlanFile', () => {
  it('parses valid frontmatter', () => {
    const filepath = planPath('valid.md');
    writePlan('valid.md', VALID_PLAN);
    const result = parsePlanFile(filepath);
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('test-plan');
    expect(result!.frontmatter.title).toBe('Test Plan');
    expect(result!.frontmatter.priority).toBe(50);
    expect(result!.body).toContain('Some body content');
  });

  it('returns null for invalid file', () => {
    const result = parsePlanFile('/nonexistent/file.md');
    expect(result).toBeNull();
  });

  it('uses filename when slug is missing', () => {
    const content = `---
title: No Slug
status: active
---
Body
`;
    writePlan('no-slug.md', content);
    const result = parsePlanFile(planPath('no-slug.md'));
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('no-slug');
  });

  it('returns null for malformed YAML', () => {
    const content = `---
invalid: yaml: : :
---
Body
`;
    writePlan('bad-yaml.md', content);
    const result = parsePlanFile(planPath('bad-yaml.md'));
    expect(result).toBeNull();
  });
});

describe('serializePlanFile', () => {
  it('round-trips parsePlanFile', () => {
    writePlan('roundtrip.md', VALID_PLAN);
    const parsed = parsePlanFile(planPath('roundtrip.md'));
    expect(parsed).not.toBeNull();
    const serialized = serializePlanFile(parsed!);
    const reparsed = parsePlanFile(planPath('roundtrip.md'));
    // write back and re-parse
    writePlan('roundtrip.md', serialized);
    const reparsed2 = parsePlanFile(planPath('roundtrip.md'));
    expect(reparsed2!.frontmatter.title).toBe(parsed!.frontmatter.title);
    expect(reparsed2!.frontmatter.priority).toBe(parsed!.frontmatter.priority);
  });
});

describe('readAllPlans', () => {
  it('reads all plans from a directory', () => {
    writePlan('plan-a.md', VALID_PLAN);
    writePlan('plan-b.md', VALID_PLAN.replace('slug: test-plan', 'slug: plan-b'));
    const plans = readAllPlans(tmpPlanDir);
    expect(plans.length).toBeGreaterThanOrEqual(2);
    const slugs = plans.map((p) => p.slug);
    expect(slugs).toContain('test-plan');
    expect(slugs).toContain('plan-b');
  });
});

describe('slugify', () => {
  it('converts title to kebab-case', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Feature: New Stuff!!!')).toBe('feature-new-stuff');
    expect(slugify('  trim  me  ')).toBe('trim-me');
    expect(slugify('a'.repeat(100))).toHaveLength(60);
  });
});

describe('fmtTasks', () => {
  it('formats task counts', () => {
    expect(
      fmtTasks([
        { id: 'T1', status: 'done' },
        { id: 'T2', status: 'pending' },
      ]),
    ).toBe('1/2');
    expect(fmtTasks([])).toBe('—');
    expect(fmtTasks()).toBe('—');
  });
});

describe('fmtPrio', () => {
  it('formats priority', () => {
    expect(fmtPrio(100)).toBe('100');
    expect(fmtPrio()).toBe('—');
  });
});

describe('statusBadge', () => {
  it('returns correct badges', () => {
    expect(statusBadge('active')).toContain('active');
    expect(statusBadge('active')).toContain('●');
    expect(statusBadge('done')).toContain('✓');
  });
});

describe('VALID_STATUSES', () => {
  it('contains expected statuses', () => {
    expect(VALID_STATUSES).toContain('active');
    expect(VALID_STATUSES).toContain('done');
  });
});

describe('VALID_TASK_STATUSES', () => {
  it('contains expected statuses', () => {
    expect(VALID_TASK_STATUSES).toContain('pending');
    expect(VALID_TASK_STATUSES).toContain('done');
  });
});

describe('listResearchFiles', () => {
  let researchDir = '';

  beforeAll(() => {
    researchDir = mkdtempSync(join(tmpdir(), 'pc-ctx-research-'));
    const write = (rel: string, body = '# doc\n') => {
      const full = join(researchDir, rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, body, 'utf-8');
    };
    write('root.md'); // depth 0
    write('engineering/foo.md'); // depth 1
    write('engineering/sub/deep.md'); // depth 2 (deeper than the old one-level walk)
    write('engineering/dup.md'); // duplicate basename across folders
    write('marketing/dup.md');
    write('README.md'); // must be skipped at any level
    write('engineering/INDEX.md'); // must be skipped at any level
    mkdirSync(join(researchDir, 'node_modules'), { recursive: true });
    writeFileSync(join(researchDir, 'node_modules', 'pkg.md'), '# nope\n', 'utf-8');
  });

  afterAll(() => {
    rmSync(researchDir, { recursive: true, force: true });
  });

  it('recurses all depths and uses path-based slugs', () => {
    const slugs = listResearchFiles(researchDir)
      .map((f) => f.slug)
      .sort();
    expect(slugs).toEqual(['engineering/dup', 'engineering/foo', 'engineering/sub/deep', 'marketing/dup', 'root']);
  });

  it('skips README.md, INDEX.md, and node_modules at any level', () => {
    const slugs = listResearchFiles(researchDir).map((f) => f.slug);
    expect(slugs).not.toContain('README');
    expect(slugs).not.toContain('engineering/INDEX');
    expect(slugs.some((s) => s.includes('node_modules'))).toBe(false);
  });

  it('findResearchFile resolves by full slug', () => {
    expect(findResearchFile(researchDir, 'engineering/sub/deep')?.slug).toBe('engineering/sub/deep');
  });

  it('findResearchFile resolves by unique basename', () => {
    expect(findResearchFile(researchDir, 'foo')?.slug).toBe('engineering/foo');
  });

  it('findResearchFile returns null for an ambiguous basename', () => {
    expect(findResearchFile(researchDir, 'dup')).toBeNull();
  });

  it('findResearchFile returns null when nothing matches', () => {
    expect(findResearchFile(researchDir, 'does-not-exist')).toBeNull();
  });
});

// ─── Helpers ───────────────────────────────────────────

let tmpPlanDir = '';

function planPath(name: string): string {
  return join(tmpPlanDir, name);
}

function writePlan(name: string, content: string): void {
  writeFileSync(planPath(name), content, 'utf-8');
}

beforeAll(() => {
  tmpPlanDir = mkdtempSync(join(tmpdir(), 'pc-ctx-unit-'));
});

afterAll(() => {
  rmSync(tmpPlanDir, { recursive: true, force: true });
});

describe('writePlanFileAtomic', () => {
  it('creates the target dir when it does not exist yet', () => {
    const dir = join(tmpPlanDir, 'handoffs-does-not-exist-yet');
    expect(existsSync(dir)).toBe(false);
    writePlanFileAtomic({
      slug: 'fresh',
      filename: '20260624-fresh.md',
      dir,
      frontmatter: {
        title: 'Fresh',
        slug: 'fresh',
        status: 'active',
        category: 'handoffs',
        created: 20260624,
        tldr: 'x',
      },
      body: '# Fresh\n',
      raw: '',
    });
    const written = parsePlanFile(join(dir, '20260624-fresh.md'));
    expect(written).not.toBeNull();
    expect(written!.body).toContain('# Fresh');
  });
});
