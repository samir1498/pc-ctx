#!/usr/bin/env node
import { defineCommand, createMain } from 'citty';

const mainCmd = defineCommand({
  meta: {
    name: 'ctx',
    description: 'personal-context CLI — plan, roadmap, and research management',
  },
  subCommands: {},
});

const main = createMain(mainCmd);
main();
