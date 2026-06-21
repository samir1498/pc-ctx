import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';

export function buildServer(plansDir: string, roadmapsDir: string, researchDir: string): McpServer {
  const server = new McpServer({
    name: '@pc-ctx/mcp',
    version: '0.1.0',
  });

  registerAllTools(server, { plansDir, roadmapsDir, researchDir });

  return server;
}
