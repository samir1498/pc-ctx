import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerListTool } from './tools/list.js';
import { registerShowTool } from './tools/show.js';
import { registerStatusTool } from './tools/status.js';
import { registerValidateTool } from './tools/validate.js';

export function buildServer(plansDir: string, roadmapsDir: string, researchDir: string): McpServer {
  const server = new McpServer({
    name: '@pc-ctx/mcp',
    version: '0.1.0',
  });

  const ctx = { plansDir, roadmapsDir, researchDir };

  registerListTool(server, ctx);
  registerShowTool(server, ctx);
  registerStatusTool(server, ctx);
  registerValidateTool(server, ctx);

  return server;
}
