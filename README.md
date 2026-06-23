# pc-ctx

Deterministic plan management for AI agent context systems. CLI + MCP server for creating, tracking, and syncing markdown-based plans with YAML frontmatter.

## Setup

```bash
# Install
npm install -g @pc-ctx/cli
# or
pnpm add -g @pc-ctx/cli

# Create a new context system
ctx setup ./my-project

# Quick overview
ctx status
```

## CLI

```bash
ctx status                    # overview
ctx list                      # all plans
ctx list --status active      # active only
ctx show <slug>               # plan details
ctx validate                  # validate all files

# Mutate
ctx plan add "My Plan" --priority 50
ctx plan set-status <slug> done
ctx plan task-status <slug> T1 in-progress
ctx plan add-task <slug> T2 "Description" pending
ctx plan references <slug>    # refs + backlinks

# Roadmaps & research
ctx roadmap list
ctx roadmap show <slug>
ctx research list
ctx research show <slug>

# Graph & sync
ctx graph                     # dependency graph
ctx graph <slug>              # graph for one plan
ctx sync                      # git pull + push
```

## MCP (AI agents)

The MCP server exposes 16 tools for AI agents. Add to your `opencode.json`:

```json
{
  "mcp": {
    "pc-ctx": {
      "type": "local",
      "command": ["pnpx", "@pc-ctx/mcp"],
      "environment": {
        "PC_CTX_ROOT": "/path/to/personal-context",
        "PC_CTX_RESEARCH_DIR": "/path/to/personal-research"
      },
      "timeout": 15000
    }
  }
}
```

Available tools: `plan_list`, `plan_show`, `plan_status`, `plan_validate`, `plan_set_status`, `plan_task_status`, `plan_add`, `plan_add_task`, `plan_references`, `roadmap_list`, `roadmap_show`, `research_list`, `research_show`, `graph`, `sync`, `setup`.

## Plan format

```markdown
---
title: My Plan
slug: my-plan
status: active                # active | paused | done | cancelled
category: feature
created: 20260621
tldr: One-line summary.
priority: 50
tasks:
  - id: T1
    desc: Do the thing
    status: pending           # pending | in-progress | done | blocked
references:
  - research:some-research
  - plan:related-plan
---
```

## Packages

| Package | Description |
|---------|-------------|
| `@pc-ctx/core` | Types, YAML I/O, plan CRUD |
| `@pc-ctx/cli` | `ctx` binary |
| `@pc-ctx/mcp` | MCP server (16 tools) |

## Development

```bash
git clone https://github.com/samir1498/pc-ctx
cd pc-ctx && pnpm install && pnpm build
pnpm check   # lint → knip → typecheck → depcruise → test → build
```

## License

MIT
