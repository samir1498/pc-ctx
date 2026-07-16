import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let tmpDir: string;
let ctxCli: string;

function ctx(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${ctxCli} ${args.join(' ')}`, {
      cwd: tmpDir,
      encoding: 'utf-8',
      env: { ...process.env, PC_CTX_ROOT: tmpDir, PC_CTX_RESEARCH_DIR: join(tmpDir, 'research') },
    });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (e: any) {
    return {
      stdout: e.stdout?.toString() || '',
      stderr: e.stderr?.toString() || '',
      exitCode: e.status || 1,
    };
  }
}

function writePlan(name: string, content: string): void {
  writeFileSync(join(tmpDir, 'plans', name), content, 'utf-8');
}

const SAMPLE_PLAN = `---
title: Test Plan
slug: test-plan
status: active
category: test
created: 20260621
tldr: Integration test plan.
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

Body content.
`;

describe('CLI integration', () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pc-ctx-it-'));
    ctxCli = join(process.cwd(), 'packages', 'cli', 'dist', 'index.js');
    mkdirSync(join(tmpDir, 'plans'), { recursive: true });
    mkdirSync(join(tmpDir, 'roadmaps'), { recursive: true });
    mkdirSync(join(tmpDir, 'research'), { recursive: true });
    writePlan('test-plan.md', SAMPLE_PLAN);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('list shows all plans', () => {
    const { stdout, exitCode } = ctx('list');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('test-plan');
    expect(stdout).toContain('Integration test plan');
    expect(stdout).toContain('50');
  });

  it('show displays plan details', () => {
    const { stdout, exitCode } = ctx('show', 'test-plan');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Test Plan');
    expect(stdout).toContain('TLDR');
    expect(stdout).toContain('1/2');
  });

  it('show errors on missing plan', () => {
    const { stderr, exitCode } = ctx('show', 'nonexistent');
    expect(exitCode).toBe(1);
    expect(stderr || '').toContain('not found');
  });

  it('status shows grouped overview', () => {
    const { stdout, exitCode } = ctx('status');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('1 active');
    expect(stdout).toContain('test');
  });

  it('validate checks all plan files', () => {
    const { stdout, exitCode } = ctx('validate');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('All files valid');
  });

  it('list --status active filters by status', () => {
    const { stdout } = ctx('list', '--status', 'active');
    expect(stdout).toContain('test-plan');
  });

  it('list --status done shows empty when none done', () => {
    const { stdout } = ctx('list', '--status', 'done');
    expect(stdout).not.toContain('test-plan');
  });

  it('plan set-status updates plan status', () => {
    ctx('plan', 'set-status', 'test-plan', 'done');
    const { stdout } = ctx('show', 'test-plan');
    expect(stdout).toContain('done');
    // reset
    ctx('plan', 'set-status', 'test-plan', 'active');
  });

  it('plan task-status updates task status', () => {
    ctx('plan', 'task-status', 'test-plan', 'T1', 'done');
    const { stdout } = ctx('show', 'test-plan');
    expect(stdout).toContain('2/2');
    // reset
    ctx('plan', 'task-status', 'test-plan', 'T1', 'pending');
  });

  it('plan add-task adds a task', () => {
    ctx('plan', 'add-task', 'test-plan', 'T3', 'New-task', 'pending');
    const { stdout } = ctx('show', 'test-plan');
    expect(stdout).toContain('T3');
    expect(stdout).toContain('New-task');
  });

  it('graph shows dependency graph', () => {
    const { stdout, exitCode } = ctx('graph');
    expect(exitCode).toBe(0);
  });

  it('research list shows empty research', () => {
    const { stdout, exitCode } = ctx('research', 'list');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('No research files found');
  });

  it('plan add --body-file writes the body verbatim', () => {
    const bodyPath = join(tmpDir, 'custom-body.md');
    writeFileSync(bodyPath, '# Custom Plan\n\nVerbatim body content.\n', 'utf-8');
    const { stdout, exitCode } = ctx('plan', 'add', 'Custom-Body-Plan', '--body-file', bodyPath);
    expect(exitCode).toBe(0);
    const match = stdout.match(/plans\/(\S+\.md)/);
    expect(match).toBeTruthy();
    const onDisk = readFileSync(join(tmpDir, 'plans', match![1]), 'utf-8');
    expect(onDisk).toContain('Verbatim body content.');
    expect(onDisk).not.toContain('TODO: define goal');
  });

  it('plan add --body writes the inline body', () => {
    const { stdout, exitCode } = ctx('plan', 'add', 'Inline-Body-Plan', '--body', 'Inline-body-text');
    expect(exitCode).toBe(0);
    const match = stdout.match(/plans\/(\S+\.md)/);
    const onDisk = readFileSync(join(tmpDir, 'plans', match![1]), 'utf-8');
    expect(onDisk).toContain('Inline-body-text');
  });

  it('plan add falls back to the stub when no body is given', () => {
    const { stdout, exitCode } = ctx('plan', 'add', 'Stub-Body-Plan');
    expect(exitCode).toBe(0);
    const match = stdout.match(/plans\/(\S+\.md)/);
    const onDisk = readFileSync(join(tmpDir, 'plans', match![1]), 'utf-8');
    expect(onDisk).toContain('TODO: define goal');
  });
});

const ROOT_TEST_PLAN = `---
title: Root Fallback Plan
slug: root-fallback-plan
status: active
category: test
created: 20260621
tldr: Plan used to prove root resolution.
---
# Root Fallback Plan
`;

describe('CLI root resolution', () => {
  let noStoreDir: string;
  let storeDir: string;
  let emptyHome: string;
  let configuredHome: string;

  beforeAll(() => {
    noStoreDir = mkdtempSync(join(tmpdir(), 'pc-ctx-noroot-'));
    storeDir = mkdtempSync(join(tmpdir(), 'pc-ctx-store-'));
    emptyHome = mkdtempSync(join(tmpdir(), 'pc-ctx-home-empty-'));
    configuredHome = mkdtempSync(join(tmpdir(), 'pc-ctx-home-cfg-'));

    mkdirSync(join(storeDir, 'plans'), { recursive: true });
    writeFileSync(join(storeDir, 'plans', 'root-fallback-plan.md'), ROOT_TEST_PLAN, 'utf-8');

    mkdirSync(join(configuredHome, '.pc-ctx'), { recursive: true });
    writeFileSync(join(configuredHome, '.pc-ctx', 'config.json'), JSON.stringify({ contentRoot: storeDir }), 'utf-8');
  });

  afterAll(() => {
    rmSync(noStoreDir, { recursive: true, force: true });
    rmSync(storeDir, { recursive: true, force: true });
    rmSync(emptyHome, { recursive: true, force: true });
    rmSync(configuredHome, { recursive: true, force: true });
  });

  // Runs `ctx <args>` with PC_CTX_ROOT/PC_CTX_RESEARCH_DIR stripped from the inherited
  // environment (so only `envOverrides` — typically HOME and/or an explicit PC_CTX_ROOT —
  // determine root resolution), from the given cwd.
  function ctxEnv(
    cwd: string,
    envOverrides: Record<string, string>,
    ...args: string[]
  ): { stdout: string; stderr: string; exitCode: number } {
    const { PC_CTX_ROOT: _root, PC_CTX_RESEARCH_DIR: _research, ...rest } = process.env;
    const env = { ...rest, ...envOverrides };
    try {
      const stdout = execSync(`node ${ctxCli} ${args.join(' ')}`, { cwd, encoding: 'utf-8', env });
      return { stdout, stderr: '', exitCode: 0 };
    } catch (e: any) {
      return { stdout: e.stdout?.toString() || '', stderr: e.stderr?.toString() || '', exitCode: e.status || 1 };
    }
  }

  it('errors clearly, naming the path, when no context store is found (cwd fallback, no config)', () => {
    const { stderr, exitCode } = ctxEnv(noStoreDir, { HOME: emptyHome }, 'list');
    expect(exitCode).toBe(1);
    expect(stderr).toContain('no context store found');
    expect(stderr).toContain(noStoreDir);
    expect(stderr).toContain('ctx config --root');
  });

  it('cwd fallback still works when cwd itself is a valid context store', () => {
    const { stdout, exitCode } = ctxEnv(storeDir, { HOME: emptyHome }, 'list');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('root-fallback-plan');
  });

  it('respects the root saved by `ctx config --root` when invoked from an unrelated cwd', () => {
    const { stdout, exitCode } = ctxEnv(noStoreDir, { HOME: configuredHome }, 'list');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('root-fallback-plan');
  });

  it('show also resolves the configured root from an unrelated cwd', () => {
    const { stdout, exitCode } = ctxEnv(noStoreDir, { HOME: configuredHome }, 'show', 'root-fallback-plan');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Root Fallback Plan');
  });

  it('explicit PC_CTX_ROOT env takes precedence over the configured root', () => {
    // configuredHome's config.json points at storeDir (a valid store), but PC_CTX_ROOT
    // here points at noStoreDir (empty) — env must win, so this should still error.
    const { stderr, exitCode } = ctxEnv(noStoreDir, { HOME: configuredHome, PC_CTX_ROOT: noStoreDir }, 'list');
    expect(exitCode).toBe(1);
    expect(stderr).toContain('no context store found');
  });

  it('`ctx config --show` works with no context store present (exempt from the store check)', () => {
    const { stdout, exitCode } = ctxEnv(noStoreDir, { HOME: emptyHome }, 'config', '--show');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('root:');
  });
});
