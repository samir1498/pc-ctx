# Changelog

## 0.1.0 — 2026-06-21

Initial release.

### Features

- **@pc-ctx/core**: Plan types, YAML parse/serialize, plan CRUD, formatting helpers, research file scan, reference resolution, scaffold templates, slugify
- **@pc-ctx/cli**: 10 commands — `list`, `show`, `status`, `validate`, `plan` (set-status, task-status, add, add-task, references), `roadmap` (list, show), `research` (list, show), `graph`, `setup`, `sync`
- **@pc-ctx/mcp**: Stdio MCP server with 4 tools — `plan_list`, `plan_show`, `plan_status`, `plan_validate`
- **Generic**: Zero codebase-specific assumptions. `PC_CTX_ROOT` env var for context directory. No agent or opencode integration in pc-ctx itself.

### Tooling

- Biome (lint + format), Knip (dead code), dependency-cruiser (circular + boundaries), Vitest (unit + integration), Fallow, Graphviz graph
- GitHub Actions CI pipeline
- 24 tests (12 unit, 12 integration)
