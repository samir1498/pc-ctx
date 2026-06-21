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
| `VALID_STATUSES` / `VALID_TASK_STATUSES` | Allowed status values |
| `SCAFFOLD_FILES` | Template files for `ctx setup` |
