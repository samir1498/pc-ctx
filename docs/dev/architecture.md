# Architecture

## Monorepo structure

```
pc-ctx/
├── packages/
│   ├── core/         # Types, YAML I/O, plan CRUD (library)
│   ├── cli/          # ctx binary (cac + citty CLI framework)
│   └── mcp/          # MCP server (16+ tools)
├── config/           # shared configuration
├── docs/             # documentation
├── CHANGELOG.md
├── LICENSE
├── CONTRIBUTING.md
└── biome.json        # lint + format
```

## Design decisions

### Deterministic YAML
All state lives in git-tracked markdown files with YAML frontmatter. No database. This makes context inspectable, diffable, and mergeable — critical for AI agent systems where every state change should be auditable.

### Generic CRUD across domains
Every domain (plans, roadmaps, ideas, processes, etc.) follows the same pattern: list files in a directory, parse frontmatter, serve content. This is implemented once in `@pc-ctx/core` and reused by both CLI and MCP.

### Git-synced
`ctx sync` is a thin wrapper around `git pull --rebase && git push`. No conflict resolution logic — git handles it. The assumption is single-user or small-team usage where conflicts are rare.

### CLI-first, MCP-second
CLI was built first because it works everywhere. MCP came later as an optimization for AI agent tool calls (saves tokens by passing structured data).

### Web UI distribution
The SPA lives in a separate repo (`pc-ctx-web`) and is distributed via GitHub Releases. `ctx ui` downloads the latest tarball and either caches it or serves it via a local Hono server with an API proxy for GitHub content.

## Packages

| Package | Role | Depends on |
|---------|------|------------|
| `@pc-ctx/core` | Types, parsing, validation | `yaml`, `zod` |
| `@pc-ctx/cli` | CLI binary | `@pc-ctx/core`, `citty`, `hono`, `consola` |
| `@pc-ctx/mcp` | MCP server | `@pc-ctx/core` |
