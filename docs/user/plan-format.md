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

## Task fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Task identifier (e.g. `T1`, `T2`) |
| `desc` | Yes | Task description |
| `status` | Yes | One of `pending`, `in-progress`, `done`, `blocked`, `cancelled` |

## Other domains

Ideas, processes, progress, references, and archive files follow a similar markdown + YAML frontmatter pattern but enforce fewer required fields. The `validate` command checks each domain with appropriate rules.
