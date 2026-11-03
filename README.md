<p align="center">
  <img src="docs/images/logo.png?raw=true" alt="TreePrune Logo" width="130" style="border-radius: 24px;" />
</p>

<h1 align="center">TreePrune</h1>

<p align="center">
  <strong>Whole-codebase static analysis and dead code pruner for TypeScript, Python, and Go</strong>
</p>

<p align="center">
  <a href="https://github.com/alexandrmotologa/treeprune/actions"><img src="https://img.shields.io/badge/CI-passing-emerald.svg?style=flat-square" alt="CI Status" /></a>
  <a href="https://www.npmjs.com/package/treeprune"><img src="https://img.shields.io/npm/v/treeprune.svg?style=flat-square&color=00f5ff" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" /></a>
</p>

---

<p align="center">
  <img src="docs/images/treeprune_demo.gif?raw=true" alt="TreePrune Interactive Studio Demo" width="920" style="border-radius: 12px; box-shadow: 0 16px 32px rgba(0,0,0,0.4);" />
</p>

AI coding assistants, rapid refactors, and abandoned prototypes leave behind orphaned helper functions, zombie HTTP endpoints that frontends never call, commented-out dead code blocks, duplicate helper clones, and unused entries in package dependency files. Traditional linters inspect single files in isolation, so they miss symbols that are exported but never reached from any real application entry point.

TreePrune traces reachability across the entire project graph. It detects root entry points (Next.js and Express routes, FastAPI and Flask handlers, Gin routes, and CLI main functions), builds an AST-backed call and import graph, detects unreachable islands, and creates an automated Git cleanup branch with safe rollback snapshots.

---

## Interactive Web Studio & Dashboard

TreePrune includes a local browser studio powered by Fastify and React 19. It renders your entire project reachability graph on an interactive canvas, categorizes dead weight, matches zombie routes, and offers single-click IDE deep linking.

<p align="center">
  <img src="docs/images/treeprune_dashboard.png?raw=true" alt="TreePrune Reachability Graph & Dead Weight Scorecard" width="920" style="border-radius: 10px; margin-bottom: 20px;" />
</p>

### Zombie Endpoint & Dependency Auditing

Backend route handlers that have zero matching client callsites are flagged alongside unreferenced entries in `package.json`, `requirements.txt`, or `go.mod`.

<p align="center">
  <img src="docs/images/treeprune_zombie_routes.png?raw=true" alt="TreePrune Zombie Route Detector" width="920" style="border-radius: 10px; margin-bottom: 20px;" />
</p>

### Safe Non-Destructive Code Rewriting

Preview exact side-by-side AST transformations before committing removals to a dedicated Git branch:

<p align="center">
  <img src="docs/images/treeprune_diff_modal.png?raw=true" alt="TreePrune AST Rewrite Diff Modal" width="760" style="border-radius: 10px;" />
</p>

---

## Capabilities

- Cross-language AST traversal across TypeScript and JavaScript (Babel and Recast), Python (AST), and Go.
- Root entry point detection for Next.js App and Pages routers, Express, Fastify, FastAPI, Flask, Gin, and CLI entry points.
- Global reachability analysis that marks unreachable files, orphaned exports, and unused internal declarations.
- Zombie API route detection by matching backend route templates against frontend HTTP client calls (fetch, axios, and typed API clients).
- Dependency auditing for unused packages in package.json, requirements.txt, and go.mod.
- AI residue detection identifying copy-pasted helper clones via function body hashing.
- Commented-out dead code detection identifying orphaned statements inside comments.
- Redundant type clustering identifying duplicate interface and type alias definitions across modules.
- Safe AST-preserving code pruner that eliminates dead code while preserving comments, formatting, and indentation.
- Verification guard with `--verify-types` (`tsc --noEmit`, `go vet`, `py_compile`) with auto-rollback on build failures.
- Web studio powered by Fastify and React 19 with real-time SSE progress, reachability graph viewer, side-by-side diff previews, and 1-click Cursor and VS Code deep links.
- Dedicated Git branch generation (`treeprune clean --branch cleanup-dead-code`) with automatic snapshot rollback backups.
- Automated GitHub Actions workflow generator (`treeprune init-ci`) with SARIF upload to GitHub Code Scanning.

---

## Installation

```bash
npm install -g treeprune
```

Or run directly with npx:

```bash
npx treeprune scan
```

---

## Quick Start

### 1. Scan a project

Run a full reachability audit and print a summary table:

```bash
treeprune scan ./my-project
```

Output results in JSON or SARIF for CI/CD pipelines:

```bash
treeprune scan ./my-project --format json --output report.json
treeprune scan ./my-project --format sarif --output report.sarif --threshold 50 --fail-on-zombie
```

### 2. Launch the interactive Web Studio

Inspect orphaned islands, view the dependency graph, inspect side-by-side diffs, and jump to exact lines in Cursor or VS Code:

```bash
treeprune serve ./my-project --port 9840
```

### 3. Safely prune dead code

Preview changes without touching files:

```bash
treeprune clean ./my-project --dry-run
```

Apply removals to a dedicated Git branch with type verification:

```bash
treeprune clean ./my-project --branch cleanup-dead-code --verify-types
```

Restore the previous state if needed:

```bash
treeprune rollback ./my-project
```

### 4. Setup automated GitHub Actions CI

Generate a ready-to-run GitHub Actions audit workflow:

```bash
treeprune init-ci
```

This creates `.github/workflows/treeprune-audit.yml` configured to scan on push and pull requests and upload results directly to GitHub Code Scanning.

---

## Configuration File (`treeprune.config.json`)

Configure custom rules, preserve symbols, set threshold limits, or choose your preferred editor:

```json
{
  "ignore": [
    "**/custom_vendor/**",
    "**/fixtures/**"
  ],
  "customRoots": [
    "src/workers/background_task.ts",
    "cmd/custom_runner.go"
  ],
  "preserveSymbols": [
    "onExternalWebhookReceived",
    "legacyTelemetryCallback"
  ],
  "thresholdKb": 50,
  "failOnZombie": true,
  "includeTests": false,
  "verifyBuild": true,
  "defaultBranch": "cleanup/dead-code-v1",
  "editor": "cursor"
}
```

---

## How It Works

1. **AST Ingestion**: Parses project source files into AST representations, extracting imports, exports, functions, classes, and callsites.
2. **Root Entrypoint Discovery**: Identifies framework entry points such as Next.js route handlers, Express/Fastify routes, FastAPI decorators, Gin handlers, and CLI `main` functions.
3. **Graph Construction**: Assembles a directed call and reference graph where nodes represent symbols and edges represent call, import, or reference relationships.
4. **Reachability Traversal**: Executes breadth-first search from all discovered roots. Unvisited symbols and isolated files are marked as dead.
5. **Route Cross-Matching**: Compares declared backend routes against frontend network callsites, flagging uncalled endpoints as zombies.
6. **Residue Detection**: Identifies duplicated helper functions, commented-out dead code blocks, and redundant duplicate types.
7. **Safe AST Rewriting & Verification**: Safely removes dead exports, functions, and unused dependencies using Recast, verifies project compilation, and commits to a dedicated Git branch.

---

## Project Structure

```
treeprune/
├── src/
│   ├── parser/          # Polyglot AST parsers (TS/JS, Python, Go)
│   ├── graph/           # Call graph, import tree, and reachability traversal
│   ├── detectors/       # Framework entrypoints, zombie routes, unused dependencies, AI residue
│   ├── pruner/          # Recast AST code remover, git branch generator, build verifier, rollback manager
│   ├── server/          # Fastify backend and SSE event stream for web studio
│   ├── config/          # treeprune.config.json loader and schema
│   ├── cli/             # CLI commands, init-ci workflow generator
│   └── cli.ts           # Commander CLI entry point
├── web/                 # React 19 web studio (Vite, Tailwind CSS, Lucide)
├── tests/               # Unit, integration, and fixture tests
└── docs/                # Architecture and API documentation
```

---

## License

MIT (c) 2026 Alexandr Motologa
