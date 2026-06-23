import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAddTaskTool } from './add-task.js';
import { registerAddTool } from './add.js';
import { registerDomainTools } from './domain-tools.js';
import { registerGraphTool } from './graph.js';
import { registerListTool } from './list.js';
import { registerReferencesTool } from './references.js';
import { registerResearchListTool } from './research-list.js';
import { registerResearchShowTool } from './research-show.js';
import { registerRoadmapListTool } from './roadmap-list.js';
import { registerRoadmapShowTool } from './roadmap-show.js';
import { registerSetStatusTool } from './set-status.js';
import { registerSetupTool } from './setup.js';
import { registerShowTool } from './show.js';
import { registerStatusTool } from './status.js';
import { registerSyncTool } from './sync.js';
import { registerTaskStatusTool } from './task-status.js';
import { registerValidateTool } from './validate.js';

export function registerAllTools(
  server: McpServer,
  ctx: { plansDir: string; roadmapsDir: string; researchDir: string; root: string },
) {
  registerListTool(server, ctx);
  registerShowTool(server, ctx);
  registerStatusTool(server, ctx);
  registerValidateTool(server, ctx);
  registerSetStatusTool(server, ctx);
  registerTaskStatusTool(server, ctx);
  registerAddTool(server, ctx);
  registerAddTaskTool(server, ctx);
  registerReferencesTool(server, ctx);
  registerRoadmapListTool(server, ctx);
  registerRoadmapShowTool(server, ctx);
  registerResearchListTool(server, ctx);
  registerResearchShowTool(server, ctx);
  registerGraphTool(server, ctx);
  registerSyncTool(server, ctx);
  registerSetupTool(server, ctx);

  const domains: [string, string, string][] = [
    ['ideas', join(ctx.root, 'ideas'), 'idea'],
    ['processes', join(ctx.root, 'processes'), 'process'],
    ['progress', join(ctx.root, 'progress'), 'progress entry'],
    ['references', join(ctx.root, 'references'), 'reference'],
    ['archive', join(ctx.root, 'archive'), 'archived item'],
    ['handoffs', join(ctx.root, 'handoffs'), 'session handoff'],
  ];
  for (const [domain, dir, label] of domains) {
    registerDomainTools(server, { root: ctx.root }, domain, dir, label);
  }
}
