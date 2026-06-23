# CLI Reference

## Overview

```bash
ctx <command> [subcommand] [options]
```

## Commands

### `ctx status`

Show grouped overview of all plans, roadmaps, and domains.

### `ctx list`

List plans with optional filters.

```bash
ctx list                      # all plans
ctx list --status active      # active only
```

### `ctx show <slug>`

Show full details of a plan: metadata, tasks, acceptance criteria, references, backlinks.

### `ctx validate`

Validate all markdown files across all domains. Checks YAML frontmatter, required fields, and valid status values.

```bash
ctx validate                  # validate all domains
ctx validate --domain plans   # validate a specific domain
```

### `ctx plan`

```bash
ctx plan add "Title" --priority 50 --category feature --tldr "Summary"
ctx plan set-status <slug> done
ctx plan task-status <slug> T1 in-progress
ctx plan add-task <slug> T2 "Description" --status pending
ctx plan references <slug>         # show references + backlinks
```

### `ctx roadmap`

```bash
ctx roadmap list               # all roadmaps
ctx roadmap show <slug>        # roadmap details
ctx roadmap add "Title" --period 2026Q3
```

### `ctx research`

```bash
ctx research list
ctx research show <slug>
```

### `ctx ideas`

```bash
ctx ideas list
ctx ideas show <slug>
```

### `ctx processes`

```bash
ctx processes list
ctx processes show <slug>
```

### `ctx progress`

```bash
ctx progress list
ctx progress show <slug>
```

### `ctx references`

```bash
ctx references list
ctx references show <slug>
```

### `ctx archive`

```bash
ctx archive list
ctx archive show <slug>
```

### `ctx graph`

```bash
ctx graph                       # all plans
ctx graph <slug>                # single plan
```

### `ctx sync`

Git pull + push. Requires a configured git remote.

### `ctx config`

```bash
ctx config --show
ctx config --pat ghp_xxx
ctx config --repo owner/repo
```

### `ctx ui`

```bash
ctx ui                          # download + cache
ctx ui --serve                  # download + serve
ctx ui --serve --port 8080
ctx ui --update                 # force re-download
```

### `ctx setup`

```bash
ctx setup ./my-project
```

Scaffolds a new context system directory.
