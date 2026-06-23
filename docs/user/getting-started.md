# Getting Started

## Install

```bash
npm install -g @pc-ctx/cli
# or
pnpm add -g @pc-ctx/cli
```

## Create a new project

```bash
ctx setup ./my-context
cd my-context
```

This scaffolds `plans/`, `roadmaps/`, `ideas/`, `processes/`, `progress/`, `references/`, `archive/`, and a default plan.

## Tour

```bash
# Overview of everything
ctx status

# List all plans
ctx list

# Show a plan
ctx show <slug>

# Validate all files
ctx validate
```

## Sync with git

```bash
ctx sync
```

Pulls from remote, then pushes local changes. Requires a configured git remote.

## Graph

```bash
# Dependency graph for all plans
ctx graph

# Graph for one plan
ctx graph <slug>
```

## Web UI

```bash
# Download and cache latest web UI
ctx ui

# Serve locally
ctx ui --serve        # http://localhost:4321
ctx ui --serve --port 8080

# Force re-download
ctx ui --update
```

## Config

```bash
# Show current config
ctx config --show

# Set GitHub PAT (required for web UI API proxy)
ctx config --pat ghp_xxx

# Custom web UI repo (optional)
ctx config --repo owner/repo
```
