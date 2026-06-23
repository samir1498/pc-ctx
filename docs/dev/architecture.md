# Architecture

## Monorepo structure

```
pc-ctx/
├── packages/
│   ├── core/         # Types, YAML I/O, plan CRUD + validation (library)
│   ├── cli/          # ctx binary (citty CLI framework)
│   └── mcp/          # MCP server (domain + plan/roadmap/research tools)
├── config/           # shared configuration
├── docs/             # documentation
├── CHANGELOG.md
├── LICENSE
├── CONTRIBUTING.md
└── biome.json        # lint + format
```

## Design decisions

### Deterministic YAML
All state lives in git-tracked markdown files with YAML frontmatter. No database. This makes context inspectable, diffable, and mergeable, which is critical for AI agent systems where every state change should be auditable.

### Generic CRUD across domains
Every domain (plans, roadmaps, ideas, processes, progress, references, archive, handoffs) follows the same pattern: list files in a directory, parse frontmatter, serve content. This is implemented once in `@pc-ctx/core` and reused by both CLI and MCP. All domains share one standardized frontmatter schema, validated by `validateDomains` in core (see [plan format](../user/plan-format.md)).

### Git-synced
`ctx sync` is a thin wrapper around `git pull --rebase && git push`. No conflict resolution logic — git handles it. The assumption is single-user or small-team usage where conflicts are rare.

### CLI-first, MCP-second
CLI was built first because it works everywhere. MCP came later as an optimization for AI agent tool calls (saves tokens by passing structured data).

### Web UI distribution
The SPA lives in a separate repo (`pc-ctx-web`) and is distributed via GitHub Releases. `ctx ui` downloads the latest tarball and either caches it or serves it via a local Hono server (bound to `127.0.0.1`) with an API proxy for GitHub content. See the security note in [getting started](../user/getting-started.md) before exposing that proxy.

## Packages

| Package | Role | Depends on |
|---------|------|------------|
| `@pc-ctx/core` | Types, parsing, validation | `js-yaml` |
| `@pc-ctx/cli` | CLI binary | `@pc-ctx/core`, `citty`, `hono`, `@hono/node-server`, `js-yaml` |
| `@pc-ctx/mcp` | MCP server | `@pc-ctx/core`, `@modelcontextprotocol/sdk`, `zod` |
