# @pc-ctx/core

Core types, YAML I/O, and utilities for pc-ctx plan management.

```ts
import { parsePlanFile, serializePlanFile, readAllPlans, findPlan, slugify } from '@pc-ctx/core';
```

## API

| Export | Description |
|--------|-------------|
| `parsePlanFile(filepath)` | Parse a markdown plan file → `PlanFile \| null` |
| `serializePlanFile(plan)` | Serialize `PlanFile` back to markdown |
| `readAllPlans(dir)` | Recursively read all plan files in a directory |
| `findPlan(plansDir, roadmapsDir, slug)` | Find a plan by slug |
| `listResearchFiles(dir)` / `findResearchFile(dir, slug)` | Research file scan |
| `resolveRef(raw, ...)` | Resolve `plan:`, `research:`, `url:` references |
| `collectRefs(plan)` | Collect all references from a plan |
| `fmtTasks(tasks)` / `fmtPrio(p)` / `fmtCell(text, width)` / `statusBadge(s)` | Formatting helpers |
| `slugify(title)` | Convert title to kebab-case slug |
| `progressLog(root, text, opts)` | Log a progress entry (daily.md + now.md) |
| `progressRead(progressDir, file)` | Read a progress file (now.md or daily.md) |
| `progressArchive(progressDir, file)` | Archive a progress file (>100 lines) |
| `checkStale(root)` | Detect stale/idle plans and outdated focus |
| `gitReconcile(root, opts)` | Match git `ctx:` trailers against plans AND roadmaps. Dry-run by default; `--apply` writes changes. |
| `parseCtxTrailers(body)` | Parse `ctx:` trailers from a commit body |
| `VALID_STATUSES` / `VALID_TASK_STATUSES` | Allowed status values |
| `SCAFFOLD_FILES` | Template files for `ctx setup` |
