# Changelog

## @pc-ctx/core 0.5.0 / @pc-ctx/cli 0.5.0 / @pc-ctx/mcp 0.5.0 — 2026-06-30

### Added

- **`ctx setup` bootstrap UX overhaul** (+ `ctx init` alias):
  - Configurable context name via `--name` (no more hardcoded `personal-context`).
  - **Idempotent**: re-running tops up any missing dirs/files instead of erroring, and prints what was added vs already present.
  - **Auto git init + scaffold commit** after creation (never auto-pushes; `--no-git` to skip).
  - **Remote guidance**: with `--remote` prints the `git remote add`/`push` line; otherwise detects `gh` and suggests `gh repo create --private`, or falls back to generic instructions (GitHub/GitLab/Gitea/self-hosted).
  - Shared scaffolding extracted to `scaffoldContext()` in `@pc-ctx/core`.
- **MCP `setup` tool**: now idempotent (tops up via the shared core scaffold) and returns the added/existing diff. Accepts an optional `name`. git init + remote setup are CLI-only (the MCP can't run git) — the tool points users at `ctx setup` / `npx @pc-ctx/cli setup`.

## @pc-ctx/core 0.4.1 / @pc-ctx/cli 0.4.1 / @pc-ctx/mcp 0.4.1 — 2026-06-30

### Added

- **`ctx reconcile` — roadmap support**: `ctx:` trailers can now reference roadmap slugs. When a slug isn't a plan, `gitReconcile()` falls back to searching `roadmaps/` directory. Apply actions: `close` sets roadmap + all entries to `done`, `start` sets roadmap to `active`, `progress` sets started date.

### Changed

- **`GitCommitRef`** now includes a `type` field (`'plan' | 'roadmap'`) so the display can distinguish plan vs roadmap matches.
- **Unmatched reason** updated: `"plan not found"` → `"plan or roadmap not found"`.

## @pc-ctx/core 0.4.0 / @pc-ctx/cli 0.4.0 / @pc-ctx/mcp 0.4.0 — 2026-06-30

### Added

- **`ctx progress read <file>`** — new CLI subcommand that reads a progress file (now.md or daily.md) and displays its frontmatter + body.
- **`progress_read` MCP tool** — read progress files programmatically.
- **`ctx stale`** — new CLI subcommand that detects stale plans (all tasks done but status active), idle plans (>14d untouched), and outdated focus (now.md not updated today). Heuristics:
  - *Heuristic 1*: Active plans where all tasks are `done` — suggests closing the plan
  - *Heuristic 2*: Active plans with mtime >14 days ago — suggests review
  - *Heuristic 3*: now.md `updated` field doesn't match today — suggests focus refresh
- **`plan_stale` MCP tool** — identical detection callable by agents; returns JSON list of stale entries.
- **`ctx reconcile [--apply] [--commits N]`** — new CLI subcommand that scans Git log for `ctx:` trailers in commit bodies, cross-references against plan files, and reports matched/unmatched refs. Default is dry-run; `--apply` updates plan frontmatter (task status, completion dates, plan status). Parses `ctx: <slug>[/<task>] <action>` format where action is `start`, `progress`, or `close`.
- **`plan_reconcile` MCP tool** — identical reconciliation callable by agents. Params: `apply` (boolean, default false), `commits` (number, default 50).
- **`@pc-ctx/core` exports**: `progressRead()`, `checkStale()`, `gitReconcile()`, `parseCtxTrailers()`, `GitReconcileResult`, `GitCommitRef`, `StaleEntry`, `ProgressReadResult`.
- **`SKIP_VALIDATION_DOMAINS`** — progress files use a minimal schema (`type`, `updated`) and are excluded from required-field validation.

### Changed

- **Frontmatter trim**: now.md scaffold frontmatter reduced to `type: now` + `updated: YYYY-MM-DD` (dropped `title`, `tags`). daily.md scaffold frontmatter reduced to `type: daily` only (dropped `title`, `updated`, `tags`). `progressLog` and `progressArchive` code paths updated to match.
- **Generic CRUD dropped for progress**: `list`/`show`/`add` commands removed from `ctx progress` and MCP domain-tools registration. Only bespoke tools remain: `log`, `read`, `archive`.
- **Archive threshold**: 100 lines (was 300).
- **Session rituals**: SKILL.md updated with `ctx stale` + `ctx reconcile --dry` as session start ritual, and `ctx reconcile --apply` + `ctx stale` + `ctx progress log --now` as session end ritual.
- **Git commit convention**: `ctx:` trailers documented in `.skills/git-commit-convention/SKILL.md` with full format spec, slug reference list, and session rituals.

## @pc-ctx/core 0.2.2 / @pc-ctx/cli 0.2.6 / @pc-ctx/mcp 0.3.5 — 2026-06-25

### Fixed

- Republish `@pc-ctx/core` with the `mkdirSync` fix in `writePlanFileAtomic` — `0.2.1` was published before the fix commit was merged, so every `add` command threw `ENOENT` when the target domain folder didn't exist yet.

## @pc-ctx/mcp 0.3.3 — 2026-06-24

### Added

- Roadmap entries are now mutable over MCP. Two new tools mirror the plan-tool conventions:
  - `roadmap_set_entry_status(slug, ref, status, note?)` — set an existing entry's status; the note is preserved when omitted, or updated when supplied.
  - `roadmap_add_entry(slug, ref, status?, note?)` — append an entry; errors if the ref already exists.
- Entry status stays free-form (e.g. `planned` / `next` / `done` / `parked`) — deliberately not constrained to the plan-status enum, since roadmap entries use a richer vocabulary. Previously only `roadmap_list` / `roadmap_show` existed, so an entry's status/note could only be hand-edited.

## @pc-ctx/core 0.2.1 / @pc-ctx/cli 0.2.2 / @pc-ctx/mcp 0.3.2 — 2026-06-24

### Fixed

- `writePlanFileAtomic` (used by every `add` surface — `plan add`, `roadmap add`, domain `add`, and the MCP `plan_add` / `*_add` tools) threw `ENOENT` when the target domain folder did not exist yet. A fresh context root often lacks some domain dirs (e.g. `references`, `handoffs`), so adding the first doc of that kind failed. It now creates the domain folder (recursive) before writing.

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
