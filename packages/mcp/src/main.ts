#!/usr/bin/env node
import { createMcpServer } from "./index.js";

const root = process.env.PC_CTX_ROOT;
if (!root) {
  console.error("PC_CTX_ROOT environment variable is required");
  process.exit(1);
}

createMcpServer({
  root,
  plansDir: `${root}/plans`,
  roadmapsDir: `${root}/roadmaps`,
  researchDir: process.env.PC_CTX_RESEARCH_DIR || `${root}/research`,
});
