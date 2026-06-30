import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAddAcceptanceTool } from './add-acceptance.js';
import { registerAddRefTool } from './add-ref.js';
import { registerAddTaskTool } from './add-task.js';
import { registerAddTool } from './add.js';
import { registerArchiveTool } from './archive.js';
import { registerDomainTools } from './domain-tools.js';
import { registerGraphTool } from './graph.js';
import { registerListTool } from './list.js';
import { registerPlanReconcileTool } from './plan-reconcile.js';
import { registerPlanStaleTool } from './plan-stale.js';
import { registerProgressLogTool } from './progress-log.js';
import { registerProgressReadTool } from './progress-read.js';
import { registerReferencesTool } from './references.js';
import { registerRemoveTaskTool } from './remove-task.js';
import { registerResearchListTool } from './research-list.js';
import { registerResearchShowTool } from './research-show.js';
import { registerRoadmapAddEntryTool } from './roadmap-add-entry.js';
import { registerRoadmapListTool } from './roadmap-list.js';
import { registerRoadmapSetEntryStatusTool } from './roadmap-set-entry-status.js';
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
  registerAddAcceptanceTool(server, ctx);
  registerRemoveTaskTool(server, ctx);
  registerAddRefTool(server, ctx);
  registerArchiveTool(server, ctx);
  registerReferencesTool(server, ctx);
  registerRoadmapListTool(server, ctx);
  registerRoadmapShowTool(server, ctx);
  registerRoadmapSetEntryStatusTool(server, ctx);
  registerRoadmapAddEntryTool(server, ctx);
  registerResearchListTool(server, ctx);
  registerResearchShowTool(server, ctx);
  registerGraphTool(server, ctx);
  registerPlanReconcileTool(server, ctx);
  registerPlanStaleTool(server, ctx);
  registerProgressLogTool(server, ctx);
  registerProgressReadTool(server, ctx);
  registerSyncTool(server, ctx);
  registerSetupTool(server, ctx);

  const domains: [string, string, string][] = [
    ['ideas', join(ctx.root, 'ideas'), 'idea'],
    ['processes', join(ctx.root, 'processes'), 'process'],
    ['references', join(ctx.root, 'references'), 'reference'],
    ['archive', join(ctx.root, 'archive'), 'archived item'],
    ['handoffs', join(ctx.root, 'handoffs'), 'session handoff'],
  ];
  for (const [domain, dir, label] of domains) {
    registerDomainTools(server, { root: ctx.root }, domain, dir, label);
  }
}
