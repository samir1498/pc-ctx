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

This scaffolds `plans/`, `roadmaps/`, `ideas/`, `processes/`, `progress/`, `references/`, `archive/`, `handoffs/`, and a default plan.

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

# Serve locally (binds 127.0.0.1)
ctx ui --serve        # http://localhost:3333
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

## Security: the web UI API proxy is unauthenticated

`ctx ui --serve` runs a local Hono server that injects your GitHub PAT and proxies the
contents of your context repo. It binds to `127.0.0.1` and has no auth of its own, which is
fine for local use. If you ever expose that API publicly (or deploy an equivalent in front of
a private repo), it will serve the full private repo contents to anyone who can reach it.

For a private repo this means access control is required, not optional. Put any public
deployment behind an auth layer such as Cloudflare Access (or an equivalent gateway, or
in-code auth) so that only authorized users can read your plans.
