# MCP Integration

The MCP server exposes tools for AI agents. Add to your `opencode.json`:

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

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PC_CTX_ROOT` | Yes | Path to your context root (e.g. `personal-context/`) |
| `PC_CTX_RESEARCH_DIR` | No | Path to research directory (defaults to `../personal-research`) |

## Tools

### Plan tools

| Tool | Description |
|------|-------------|
| `plan_list` | List plans (optional `status` filter) |
| `plan_show` | Show plan details |
| `plan_status` | Overview of all plans grouped by status |
| `plan_validate` | Validate all files across domains |
| `plan_set_status` | Update plan status |
| `plan_task_status` | Update task status |
| `plan_add` | Create a new plan |
| `plan_add_task` | Add a task to a plan |
| `plan_references` | Show references and backlinks |
| `graph` | Show inter-plan dependency graph |

### Roadmap tools

| Tool | Description |
|------|-------------|
| `roadmap_list` | List all roadmaps |
| `roadmap_show` | Show roadmap details |
| `roadmap_add` | Add a new roadmap entry |

### Research tools

| Tool | Description |
|------|-------------|
| `research_list` | List all research files |
| `research_show` | Show research file content |

### Domain tools (ideas, processes, progress, references, archive)

| Tool | Description |
|------|-------------|
| `<domain>_list` | List files in domain |
| `<domain>_show` | Show file content |

### System tools

| Tool | Description |
|------|-------------|
| `sync` | Git pull + push |
| `setup` | Scaffold a new context system |
