import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readAllPlans, VALID_STATUSES, VALID_TASK_STATUSES } from '@pc-ctx/core';
import { toJson, toError } from '../format.js';

export function registerValidateTool(server: McpServer, ctx: { plansDir: string }) {
  server.tool(
    'plan_validate',
    'Validate all plan files for correct YAML frontmatter, required fields, and valid status values.',
    {},
    async () => {
      try {
        const plans = readAllPlans(ctx.plansDir);
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const p of plans) {
          const f = p.frontmatter;
          for (const field of ['title', 'slug', 'status', 'category', 'created', 'tldr']) {
            if (f[field] == null || f[field] === '') errors.push(`${f.slug}: missing required field "${field}"`);
          }
          if (f.status && !VALID_STATUSES.includes(f.status)) errors.push(`${f.slug}: invalid status "${f.status}"`);
          if (f.tasks) for (const t of f.tasks) if (!VALID_TASK_STATUSES.includes(t.status)) errors.push(`${f.slug}.tasks.${t.id}: invalid status "${t.status}"`);
          if (f.created && typeof f.created !== 'number') warnings.push(`${f.slug}: "created" should be a number, got "${f.created}"`);
        }

        const result = {
          checked: plans.length,
          errors: errors.length,
          warnings: warnings.length,
          errorList: errors,
          warningList: warnings,
          valid: errors.length === 0,
        };

        return { content: [{ type: 'text' as const, text: toJson(result) }] };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
