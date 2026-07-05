# Plan Format

Plans are markdown files with YAML frontmatter.

## File location

```
plans/<slug>.md
```

## Frontmatter

```yaml
---
title: My Plan
slug: my-plan
status: active                # active | paused | done | cancelled
category: feature             # any string
created: 20260621             # YYYYMMDD
tldr: One-line summary        # optional
priority: 50                  # 0-100, optional
tasks:
  - id: T1
    desc: Do the thing
    status: pending           # pending | in-progress | done | blocked | cancelled
  - id: T2
    desc: Another task
    status: done
references:                   # optional
  - research:some-research
  - plan:related-plan
  - url:https://example.com
---
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Human-readable title |
| `slug` | Yes | URL-safe identifier, used as filename |
| `status` | Yes | One of `active`, `paused`, `done`, `cancelled` |
| `category` | Yes | Arbitrary category string (e.g. `feature`, `infra`, `blog`) |
| `created` | Yes | Creation date in `YYYYMMDD` format |
| `tldr` | No | One-line summary |
| `priority` | No | Integer 0-100, higher = more important |
| `tasks` | Yes | Array of task objects |
| `references` | No | Array of reference links |
| `repo` | No | Slug of the repo this plan belongs to (from `repos/` domain) |

## Task fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Task identifier (e.g. `T1`, `T2`) |
| `desc` | Yes | Task description |
| `status` | Yes | One of `pending`, `in-progress`, `done`, `blocked`, `cancelled` |

## Git trailer conventions

`ctx reconcile` scans git commit messages for `ctx:` trailers and applies them to plan frontmatter.

### Trailer format

```
ctx: <slug> <action> [repo:<repo-slug>]
```

### Actions

| Action | Effect on `--apply` |
|--------|---------------------|
| `start` | Sets `status: active` |
| `progress` | Sets `status: active` (alias) |
| `close` | Sets `status: done` + `completed_at: YYYY-MM-DD` |
| `repo:<slug>` | Sets `repo: <slug>` (links plan to a repos domain entry) |

You can combine `repo:` with other actions in a single trailer:

```
ctx: my-plan start repo:pc-ctx
```

Or use it standalone to link an existing plan without changing status:

```
ctx: my-plan repo:pc-ctx
```

### Reconcile workflow

```bash
# Dry-run (default)
ctx reconcile

# Apply matching changes to plan files
ctx reconcile --apply

# Scan more/fewer commits
ctx reconcile --apply --commits 100
```

## Other domains

All domains (plans, roadmaps, ideas, processes, progress, references, archive, handoffs) share
**one standardized frontmatter schema**. Every document requires the same fields: `title`, `slug`,
`status`, `category`, `created`, and `tldr`. Domains add their own optional fields on top (plans
add `tasks`/`acceptance`/`priority`/`repo`, roadmaps add `period`/`entries`, handoffs add `session`/`branch`;
see [handoff format](handoff-format.md)).

`ctx validate` enforces this one schema across every domain (and the MCP `plan_validate` tool runs
the same check). A document with no YAML frontmatter is skipped, not flagged. Files created by
`ctx <domain> add` always include the required fields, so freshly scaffolded content validates clean.
