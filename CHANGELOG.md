# Changelog

## @pc-ctx/cli 0.2.1 / @pc-ctx/mcp 0.3.1 — 2026-06-24

### Fixed

- `plan add` / `roadmap add` / domain `add` (ideas, processes, progress, references, archive, handoffs) and the MCP `plan_add` / `*_add` tools could not set a document body — they hardcoded the `## Goal TODO / ## Scope TODO` (or `# Title`) stub, so every new doc needed a follow-up edit. The MCP tools also silently dropped an unknown `body` argument. Now all surfaces accept an optional body, written verbatim, and fall back to the stub when omitted. CLI: `--body` and `--body-file` (the latter overrides). MCP: a `body` string param.

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
