#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import {
  type PlanMeta,
  SCAFFOLD_FILES,
  VALID_STATUSES,
  VALID_TASK_STATUSES,
  collectRefs,
  findPlan,
  findResearchFile,
  fmtCell,
  fmtPrio,
  fmtTasks,
  listResearchFiles,
  parsePlanFile,
  readAllPlans,
  resolveRef,
  slugify,
  statusBadge,
  validateDomains,
  writePlanFileAtomic,
} from '@pc-ctx/core';
import { createMain, defineCommand } from 'citty';

const ROOT = process.env.PC_CTX_ROOT || process.cwd();
const PLANS_DIR = join(ROOT, 'plans');
const ROADMAPS_DIR = join(ROOT, 'roadmaps');
const RESEARCH_DIR = process.env.PC_CTX_RESEARCH_DIR || join(ROOT, '..', 'personal-research');
const IDEAS_DIR = join(ROOT, 'ideas');
const PROCESSES_DIR = join(ROOT, 'processes');
const PROGRESS_DIR = join(ROOT, 'progress');
const REFERENCES_DIR = join(ROOT, 'references');
const ARCHIVE_DIR = join(ROOT, 'archive');
const HANDOFFS_DIR = join(ROOT, 'handoffs');

const ALL_DOMAINS: [string, string][] = [
  ['plans', PLANS_DIR],
  ['roadmaps', ROADMAPS_DIR],
  ['ideas', IDEAS_DIR],
  ['processes', PROCESSES_DIR],
  ['progress', PROGRESS_DIR],
  ['references', REFERENCES_DIR],
  ['archive', ARCHIVE_DIR],
  ['handoffs', HANDOFFS_DIR],
];

const listCmd = defineCommand({
  meta: { name: 'list', description: 'List all plans' },
  args: {
    status: { type: 'string', description: 'Filter by status', required: false },
    category: { type: 'string', description: 'Filter by category', required: false },
    sort: { type: 'string', description: 'Sort field (priority)', required: false },
  },
  run({ args }) {
    const plans = readAllPlans(PLANS_DIR);
    const filtered = plans.filter((p) => {
      if (args.status && p.frontmatter.status !== args.status) return false;
      if (args.category && p.frontmatter.category !== args.category) return false;
      return true;
    });
    const sorted = [...filtered];
    if (args.sort === 'priority') sorted.sort((a, b) => (b.frontmatter.priority || 0) - (a.frontmatter.priority || 0));
    else sorted.sort((a, b) => String(a.frontmatter.created).localeCompare(String(b.frontmatter.created)));

    const rows = [
      '| Slug | Status | Category | Prio | Tasks | Tldr |',
      '|------|--------|----------|------|-------|------|',
    ];
    for (const p of sorted) {
      const f = p.frontmatter;
      rows.push(
        `| ${fmtCell(f.slug, 30)} | ${fmtCell(f.status, 8)} | ${fmtCell(f.category, 8)} | ${fmtPrio(f.priority).padStart(4)} | ${fmtTasks(f.tasks).padStart(5)} | ${fmtCell(f.tldr, 40)} |`,
      );
    }
    console.log(rows.join('\n'));
  },
});

const showCmd = defineCommand({
  meta: { name: 'show', description: 'Show plan details' },
  args: { slug: { type: 'positional', description: 'Plan slug', required: true } },
  run({ args }) {
    const plan = findPlan(PLANS_DIR, ROADMAPS_DIR, args.slug);
    if (!plan) {
      console.error(`error: plan "${args.slug}" not found`);
      process.exit(1);
    }
    const f = plan.frontmatter;
    const lines: string[] = [];
    lines.push(`## ${f.slug} — ${f.title}`);
    lines.push(
      `**Status:** ${statusBadge(f.status)}${f.category ? ` · **Category:** ${f.category}` : ''} · **Priority:** ${fmtPrio(f.priority)}`,
    );
    lines.push('', `**TLDR:** ${f.tldr}`, '');

    if (f.tasks?.length) {
      lines.push(`### Tasks (${fmtTasks(f.tasks)})`);
      lines.push('| ID | Status | Description |', '|----|--------|-------------|');
      for (const t of f.tasks) {
        const refs = t.refs?.length
          ? ` ${t.refs
              .map((r) => resolveRef(r, PLANS_DIR, ROADMAPS_DIR, RESEARCH_DIR))
              .map((ri) => `\`${ri.label}\``)
              .join(' ')}`
          : '';
        lines.push(`| ${fmtCell(t.id, 20)} | ${fmtCell(t.status, 11)} | ${t.desc || t.title || '—'}${refs} |`);
      }
      lines.push('');
    }
    if (f.acceptance?.length) {
      const items = f.acceptance.map((a) => (typeof a === 'string' ? { id: '', desc: a, status: 'pending' } : a));
      const done = items.filter((a: { status?: string }) => a.status === 'done').length;
      lines.push(`### Acceptance (${done}/${items.length})`);
      lines.push('| ID | Status | Criteria |', '|----|--------|----------|');
      for (const a of items)
        lines.push(`| ${fmtCell(a.id || '', 15)} | ${fmtCell(a.status || 'pending', 11)} | ${a.desc} |`);
      lines.push('');
    }

    const refs = collectRefs(plan);
    if (refs.length) {
      lines.push('### References');
      for (const r of refs) {
        const resolved = resolveRef(r, PLANS_DIR, ROADMAPS_DIR, RESEARCH_DIR);
        lines.push(
          `- \`${resolved.label}\` — ${resolved.description || resolved.target}${resolved.type === 'research' && findResearchFile(RESEARCH_DIR, resolved.target) ? ` (\`research show ${resolved.target}\`)` : ''}`,
        );
      }
      lines.push('');
    }

    const allDocs = [...readAllPlans(PLANS_DIR), ...readAllPlans(ROADMAPS_DIR)];
    const backlinks = allDocs.filter(
      (d) => d.slug !== plan.slug && collectRefs(d).some((r) => r === `plan:${plan.slug}`),
    );
    if (backlinks.length) {
      lines.push('### Referenced by');
      for (const b of backlinks) lines.push(`- \`${b.slug}\` — ${b.frontmatter.tldr}`);
      lines.push('');
    }

    if (f.entries?.length) {
      lines.push('### Entries');
      for (const e of f.entries) lines.push(`- **${e.ref}** — ${e.status || ''}${e.note ? ` · ${e.note}` : ''}`);
      lines.push('');
    }
    console.log(lines.join('\n'));
  },
});

const statusCmd = defineCommand({
  meta: { name: 'status', description: 'Grouped status overview' },
  run() {
    const plans = readAllPlans(PLANS_DIR);
    const active = plans.filter((p) => p.frontmatter.status === 'active');
    const paused = plans.filter((p) => p.frontmatter.status === 'paused');
    const done = plans.filter((p) => p.frontmatter.status === 'done');

    const lines: string[] = [];
    lines.push(
      '## Status Overview',
      '',
      `**${active.length} active · ${paused.length} paused · ${done.length} done**`,
      '',
    );

    if (active.length) {
      lines.push('### Active');
      const byCat: Record<string, typeof active> = {};
      for (const p of active) {
        const cat = p.frontmatter.category || 'other';
        if (!byCat[cat]) byCat[cat] = [];
        byCat[cat].push(p);
      }
      for (const [cat, catPlans] of Object.entries(byCat).sort()) {
        lines.push(`**${cat}**`);
        for (const p of catPlans) {
          const f = p.frontmatter;
          lines.push(
            `  - \`${f.slug}\`${f.priority ? ` · prio ${f.priority}` : ''}${f.tasks ? ` · ${fmtTasks(f.tasks)} tasks` : ''}`,
            `    ${f.tldr}`,
          );
        }
        lines.push('');
      }
    }
    if (paused.length) {
      lines.push('### Paused');
      for (const p of paused) lines.push(`  - \`${p.frontmatter.slug}\` · ${p.frontmatter.tldr}`);
      lines.push('');
    }
    console.log(lines.join('\n'));
  },
});

const validateCmd = defineCommand({
  meta: { name: 'validate', description: 'Validate all plan files' },
  args: {
    domain: { type: 'string', description: 'Domain to validate (default: all)', required: false },
  },
  run({ args }) {
    const domains = args.domain ? ALL_DOMAINS.filter(([d]) => d === args.domain) : ALL_DOMAINS;
    const { checked, errors, warnings } = validateDomains(domains);

    console.log('## Validate', '', `Checked ${checked} files across ${domains.length} domains.`, '');
    if (errors.length) {
      console.log(`### Errors (${errors.length})`);
      for (const e of errors) console.log(`- ✗ ${e}`);
      console.log('');
    }
    if (warnings.length) {
      console.log(`### Warnings (${warnings.length})`);
      for (const w of warnings) console.log(`- ⚠ ${w}`);
      console.log('');
    }
    if (!errors.length && !warnings.length) console.log('All files valid ✅', '');
  },
});

const planSetStatusCmd = defineCommand({
  meta: { name: 'set-status', description: 'Update plan status' },
  args: {
    slug: { type: 'positional', description: 'Plan slug', required: true },
    status: { type: 'positional', description: 'New status', required: true },
  },
  run({ args }) {
    if (!VALID_STATUSES.includes(args.status)) {
      console.error(`error: invalid status "${args.status}"`);
      return;
    }
    const plan = readAllPlans(PLANS_DIR).find((p) => p.slug === args.slug);
    if (!plan) {
      console.error(`error: plan "${args.slug}" not found`);
      return;
    }
    plan.frontmatter.status = args.status;
    writePlanFileAtomic(plan);
    console.log(`ok: ${args.slug} status → ${args.status}`);
  },
});

const planTaskStatusCmd = defineCommand({
  meta: { name: 'task-status', description: 'Update task status' },
  args: {
    slug: { type: 'positional', description: 'Plan slug', required: true },
    id: { type: 'positional', description: 'Task ID', required: true },
    status: { type: 'positional', description: 'New status', required: true },
  },
  run({ args }) {
    if (!VALID_TASK_STATUSES.includes(args.status)) {
      console.error(`error: invalid task status "${args.status}"`);
      return;
    }
    const plan = readAllPlans(PLANS_DIR).find((p) => p.slug === args.slug);
    if (!plan) {
      console.error(`error: plan "${args.slug}" not found`);
      return;
    }
    if (!plan.frontmatter.tasks) {
      console.error(`error: plan "${args.slug}" has no tasks`);
      return;
    }
    const task = plan.frontmatter.tasks.find((t) => t.id === args.id);
    if (!task) {
      console.error(`error: task "${args.id}" not found in "${args.slug}"`);
      return;
    }
    task.status = args.status;
    writePlanFileAtomic(plan);
    console.log(`ok: ${args.slug}.tasks.${args.id} → ${args.status}`);
  },
});

const planAddTaskCmd = defineCommand({
  meta: { name: 'add-task', description: 'Add a task to a plan' },
  args: {
    slug: { type: 'positional', description: 'Plan slug', required: true },
    id: { type: 'positional', description: 'Task ID', required: true },
    desc: { type: 'positional', description: 'Task description', required: true },
    status: { type: 'positional', description: 'Initial status', required: true },
  },
  run({ args }) {
    if (!VALID_TASK_STATUSES.includes(args.status)) {
      console.error(`error: invalid task status "${args.status}"`);
      return;
    }
    const plan = readAllPlans(PLANS_DIR).find((p) => p.slug === args.slug);
    if (!plan) {
      console.error(`error: plan "${args.slug}" not found`);
      return;
    }
    if (!plan.frontmatter.tasks) plan.frontmatter.tasks = [];
    if (plan.frontmatter.tasks.some((t: { id: string }) => t.id === args.id)) {
      console.error(`error: task "${args.id}" already exists in "${args.slug}"`);
      return;
    }
    plan.frontmatter.tasks.push({ id: args.id, desc: args.desc, status: args.status });
    writePlanFileAtomic(plan);
    console.log(`ok: ${args.slug}.tasks.${args.id} added (${args.status})`);
  },
});

const planAddCmd = defineCommand({
  meta: { name: 'add', description: 'Create a new plan' },
  args: {
    title: { type: 'positional', description: 'Plan title', required: true },
    category: { type: 'string', description: 'Plan category', default: 'other', required: false },
    priority: { type: 'string', description: 'Priority (0-100)', required: false },
    status: { type: 'string', description: 'Initial status', default: 'active', required: false },
    tldr: { type: 'string', description: 'One-line summary', default: 'TODO: add summary', required: false },
    ref: { type: 'string', description: 'Reference (research:<slug>, plan:<slug>, url:<url>)', required: false },
  },
  run({ args }) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const slug = slugify(args.title);
    const filename = `${today}-${slug}.md`;
    const filepath = join(PLANS_DIR, filename);
    if (existsSync(filepath)) {
      console.error(`error: file "${filename}" already exists`);
      return;
    }

    const frontmatter: PlanMeta = {
      title: args.title,
      slug,
      status: args.status,
      category: args.category,
      created: Number.parseInt(today),
      tldr: args.tldr,
      priority: args.priority ? Number.parseInt(args.priority) : undefined,
      tasks: [],
      acceptance: [],
      references: args.ref ? [args.ref] : undefined,
    };
    const body = `# ${args.title}\n\n## Goal\n\nTODO: define goal\n\n## Scope\n\nTODO: define scope`;
    writePlanFileAtomic({ slug, filename, dir: PLANS_DIR, frontmatter, body, raw: '' });
    console.log(`ok: created plan "${slug}" at plans/${filename}`);
  },
});

const planRefsCmd = defineCommand({
  meta: { name: 'references', description: 'Show plan references and backlinks' },
  args: { slug: { type: 'positional', description: 'Plan slug', required: true } },
  run({ args }) {
    const plan = findPlan(PLANS_DIR, ROADMAPS_DIR, args.slug);
    if (!plan) {
      console.error(`error: plan "${args.slug}" not found`);
      return;
    }

    const lines: string[] = [];
    lines.push(`## References for ${args.slug}`, '');

    const refs = collectRefs(plan);
    if (refs.length) {
      lines.push('### Outbound references');
      for (const r of refs) {
        const resolved = resolveRef(r, PLANS_DIR, ROADMAPS_DIR, RESEARCH_DIR);
        lines.push(`- \`${resolved.label}\` (${resolved.type}) — ${resolved.description || resolved.target}`);
      }
      lines.push('');
    } else {
      lines.push('No outbound references.', '');
    }

    const allDocs = [...readAllPlans(PLANS_DIR), ...readAllPlans(ROADMAPS_DIR)];
    const backlinks = allDocs.filter(
      (d) => d.slug !== plan.slug && collectRefs(d).some((r) => r === `plan:${args.slug}`),
    );
    if (backlinks.length) {
      lines.push('### Inbound references (backlinks)');
      for (const b of backlinks) lines.push(`- \`${b.slug}\` — ${b.frontmatter.tldr}`);
      lines.push('');
    } else {
      lines.push('No inbound references.', '');
    }

    console.log(lines.join('\n'));
  },
});

const planCmd = defineCommand({
  meta: { name: 'plan', description: 'Manage plans' },
  subCommands: {
    'set-status': planSetStatusCmd,
    'task-status': planTaskStatusCmd,
    add: planAddCmd,
    'add-task': planAddTaskCmd,
    references: planRefsCmd,
  },
});

const roadmapListCmd = defineCommand({
  meta: { name: 'list', description: 'List all roadmaps' },
  run() {
    const roadmaps = readAllPlans(ROADMAPS_DIR);
    const rows = [
      '| Slug | Status | Period | Prio | Entries | Tldr |',
      '|------|--------|--------|------|---------|------|',
    ];
    for (const r of roadmaps) {
      const f = r.frontmatter;
      rows.push(
        `| ${fmtCell(f.slug, 25)} | ${fmtCell(f.status, 8)} | ${fmtCell(f.period || '—', 6)} | ${fmtPrio(f.priority).padStart(4)} | ${String(f.entries?.length ?? 0).padStart(3)}  | ${fmtCell(f.tldr, 40)} |`,
      );
    }
    console.log(rows.join('\n'));
  },
});

const roadmapShowCmd = defineCommand({
  meta: { name: 'show', description: 'Show roadmap details' },
  args: { slug: { type: 'positional', description: 'Roadmap slug', required: true } },
  run({ args }) {
    const plan = findPlan(PLANS_DIR, ROADMAPS_DIR, args.slug);
    if (!plan) {
      console.error(`error: roadmap "${args.slug}" not found`);
      return;
    }
    const f = plan.frontmatter;
    const lines: string[] = [];
    lines.push(`## ${f.slug} — ${f.title}`);
    lines.push(`**Status:** ${statusBadge(f.status)} · **Priority:** ${fmtPrio(f.priority)}`);
    lines.push('', `**TLDR:** ${f.tldr}`, '');
    if (f.entries?.length) {
      lines.push('### Entries');
      for (const e of f.entries) lines.push(`- **${e.ref}** — ${e.status || ''}${e.note ? ` · ${e.note}` : ''}`);
      lines.push('');
    }
    console.log(lines.join('\n'));
  },
});

const roadmapCmd = defineCommand({
  meta: { name: 'roadmap', description: 'Manage roadmaps' },
  subCommands: {
    list: roadmapListCmd,
    show: roadmapShowCmd,
  },
});

const researchListCmd = defineCommand({
  meta: { name: 'list', description: 'List research files' },
  run() {
    const files = listResearchFiles(RESEARCH_DIR);
    if (!files.length) {
      console.log('No research files found.');
      return;
    }
    const rows = ['| Slug | File |', '|------|------|'];
    for (const f of files) rows.push(`| ${fmtCell(f.slug, 40)} | ${fmtCell(relative(RESEARCH_DIR, f.filepath), 50)} |`);
    console.log(rows.join('\n'));
  },
});

const researchShowCmd = defineCommand({
  meta: { name: 'show', description: 'Show research file' },
  args: { slug: { type: 'positional', description: 'Research file slug or path', required: true } },
  run({ args }) {
    const file = findResearchFile(RESEARCH_DIR, args.slug);
    if (!file) {
      console.error(`error: research file "${args.slug}" not found`);
      return;
    }
    console.log(`## ${file.slug}`);
    console.log(`*File: ${relative(RESEARCH_DIR, file.filepath)}*\n`);
    console.log(file.content);
  },
});

const researchCmd = defineCommand({
  meta: { name: 'research', description: 'Browse research files' },
  subCommands: {
    list: researchListCmd,
    show: researchShowCmd,
  },
});

const graphCmd = defineCommand({
  meta: { name: 'graph', description: 'Show inter-plan dependency graph' },
  args: { slug: { type: 'positional', description: 'Filter to a specific plan', required: false } },
  run({ args }) {
    const allDocs = [...readAllPlans(PLANS_DIR), ...readAllPlans(ROADMAPS_DIR)];
    const lines: string[] = [];

    if (args.slug) {
      const plan = findPlan(PLANS_DIR, ROADMAPS_DIR, args.slug);
      if (!plan) {
        console.error(`error: plan "${args.slug}" not found`);
        return;
      }
      lines.push(`## Dependency graph for ${args.slug}`, '');
      const refs = collectRefs(plan);
      for (const r of refs) {
        const resolved = resolveRef(r, PLANS_DIR, ROADMAPS_DIR, RESEARCH_DIR);
        const arrow = resolved.type === 'plan' || resolved.type === 'research' ? '→' : '↗';
        lines.push(
          `  ${args.slug} ${arrow} ${resolved.label}  ${resolved.description ? `— ${resolved.description}` : ''}`,
        );
      }
      const backlinks = allDocs.filter(
        (d) => d.slug !== plan.slug && collectRefs(d).some((r) => r === `plan:${args.slug}`),
      );
      for (const b of backlinks) lines.push(`  ${b.slug} → ${args.slug}`);
    } else {
      lines.push('## Full dependency graph', '');
      for (const doc of allDocs) {
        const refs = collectRefs(doc);
        if (refs.length)
          for (const r of refs) {
            const resolved = resolveRef(r, PLANS_DIR, ROADMAPS_DIR, RESEARCH_DIR);
            lines.push(`  ${doc.slug} → ${resolved.label}`);
          }
      }
    }

    if (lines.length <= 2) console.log('No graph edges found.');
    else console.log(lines.join('\n'));
  },
});

const setupCmd = defineCommand({
  meta: { name: 'setup', description: 'Scaffold a new personal-context in the current directory' },
  args: {
    dir: { type: 'string', description: 'Target directory', default: '.', required: false },
    remote: { type: 'string', description: 'Git remote URL', required: false },
  },
  async run({ args }) {
    const base = args.dir.startsWith('/') ? args.dir : join(process.cwd(), args.dir);
    const target = join(base, 'personal-context');

    if (existsSync(target)) {
      if (existsSync(join(target, '.git'))) {
        console.error(`error: "${target}" already exists and is a git repo`);
        return;
      }
      const files = readdirSync(target);
      if (files.length > 0) {
        console.error(`error: "${target}" already exists and is not empty`);
        return;
      }
    }

    const dirs = [
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
    ];
    for (const d of dirs) mkdirSync(join(target, d), { recursive: true });

    for (const [filepath, content] of Object.entries(SCAFFOLD_FILES)) {
      writeFileSync(join(target, filepath), content, 'utf-8');
    }

    const pkg = {
      name: 'personal-context',
      private: true,
      type: 'module',
      scripts: { ctx: 'bun run bin/ctx.ts' },
      dependencies: { '@pc-ctx/cli': '^0.1.0' },
    };
    writeFileSync(join(target, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');

    const proxyBin = `#!/usr/bin/env node\nimport('@pc-ctx/cli').catch(() => {\n  console.error('Install @pc-ctx/cli first: pnpm add @pc-ctx/cli');\n  process.exit(1);\n});\n`;
    writeFileSync(join(target, 'bin', 'ctx.ts'), proxyBin, 'utf-8');
    console.log(`\nDone! Context created at ${target}`);
    console.log('\nNext steps:');
    console.log(`  cd ${target}`);
    console.log('  bun i && bun run ctx status');
    if (args.remote)
      console.log(
        `  git init && git add -A && git commit -m "initial: scaffold" && git remote add origin ${args.remote} && git push -u origin main`,
      );
  },
});

const syncCmd = defineCommand({
  meta: { name: 'sync', description: 'Sync plans to/from GitHub remote' },
  args: {
    push: { type: 'boolean', description: 'Push only', default: false, required: false },
    pull: { type: 'boolean', description: 'Pull only', default: false, required: false },
  },
  run({ args }) {
    const repo = ROOT;
    if (!args.push) {
      console.log('Pulling from remote...');
      const pull = spawnSync('git', ['pull'], { cwd: repo, stdio: 'inherit' });
      if (pull.status !== 0) {
        console.error('error: pull failed');
        return;
      }
    }
    if (!args.pull) {
      console.log('Pushing to remote...');
      const push = spawnSync('git', ['push'], { cwd: repo, stdio: 'inherit' });
      if (push.status !== 0) {
        console.error('error: push failed');
        return;
      }
    }
    console.log('Done ✅');
  },
});

const UI_CACHE = join(homedir(), '.pc-ctx', 'web-ui');
const UI_VERSION_FILE = join(UI_CACHE, '.version');

async function fetchLatestTarball(repo: string) {
  const api = `https://api.github.com/repos/${repo}/releases/latest`;
  const res = await fetch(api, {
    headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'pc-ctx' },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const release = (await res.json()) as { tag_name: string; assets: { name: string; browser_download_url: string }[] };
  const asset = release.assets.find((a: { name: string }) => a.name === 'web-ui.tar.gz');
  if (!asset) throw new Error('No web-ui.tar.gz found in latest release');
  return { tag: release.tag_name, url: asset.browser_download_url };
}

async function downloadWithProgress(url: string, dest: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const total = Number.parseInt(res.headers.get('content-length') || '0');
  const writer = createWriteStream(dest);
  let received = 0;

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const pump = async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      const pct = total ? Math.round((received / total) * 100) : 0;
      process.stdout.write(`\r  Downloading... ${pct}% (${(received / 1024 / 1024).toFixed(1)}MB)`);
      writer.write(value);
    }
    writer.end();
    process.stdout.write('\n');
  };
  await pump();
}

function extractTarball(tarball: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  execSync(`tar xzf "${tarball}" -C "${dest}"`, { stdio: 'inherit' });
}

function getCachedVersion(): string | null {
  try {
    return readFileSync(UI_VERSION_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

function writeVersion(v: string) {
  mkdirSync(dirname(UI_VERSION_FILE), { recursive: true });
  writeFileSync(UI_VERSION_FILE, v, 'utf-8');
}

const uiCmd = defineCommand({
  meta: { name: 'ui', description: 'Download, cache, and serve the web UI locally' },
  args: {
    serve: {
      type: 'boolean',
      description: 'Serve cached UI (downloads first if missing)',
      default: false,
      required: false,
    },
    update: { type: 'boolean', description: 'Force re-download', default: false, required: false },
    port: { type: 'string', description: 'Local server port', default: '3333', required: false },
    repo: { type: 'string', description: 'GitHub repo (owner/name)', default: 'samir1498/pc-ctx-web', required: false },
  },
  async run({ args }) {
    const repo = args.repo || 'samir1498/pc-ctx-web';

    if (args.update || !getCachedVersion()) {
      console.log(` Fetching latest release from ${repo}...`);
      const { tag, url } = await fetchLatestTarball(repo);
      console.log(` Latest: ${tag}`);
      const tmp = join(homedir(), '.pc-ctx', 'web-ui.tar.gz');
      mkdirSync(dirname(tmp), { recursive: true });

      await downloadWithProgress(url, tmp);
      extractTarball(tmp, UI_CACHE);
      writeVersion(tag);
      try {
        execSync(`rm "${tmp}"`);
      } catch {
        /* ok */
      }
      console.log(` Extracted to ${UI_CACHE}`);
    } else {
      const cached = getCachedVersion();
      console.log(` Using cached version: ${cached}`);
    }

    if (args.serve) {
      const { startUiServer } = await import('./ui-server.js');
      let pat = '';
      try {
        const cfg = JSON.parse(readFileSync(join(homedir(), '.pc-ctx', 'config.json'), 'utf-8'));
        pat = cfg.pat || '';
      } catch {
        /* ok */
      }
      startUiServer(Number.parseInt(args.port), UI_CACHE, pat);
      await new Promise(() => {}); // keep alive
    }
  },
});

const configCmd = defineCommand({
  meta: { name: 'config', description: 'Set GitHub PAT for local web UI' },
  args: {
    pat: { type: 'string', description: 'GitHub Personal Access Token', required: false },
    show: { type: 'boolean', description: 'Show current config', default: false, required: false },
  },
  run({ args }) {
    const configPath = join(homedir(), '.pc-ctx', 'config.json');
    if (args.show) {
      try {
        const cfg = JSON.parse(readFileSync(configPath, 'utf-8'));
        console.log('PAT:', cfg.pat ? '(set)' : '(not set)');
      } catch {
        console.log('PAT: (not set)');
      }
      return;
    }
    if (!args.pat) {
      console.error('Usage: ctx config --pat <token>');
      return;
    }
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, `${JSON.stringify({ pat: args.pat }, null, 2)}\n`, { mode: 0o600 });
    console.log('PAT saved');
  },
});

function makeDomainCmd(name: string, description: string, dir: string) {
  const listCmd = defineCommand({
    meta: { name: 'list', description: `List all ${name}` },
    run() {
      const items = readAllPlans(dir);
      if (!items.length) {
        console.log(`No ${name} found.`);
        return;
      }
      const rows = ['| Slug | Title |', '|------|-------|'];
      for (const p of items) rows.push(`| ${fmtCell(p.slug, 40)} | ${fmtCell(p.frontmatter.title || '—', 60)} |`);
      console.log(rows.join('\n'));
    },
  });

  const showCmd = defineCommand({
    meta: { name: 'show', description: `Show ${name} details` },
    args: { slug: { type: 'positional', description: `${name} slug`, required: true } },
    run({ args }) {
      const item = readAllPlans(dir).find((p) => p.slug === args.slug);
      if (!item) {
        console.error(`error: "${args.slug}" not found`);
        return;
      }
      console.log(`## ${item.frontmatter.title || item.slug}`);
      console.log(`**Slug:** ${item.slug}`);
      if (item.body) console.log('', item.body);
    },
  });

  const addCmd = defineCommand({
    meta: { name: 'add', description: `Create a new ${name}` },
    args: {
      title: { type: 'positional', description: 'Title', required: true },
      slug: { type: 'string', description: 'Slug (defaults from title)', required: false },
      category: { type: 'string', description: `Category (default: ${name})`, required: false },
      tldr: { type: 'string', description: 'One-line summary (default: title)', required: false },
    },
    run({ args }) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const slug = args.slug || slugify(args.title);
      const filename = `${today}-${slug}.md`;
      const filepath = join(dir, filename);
      if (existsSync(filepath)) {
        console.error(`error: "${filename}" already exists`);
        return;
      }
      // Every domain follows the same standardized required-field schema (REQUIRED_DOC_FIELDS).
      const frontmatter = {
        title: args.title,
        slug,
        status: 'active',
        category: args.category || name,
        created: Number.parseInt(today),
        tldr: args.tldr || args.title,
      } as unknown as PlanMeta;
      writePlanFileAtomic({ slug, filename, dir, frontmatter, body: `# ${args.title}\n`, raw: '' });
      console.log(`ok: created ${filename}`);
    },
  });

  return defineCommand({
    meta: { name, description },
    subCommands: { list: listCmd, show: showCmd, add: addCmd },
  });
}

const ideasCmd = makeDomainCmd('ideas', 'Manage ideas', IDEAS_DIR);
const processesCmd = makeDomainCmd('processes', 'Manage process docs', PROCESSES_DIR);
const progressCmd = makeDomainCmd('progress', 'Manage progress logs', PROGRESS_DIR);
const referencesCmd = makeDomainCmd('references', 'Manage reference docs', REFERENCES_DIR);
const archiveCmd = makeDomainCmd('archive', 'Manage archived items', ARCHIVE_DIR);
const handoffsCmd = makeDomainCmd('handoffs', 'Manage session handoffs', HANDOFFS_DIR);

const roadmapAddCmd = defineCommand({
  meta: { name: 'add', description: 'Create a new roadmap' },
  args: {
    title: { type: 'positional', description: 'Roadmap title', required: true },
    period: { type: 'string', description: 'Period (e.g. 2026-H2)', required: false },
    priority: { type: 'string', description: 'Priority 0-100', required: false },
    tldr: { type: 'string', description: 'Summary', default: 'TODO', required: false },
  },
  run({ args }) {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const slug = slugify(args.title);
    const filename = `${today}-${slug}.md`;
    const filepath = join(ROADMAPS_DIR, filename);
    if (existsSync(filepath)) {
      console.error(`error: "${filename}" already exists`);
      return;
    }
    const frontmatter = {
      title: args.title,
      slug,
      status: 'active',
      period: args.period,
      tldr: args.tldr,
      priority: args.priority ? Number.parseInt(args.priority) : undefined,
      entries: [],
    } as unknown as PlanMeta;
    writePlanFileAtomic({ slug, filename, dir: ROADMAPS_DIR, frontmatter, body: `# ${args.title}\n`, raw: '' });
    console.log(`ok: created roadmap "${slug}"`);
  },
});

roadmapCmd.subCommands = { ...roadmapCmd.subCommands, add: roadmapAddCmd };

const mainCmd = defineCommand({
  meta: { name: 'ctx', description: 'personal-context CLI — plan, roadmap, and research management' },
  subCommands: {
    list: listCmd,
    show: showCmd,
    status: statusCmd,
    validate: validateCmd,
    plan: planCmd,
    roadmap: roadmapCmd,
    research: researchCmd,
    ideas: ideasCmd,
    processes: processesCmd,
    progress: progressCmd,
    references: referencesCmd,
    archive: archiveCmd,
    handoffs: handoffsCmd,
    graph: graphCmd,
    setup: setupCmd,
    sync: syncCmd,
    ui: uiCmd,
    config: configCmd,
  },
});

const main = createMain(mainCmd);
main();
