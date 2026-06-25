# @pc-ctx/mcp

MCP server exposing pc-ctx plans as AI agent tools.

## Tools

| Tool | What it does |
|------|-------------|
| `plan_list` | List all plans with optional status/category filters |
| `plan_show` | Full plan details by slug |
| `plan_status` | Grouped active/paused/done overview |
| `plan_validate` | Validate all plan files |
| `plan_add` | Create a new plan (optional `body` param for markdown body) |
| `plan_add_task` | Add a task to a plan |
| `plan_set_status` | Update plan status |
| `plan_task_status` | Update task status |
| `plan_references` | Show references + backlinks |
| `*_add` (ideas, processes, progress, references, archive, handoffs) | Create domain doc (optional `body` param) |

## Usage

```ts
import { createMcpServer } from '@pc-ctx/mcp';

const server = await createMcpServer({
  plansDir: './personal-context/plans',
});
// StdioServerTransport is connected automatically
```

### With Claude Desktop

Add to your `claude_desktop_config.json`:

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
