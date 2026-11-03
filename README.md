# TreePrune

Whole-codebase static analysis and dead code pruner for TypeScript, Python, and Go.

AI coding assistants, rapid refactors, and abandoned prototypes leave behind orphaned helper functions, zombie HTTP endpoints that frontends never call, and unused entries in package dependency files. Traditional linters inspect single files in isolation, so they miss symbols that are exported but never reached from any real application entry point.

TreePrune traces reachability across the entire project graph. It detects root entry points (Next.js and Express routes, FastAPI and Flask handlers, Gin routes, and CLI main functions), builds an AST-backed call and import graph, detects unreachable islands, and creates an automated Git cleanup branch.

## Capabilities

- Cross-language AST traversal across TypeScript/JavaScript (Babel and Recast), Python (AST), and Go.
- Root entry point detection for Next.js App and Pages routers, Express, Fastify, FastAPI, Flask, Gin, and CLI entry points.
- Global reachability analysis that marks unreachable files, orphaned exports, and unused internal declarations.
- Zombie API route detection by matching backend route templates against frontend HTTP client calls (fetch, axios, and typed API clients).
- Dependency auditing for unused packages in package.json, requirements.txt, and go.mod.
- AST-preserving code pruner that eliminates dead code while preserving comments, formatting, and indentation.
- Web studio powered by Fastify and React 19 with real-time SSE progress, reachability graph viewer, and side-by-side diff previews.
- Dedicated Git branch generation (`treeprune clean --branch cleanup-dead-code`) with automatic snapshot rollback backups.

## Installation

```bash
npm install -g treeprune
```

Or run directly with npx:

```bash
npx treeprune scan
```

## Quick Start

### 1. Scan a project

Run a full reachability audit and print a summary table:

```bash
treeprune scan ./my-project
```

Output results in JSON for CI/CD pipelines:

```bash
treeprune scan ./my-project --format json --output report.json
```

### 2. Launch the interactive Web Studio

Inspect orphaned islands, view the dependency graph, and select items to prune:

```bash
treeprune serve ./my-project --port 9840
```

### 3. Safely prune dead code

Preview changes without touching files:

```bash
treeprune clean ./my-project --dry-run
```

Apply removals to a dedicated Git branch:

```bash
treeprune clean ./my-project --branch cleanup-dead-code
```

Restore the previous state if needed:

```bash
treeprune rollback ./my-project
```

## How It Works

1. **AST Ingestion**: Parses project source files into AST representations, extracting imports, exports, functions, classes, and callsites.
2. **Root Entrypoint Discovery**: Identifies framework entry points such as Next.js route handlers, Express/Fastify routes, FastAPI decorators, Gin handlers, and CLI `main` functions.
3. **Graph Construction**: Assembles a directed call and reference graph where nodes represent symbols and edges represent call or reference relationships.
4. **Reachability Traversal**: Executes breadth-first search from all discovered roots. Unvisited symbols and isolated files are marked as dead.
5. **Route Cross-Matching**: Compares declared backend routes against frontend network callsites, flagging uncalled endpoints as zombies.
6. **AST Rewriting**: Safely removes dead exports, functions, and unused dependencies using Recast, maintaining original formatting.

## Project Structure

```
treeprune/
├── src/
│   ├── parser/          # Polyglot AST parsers (TS/JS, Python, Go)
│   ├── graph/           # Call graph, import tree, and reachability traversal
│   ├── detectors/       # Framework entrypoints, zombie routes, unused dependencies
│   ├── pruner/          # Recast AST code remover, git branch generator, rollback manager
│   ├── server/          # Fastify backend and SSE event stream for web studio
│   └── cli.ts           # Commander CLI entry point
├── web/                 # React 19 web studio (Vite, Tailwind CSS, Lucide)
├── tests/               # Unit, integration, and fixture tests
└── docs/                # Architecture and API documentation
```

## License

MIT (c) 2026 Alexandr Motologa
