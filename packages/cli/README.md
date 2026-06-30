# @pc-ctx/cli

CLI for managing markdown-based plans with YAML frontmatter.

```bash
npx @pc-ctx/cli status
```

## Commands

| Command | Description |
|---------|-------------|
| `ctx status` | Grouped overview (active / paused / done) |
| `ctx list` | Table of all plans |
| `ctx list --status active --category feature --sort priority` | Filtered + sorted |
| `ctx show <slug>` | Full plan details with tasks, acceptance, backlinks |
| `ctx validate` | Check all plans for errors |
| `ctx plan add <title>` | Create a new plan (`--body`/`--body-file` for custom body) |
| `ctx plan set-status <slug> <status>` | Change plan status |
| `ctx plan task-status <slug> <id> <status>` | Update task status |
| `ctx plan add-task <slug> <id> <desc> <status>` | Add a task |
| `ctx plan references <slug>` | Show refs + backlinks |
| `ctx roadmap list / show <slug>` | Roadmap management |
| `ctx roadmap add <title>` | Create a new roadmap (`--body`/`--body-file` for custom body) |
| `ctx ideas / processes / progress / references / archive / handoffs add <title>` | Create domain docs (`--body`/`--body-file`) |
| `ctx research list / show <slug>` | Research file browsing |
| `ctx graph [slug]` | Inter-plan dependency graph |
| `ctx stale` | Detect stale/idle plans and outdated focus |
| `ctx reconcile [--apply] [--commits N]` | Match git trailera against plans and roadmaps (default dry-run) |
| `ctx setup [dir]` | Scaffold a new context directory |
| `ctx sync` | Git pull + push plans |

## Configuration

Set `PC_CTX_ROOT` to the directory containing `plans/`, `roadmaps/`, etc. (defaults to CWD).
Set `PC_CTX_RESEARCH_DIR` for research files (defaults to `../personal-research` relative to root).
