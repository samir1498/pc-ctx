# Handoff Format

Handoffs capture the state of a work session so the next session (you, a teammate, or
an AI agent) can pick up without re-deriving context. They live in `handoffs/` and follow
the same standardized frontmatter as every other domain, plus a few handoff-specific fields.

## File location

```
handoffs/<YYYYMMDD>-<slug>.md
```

`ctx handoffs add` names the file `<today>-<slug>.md` automatically.

## Frontmatter

```yaml
---
title: Session handoff - pc-ctx audit
slug: pc-ctx-audit
status: active                # active = open/unconsumed, done = picked up
category: pc-ctx              # work area this handoff belongs to
created: 20260623             # YYYYMMDD
tldr: One-line summary of what the session did and where it stopped.
session: 20260623             # session date or id
branch: fix/audit-security-quality
tasks:                        # next steps, reuses the shared task tooling
  - id: H1
    desc: Publish core/cli/mcp version bumps
    status: pending           # pending | in-progress | done | blocked | cancelled
references:                   # optional
  - plan:pc-ctx-tool-feedback
---
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Human-readable title |
| `slug` | Yes | URL-safe identifier |
| `status` | Yes | `active` while open, `done` once the next session has picked it up |
| `category` | Yes | Work area (e.g. the project or repo the session touched) |
| `created` | Yes | Creation date in `YYYYMMDD` format |
| `tldr` | Yes | One-line summary of the session |
| `session` | No | Session date or id |
| `branch` | No | Active git branch the work lives on |
| `tasks` | No | Next steps, using the same task schema as plans (so `ctx plan task-status` style tooling applies) |
| `references` | No | Links to related plans, research, or URLs |

## Body

Free-form markdown. The recommended sections:

```markdown
## Done
- What this session completed.

## Current state
- Where things stand right now (branches, deploys, open PRs).

## Next steps
- Tracked in `tasks` above; expand here if needed.

## Blockers / open questions
- Anything the next session needs answered.
```

## Workflow

```bash
ctx handoffs add "Session handoff - <topic>" --category <area> --tldr "<summary>"
# edit the file: fill Done / Current state / Next steps, add tasks
ctx handoffs list            # open handoffs
ctx handoffs show <slug>     # read one
```

Mark a handoff `done` once consumed so `handoffs/` reflects only open context. `ctx validate`
checks handoffs against the standardized schema like every other domain.
