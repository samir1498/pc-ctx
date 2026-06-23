import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from './server.js';

export interface McpServerOptions {
  root: string;
  plansDir: string;
  roadmapsDir?: string;
  researchDir?: string;
}

export async function createMcpServer(options: McpServerOptions): Promise<McpServer> {
  const server = buildServer(
    options.plansDir,
    options.roadmapsDir ?? options.plansDir.replace('/plans', '/roadmaps'),
    options.researchDir ?? options.plansDir.replace('/plans', '/../personal-research'),
    options.root,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}

export default { createMcpServer };
