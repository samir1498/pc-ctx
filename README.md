# pc-ctx

Deterministic plan management for AI agent context systems. CLI + MCP server for creating, tracking, and syncing markdown-based plans with YAML frontmatter.

```bash
npm install -g @pc-ctx/cli
ctx setup ./my-project && ctx status
```

## Documentation

| Guide | For |
|-------|-----|
| [Getting started](docs/user/getting-started.md) | Setup, install, first tour |
| [CLI reference](docs/user/cli-reference.md) | All `ctx` commands |
| [MCP integration](docs/user/mcp-integration.md) | AI agent tool configuration |
| [Plan format](docs/user/plan-format.md) | Standardized frontmatter schema |
| [Handoff format](docs/user/handoff-format.md) | Session-to-session handoff standard |
| [Architecture](docs/dev/architecture.md) | Monorepo design decisions |

## Web UI

[pc-ctx-web](https://github.com/samir1498/pc-ctx-web) is the companion web interface for browsing plans, roadmaps, references, and progress logs from any pc-ctx repository. It's built with React 19, Hono, TanStack Router, TanStack Query, and Tailwind CSS v4, and runs on Cloudflare Pages.

### Use it locally with `ctx ui`

The CLI can download and serve the latest pc-ctx-web release locally:

```bash
ctx ui                      # download + cache the latest web UI
ctx ui --serve              # download (if needed) + serve at http://127.0.0.1:3333
ctx ui --serve --port 8080  # custom port
ctx ui --update             # force re-download of the latest release
```

The local server (`ctx ui --serve`) starts a Hono server on `127.0.0.1` that:
- Serves the static web UI assets (HTML, JS, CSS)
- Proxies API requests to the GitHub API, reading plan/roadmap/reference/progress files from your context repo
- Injects your GitHub PAT (set via `ctx config --pat ghp_xxx`) to authenticate requests — required for private repos

All reads go through the GitHub API; no database is involved.

> ⚠️ **Security:** The local server binds to `127.0.0.1` with no authentication layer. This is safe for local use. **Do not expose it publicly** — it will serve the full contents of your context repo (including private plans) to anyone who can reach it. For a public deployment, put an auth gateway (e.g. Cloudflare Access) in front.

### Deploy to Cloudflare

You can also deploy pc-ctx-web directly to Cloudflare Pages:

```bash
git clone https://github.com/samir1498/pc-ctx-web
cd pc-ctx-web
npm install && cd client && npm install && cd ..
wrangler pages project create my-ctx-web --production-branch main
wrangler pages deploy client/dist --project-name my-ctx-web
wrangler pages secret put GITHUB_TOKEN --project-name my-ctx-web
```

Set `GITHUB_OWNER`, `GITHUB_REPO`, and `BRANCH` environment variables to point at your context repo (defaults: `samir1498/personal-context` on `main`).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
