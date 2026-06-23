import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
});
