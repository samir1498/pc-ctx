# @pc-ctx/cli

CLI for managing markdown-based plans with YAML frontmatter.

```bash
npx @pc-ctx/cli status
```

## Commands

| Command | Description |
|---------|-------------|
| `ctx status` | Grouped overview (active / paused / done) |
| `ctx list` | Table of all plans (`--status`, `--category`, `--sort priority`) |
| `ctx show <slug>` | Full plan details with tasks, acceptance, backlinks |
| `ctx validate` | Check all plans for errors |
| `ctx stale` | Detect stale/idle plans and outdated focus |
| `ctx reconcile [--apply] [--commits N]` | Match git `ctx:` trailers against plans/roadmaps. Supports `start`, `progress`, `close`, `repo:` actions (default dry-run) |
| `ctx graph [slug]` | Inter-plan dependency graph |
| `ctx setup [dir]` / `ctx init [dir]` | Scaffold a new context directory |
| `ctx sync` | Git pull + push plans |
| `ctx ui [--serve] [--port]` | Download, cache, and serve web UI locally |
| `ctx config --show` / `--pat` / `--repo` / `--root` | Configure PAT, content repo, local root |

### Plan management (`ctx plan <subcommand>`)

| Subcommand | Description |
|------------|-------------|
| `add <title>` | Create a new plan (`--body`/`--body-file` for custom body) |
| `add-task <slug> <id> <desc>` | Add a task to a plan |
| `add-acceptance <slug> <desc>` | Add acceptance criteria |
| `add-ref <slug> <ref>` | Add a reference to a plan |
| `remove-task <slug> <id>` | Remove a task |
| `set-status <slug> <status>` | Change plan status |
| `activate <slug>` | Alias for `set-status active` |
| `pause <slug>` | Alias for `set-status paused` |
| `task-status <slug> <id> <status>` | Update task status |
| `references <slug>` | Show refs + backlinks |
| `archive <slug>` | Move a plan to the archive |

### Roadmap management (`ctx roadmap <subcommand>`)

| Subcommand | Description |
|------------|-------------|
| `list` | List all roadmaps |
| `show <slug>` | Roadmap details |
| `add <title>` | Create a new roadmap (`--body`/`--body-file`) |

### Research (`ctx research <subcommand>`)

| Subcommand | Description |
|------------|-------------|
| `list` | List all research files |
| `show <slug>` | Show research file content |

### Progress (`ctx progress <subcommand>`)

| Subcommand | Description |
|------------|-------------|
| `log <text>` | Append timestamped entry to daily.md |
| `read <file>` | Read daily.md or now.md |
| `archive <file>` | Archive large progress files |

### Domain management (`ctx <domain> <subcommand>`)

Domains: `ideas`, `processes`, `references`, `archive`, `handoffs`, `repos`

| Subcommand | Description |
|------------|-------------|
| `list` | List all items |
| `show <slug>` | Show item details |
| `add <title>` | Create a new item (`--body`/`--body-file`) |

`repos` is the exception: instead of a flat `<date>-<slug>.md` file, `repos add` writes
`repos/<slug>/repo.md` (folder-per-repo, no date prefix), leaving room for future companion
files (e.g. `map.md`) under the same folder. `repos` also has one extra subcommand:

| Subcommand | Description |
|------------|-------------|
| `sync` | For every `repos/<slug>/repo.md` with a `path` field: validate the path exists, detect its git `remote` and current `branch`, and write them back into frontmatter |

## Configuration

| Env var | Default |
|---------|---------|
| `PC_CTX_ROOT` | CWD (directory containing `plans/`, `roadmaps/`, etc.) |
| `PC_CTX_RESEARCH_DIR` | `../personal-research` relative to root |
