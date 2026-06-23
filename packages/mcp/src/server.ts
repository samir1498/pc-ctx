import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAllTools } from './tools/index.js';
import pkg from '../package.json' with { type: 'json' };

export function buildServer(plansDir: string, roadmapsDir: string, researchDir: string, root: string): McpServer {
  const server = new McpServer({
    name: pkg.name,
    version: pkg.version,
  });

  registerAllTools(server, { plansDir, roadmapsDir, researchDir, root });

  return server;
}
