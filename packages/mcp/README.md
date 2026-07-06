# @pc-ctx/mcp

MCP server exposing pc-ctx plans as AI agent tools.

```bash
npx @pc-ctx/mcp
```

## Tools

### Plan domain

| Tool | Description |
|------|-------------|
| `plan_list` | List all plans with optional status/category filters |
| `plan_show` | Full plan details by slug |
| `plan_status` | Grouped active/paused/done overview |
| `plan_validate` | Validate all plan files |
| `plan_stale` | Detect stale/idle plans and outdated focus |
| `plan_reconcile` | Match git `ctx:` trailers against plans. Supports `start`, `progress`, `close`, `repo:` actions. Default dry-run; set `apply:true` to modify files |
| `plan_add` | Create a new plan |
| `plan_add_task` | Add a task to a plan |
| `plan_add_acceptance` | Add acceptance criteria to a plan |
| `plan_add_ref` | Add a reference to a plan |
| `plan_remove_task` | Remove a task from a plan |
| `plan_set_status` | Update plan status (active/paused/done/cancelled) |
| `plan_task_status` | Update task status |
| `plan_archive` | Move a plan to the archive |
| `plan_references` | Show references + backlinks |

### Roadmap domain

| Tool | Description |
|------|-------------|
| `roadmap_list` | List all roadmaps |
| `roadmap_show` | Show roadmap details by slug |
| `roadmap_add_entry` | Add an entry to a roadmap |
| `roadmap_set_entry_status` | Set the status of a roadmap entry |

### Research domain

| Tool | Description |
|------|-------------|
| `research_list` | List all research files |
| `research_show` | Show research file content by slug |

### Archive domain

| Tool | Description |
|------|-------------|
| `archive_list` | List all archived items (supports date range filtering) |
| `archive_show` | Show an archived item by slug |
| `archive_add` | Create a new archived item |

### Generic domains

Each domain below gets `_list`, `_show`, and `_add` tools.

- **ideas** — `ideas_list`, `ideas_show`, `ideas_add`
- **processes** — `processes_list`, `processes_show`, `processes_add`
- **references** — `references_list`, `references_show`, `references_add`
- **handoffs** — `handoffs_list`, `handoffs_show`, `handoffs_add`
- **repos** — `repos_list`, `repos_show`, `repos_add`. Unlike the flat domains above, `repos`
  uses a **folder layout**: `repos_add` writes `repos/<slug>/repo.md` (no date prefix), not a
  flat `repos/<date>-<slug>.md`. This leaves room for companion files under the same folder in
  future (e.g. a `map.md`). `repos_show`/`repos_list` work the same either way since they read
  recursively. A repo entry's frontmatter may carry a `path` (absolute path to the repo on disk)
  plus `remote`/`branch`, which the CLI's `ctx repos sync` command detects and fills in — there
  is no MCP equivalent of `sync` yet, edit `path` by hand or via `repos_add`'s `body`.

### Utility

| Tool | Description |
|------|-------------|
| `progress_log` | Append a timestamped entry to the daily progress log |
| `progress_read` | Read a progress file (now.md or daily.md) |
| `graph` | Show inter-plan dependency graph |
| `sync` | Sync plans to/from Git remote |
| `setup` | Scaffold a context directory structure |

## Usage

```ts
import { createMcpServer } from '@pc-ctx/mcp';

const server = await createMcpServer({
  plansDir: './personal-context/plans',
});
```

### With Claude Desktop

```json
{
  "mcpServers": {
    "pc-ctx": {
      "command": "npx",
      "args": ["@pc-ctx/mcp"],
      "env": {
        "PC_CTX_ROOT": "/path/to/personal-context"
      }
    }
  }
}
```

## Configuration

| Option | Env var | Default |
|--------|---------|---------|
| Plans directory | `PC_CTX_ROOT` + `/plans` | `./plans` |
| Roadmaps directory | `PC_CTX_ROOT` + `/roadmaps` | `./roadmaps` |
| Research directory | `PC_CTX_RESEARCH_DIR` | `../personal-research` |
