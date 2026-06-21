# pc-ctx

Deterministic plan management for your personal context system. CLI + MCP server for creating, tracking, and syncing markdown-based plans with YAML frontmatter.

## Packages

| Package | Description |
|---------|-------------|
| `@pc-ctx/core` | Types, YAML parse/serialize, plan CRUD, formatting helpers |
| `@pc-ctx/cli` | `ctx` CLI — list, show, status, validate, plan/*, roadmap/*, research/*, graph, setup, sync |
| `@pc-ctx/mcp` | MCP server — exposes plans as tools for AI agents (plan_list, plan_show, plan_status, plan_validate) |

## Quickstart

```bash
# Create a new context
npx @pc-ctx/cli setup ./my-project

# Or use an existing one
cd my-project/personal-context
npx ctx status
```

### CLI

```bash
ctx status                    # Grouped overview of all plans
ctx list                      # Table of all plans
ctx list --status active      # Filter by status
ctx list --category feature   # Filter by category
ctx list --sort priority      # Sort by priority

ctx show <slug>               # Full plan details
ctx validate                  # Validate all plan files

ctx plan add "My Plan" --priority 50 --category feature
ctx plan set-status <slug> done
ctx plan task-status <slug> T1 in-progress
ctx plan add-task <slug> T2 "Description" pending
ctx plan references <slug>    # Show references and backlinks

ctx roadmap list              # List roadmaps
ctx roadmap show <slug>       # Show roadmap details

ctx research list             # List research files
ctx research show <slug>      # Show research file

ctx graph                     # Full dependency graph
ctx graph <slug>              # Graph for a single plan

ctx sync                      # Pull then push to git remote
ctx setup ./dir               # Scaffold a new context
```

### MCP

Run the MCP server for AI agent integration:

```bash
npx @pc-ctx/mcp --plans-dir ./personal-context/plans
```

Available tools: `plan_list`, `plan_show`, `plan_status`, `plan_validate`.

## Plan Format

Plans are markdown files with YAML frontmatter in `plans/`:

```markdown
---
title: My Plan
slug: my-plan
status: active
category: feature
created: 20260621
tldr: One-line summary.
priority: 50
tasks:
  - id: T1
    title: Do the thing
    status: pending
acceptance:
  - All tests pass
references:
  - plan:related-plan
  - research:some-research
---

# My Plan

Description and notes.
```

## Configuration

Set `PC_CTX_ROOT` to point to your context directory (defaults to CWD):

```bash
export PC_CTX_ROOT=/path/to/personal-context
npx ctx status
```

## Development

```bash
git clone https://github.com/samir1498/pc-ctx
cd pc-ctx
pnpm install
pnpm build

# Run all checks
pnpm check

# Generate dependency graph
pnpm depcruise:graph
open graph.png
```

### Scripts

| Script | What |
|--------|------|
| `pnpm check` | lint → knip → typecheck → depcruise → test → build |
| `pnpm test:unit` | Unit tests (`*.unit.spec.ts`) |
| `pnpm test:it` | Integration tests (`*.it.spec.ts`) |
| `pnpm depcruise` | Circular + boundary check |
| `pnpm depcruise:graph` | Generate PNG dependency graph |
| `pnpm lint` | Biome check |
| `pnpm knip` | Dead code detection |
| `pnpm tag` | Semver bump + git tag |

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ @pc-ctx/cli  │     │ @pc-ctx/mcp  │     │  consumer     │
│ (ctx binary) │     │ (MCP server) │     │ (your tool)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └──────────┬─────────┘────────────────────┘
                  │
          ┌───────┴────────┐
          │ @pc-ctx/core    │
          │ types, YAML I/O,│
          │ format, validate│
          └────────────────┘
```

Boundary rules: `core` never imports cli or mcp. CLI and MCP are independent consumers of core.

## License

MIT
