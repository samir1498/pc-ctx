# Contributing

## Setup

```bash
git clone https://github.com/samir1498/pc-ctx
cd pc-ctx
pnpm install
pnpm build
```

## Quality

Run full quality gate before submitting:

```bash
pnpm check   # lint -> knip -> build -> typecheck -> depcruise -> test
```

`build` runs before `typecheck` because the cli and mcp packages typecheck against
`@pc-ctx/core`'s compiled declaration files.

## PR workflow

1. Create a branch from `main`
2. Make your changes
3. Run `pnpm check` and fix any issues
4. Push and create a pull request

## Code style

- TypeScript strict mode
- Biome for lint + formatting (semicolons, single quotes); run `pnpm lint:fix` and `pnpm format`
- No barrel exports (`index.ts` re-exports are ok at package root)
- Tests use Vitest: `pnpm test` (unit + integration), or `pnpm test:unit` / `pnpm test:it`

## Project structure

See [docs/dev/architecture.md](docs/dev/architecture.md) for the monorepo layout and design decisions.

## License

MIT — see [LICENSE](LICENSE).
