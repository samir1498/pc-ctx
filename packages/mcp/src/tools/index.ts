import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListTool } from './list.js';
import { registerShowTool } from './show.js';
import { registerStatusTool } from './status.js';
import { registerValidateTool } from './validate.js';

export function registerAllTools(server: McpServer, ctx: { plansDir: string; roadmapsDir: string; researchDir: string }) {
  registerListTool(server, ctx);
  registerShowTool(server, ctx);
  registerStatusTool(server, ctx);
  registerValidateTool(server, ctx);
}
