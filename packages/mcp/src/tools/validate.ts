import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { domainDirs, validateDomains } from '@pc-ctx/core';
import { toError, toJson } from '../format.js';

export function registerValidateTool(server: McpServer, ctx: { root: string }) {
  server.tool(
    'plan_validate',
    'Validate YAML frontmatter across all document domains (plans, roadmaps, ideas, processes, progress, references, archive). Checks required fields and valid status values.',
    {},
    async () => {
      try {
        const result = validateDomains(domainDirs(ctx.root));
        return {
          content: [
            {
              type: 'text' as const,
              text: toJson({
                checked: result.checked,
                errors: result.errors.length,
                warnings: result.warnings.length,
                errorList: result.errors,
                warningList: result.warnings,
                valid: result.valid,
              }),
            },
          ],
        };
      } catch (e) {
        return toError(String(e));
      }
    },
  );
}
