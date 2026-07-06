import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from './server.js';

let tmpDir: string;
let server: McpServer;
let client: Client;

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
acceptance:
  - All tests pass
references: []
---
# Test Plan

Body content.
`;

const SAMPLE_ROADMAP = `---
title: Test Roadmap
slug: test-roadmap
status: active
category: roadmap
created: 20260621
tldr: Integration test roadmap.
period: 2026-H2
entries:
  - ref: test-plan
    status: planned
    note: Existing note.
---
# Test Roadmap
`;

interface ToolResult {
  content: { type: string; text: string }[];
  isError?: boolean;
}

async function call(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
  return (await client.callTool({ name, arguments: args })) as ToolResult;
}

function textOf(result: ToolResult): string {
  return result.content.map((c) => c.text).join('\n');
}

describe('MCP server integration', () => {
  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'pc-ctx-mcp-it-'));
    mkdirSync(join(tmpDir, 'plans'), { recursive: true });
    mkdirSync(join(tmpDir, 'roadmaps'), { recursive: true });
    mkdirSync(join(tmpDir, 'research'), { recursive: true });
    mkdirSync(join(tmpDir, 'ideas'), { recursive: true });
    writeFileSync(join(tmpDir, 'plans', 'test-plan.md'), SAMPLE_PLAN, 'utf-8');
    writeFileSync(join(tmpDir, 'roadmaps', 'test-roadmap.md'), SAMPLE_ROADMAP, 'utf-8');

    server = buildServer(join(tmpDir, 'plans'), join(tmpDir, 'roadmaps'), join(tmpDir, 'research'), tmpDir);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.0.0' });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterAll(async () => {
    await client.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers the expected tool surface', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('plan_list');
    expect(names).toContain('plan_show');
    expect(names).toContain('plan_set_status');
    expect(names).toContain('plan_add_task');
  });

  it('plan_list returns the seeded plan', async () => {
    const result = await call('plan_list');
    const rows = JSON.parse(textOf(result));
    const items = Array.isArray(rows) ? rows : rows.items;
    expect(items.some((p: { slug: string }) => p.slug === 'test-plan')).toBe(true);
  });

  it('plan_show returns plan shape', async () => {
    const result = await call('plan_show', { slug: 'test-plan' });
    const plan = JSON.parse(textOf(result));
    expect(plan.title).toBe('Test Plan');
    expect(plan.status).toBe('active');
    expect(plan.tldr).toBe('Integration test plan.');
    expect(plan.tasks).toHaveLength(1);
  });

  it('plan_set_status round-trips to disk', async () => {
    const result = await call('plan_set_status', { slug: 'test-plan', status: 'done' });
    expect(result.isError).toBeFalsy();
    const onDisk = readFileSync(join(tmpDir, 'plans', 'test-plan.md'), 'utf-8');
    expect(onDisk).toContain('status: done');
    // reset
    await call('plan_set_status', { slug: 'test-plan', status: 'active' });
  });

  it('plan_add_task appends a task and round-trips', async () => {
    const result = await call('plan_add_task', { slug: 'test-plan', id: 'T2', desc: 'Added task' });
    expect(result.isError).toBeFalsy();
    const onDisk = readFileSync(join(tmpDir, 'plans', 'test-plan.md'), 'utf-8');
    expect(onDisk).toContain('id: T2');
    expect(onDisk).toContain('Added task');
  });

  it('plan_add_task accepts the cancelled status', async () => {
    const result = await call('plan_add_task', {
      slug: 'test-plan',
      id: 'T3',
      desc: 'Cancelled task',
      status: 'cancelled',
    });
    expect(result.isError).toBeFalsy();
  });

  it('returns a notFound error for a missing slug', async () => {
    const result = await call('plan_set_status', { slug: 'does-not-exist', status: 'done' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('not found');
  });

  it('plan_add writes a provided body verbatim', async () => {
    const result = await call('plan_add', { title: 'Body Plan', body: '# Body Plan\n\nReal content here.\n' });
    expect(result.isError).toBeFalsy();
    const { filename } = JSON.parse(textOf(result));
    const onDisk = readFileSync(join(tmpDir, 'plans', filename), 'utf-8');
    expect(onDisk).toContain('Real content here.');
    expect(onDisk).not.toContain('TODO: define goal');
  });

  it('plan_add falls back to the stub when body is omitted', async () => {
    const result = await call('plan_add', { title: 'Stub Plan' });
    expect(result.isError).toBeFalsy();
    const { filename } = JSON.parse(textOf(result));
    const onDisk = readFileSync(join(tmpDir, 'plans', filename), 'utf-8');
    expect(onDisk).toContain('TODO: define goal');
  });

  it('ideas_add writes a provided body verbatim', async () => {
    const result = await call('ideas_add', { title: 'Body Idea', body: '# Body Idea\n\nIdea content.\n' });
    expect(result.isError).toBeFalsy();
    const { filename } = JSON.parse(textOf(result));
    const onDisk = readFileSync(join(tmpDir, 'ideas', filename), 'utf-8');
    expect(onDisk).toContain('Idea content.');
  });

  it('repos_add writes to a per-repo folder (repos/<slug>/repo.md), not a flat dated file', async () => {
    const result = await call('repos_add', { title: 'Body Repo', body: '# Body Repo\n\nRepo content.\n' });
    expect(result.isError).toBeFalsy();
    const { slug, filename } = JSON.parse(textOf(result));
    expect(slug).toBe('body-repo');
    expect(filename).toBe(join('body-repo', 'repo.md'));
    const onDisk = readFileSync(join(tmpDir, 'repos', filename), 'utf-8');
    expect(onDisk).toContain('Repo content.');
  });

  it('repos_list and repos_show see the foldered repo entry', async () => {
    const listResult = await call('repos_list');
    const rows = JSON.parse(textOf(listResult));
    const items = Array.isArray(rows) ? rows : rows.items;
    expect(items.some((r: { slug: string }) => r.slug === 'body-repo')).toBe(true);

    const showResult = await call('repos_show', { slug: 'body-repo' });
    const repo = JSON.parse(textOf(showResult));
    expect(repo.title).toBe('Body Repo');
  });

  it('registers the roadmap entry mutation tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('roadmap_set_entry_status');
    expect(names).toContain('roadmap_add_entry');
  });

  it('roadmap_set_entry_status updates status and preserves the note when omitted', async () => {
    const result = await call('roadmap_set_entry_status', { slug: 'test-roadmap', ref: 'test-plan', status: 'done' });
    expect(result.isError).toBeFalsy();
    const onDisk = readFileSync(join(tmpDir, 'roadmaps', 'test-roadmap.md'), 'utf-8');
    expect(onDisk).toContain('status: done');
    expect(onDisk).toContain('Existing note.');
  });

  it('roadmap_set_entry_status updates the note when provided', async () => {
    const result = await call('roadmap_set_entry_status', {
      slug: 'test-roadmap',
      ref: 'test-plan',
      status: 'next',
      note: 'Updated note.',
    });
    expect(result.isError).toBeFalsy();
    const onDisk = readFileSync(join(tmpDir, 'roadmaps', 'test-roadmap.md'), 'utf-8');
    expect(onDisk).toContain('status: next');
    expect(onDisk).toContain('Updated note.');
    expect(onDisk).not.toContain('Existing note.');
  });

  it('roadmap_set_entry_status errors on a missing entry ref', async () => {
    const result = await call('roadmap_set_entry_status', { slug: 'test-roadmap', ref: 'nope', status: 'done' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('not found');
  });

  it('roadmap_set_entry_status returns notFound for a missing roadmap', async () => {
    const result = await call('roadmap_set_entry_status', { slug: 'does-not-exist', ref: 'test-plan', status: 'done' });
    expect(result.isError).toBe(true);
  });

  it('roadmap_add_entry appends a new entry', async () => {
    const result = await call('roadmap_add_entry', {
      slug: 'test-roadmap',
      ref: 'another-plan',
      status: 'planned',
      note: 'New entry.',
    });
    expect(result.isError).toBeFalsy();
    const onDisk = readFileSync(join(tmpDir, 'roadmaps', 'test-roadmap.md'), 'utf-8');
    expect(onDisk).toContain('ref: another-plan');
    expect(onDisk).toContain('New entry.');
  });

  it('roadmap_add_entry errors on a duplicate ref', async () => {
    const result = await call('roadmap_add_entry', { slug: 'test-roadmap', ref: 'another-plan' });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('already exists');
  });
});
