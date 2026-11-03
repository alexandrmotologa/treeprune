# TreePrune: Master Implementation Plan

Whole-codebase dead code, zombie endpoint, and unused export pruner for TypeScript, Python, and Go.

## 1. Architecture Overview

TreePrune analyzes whole codebases across languages to identify code that is never reached from application entry points:

1. **AI Residue**: Autonomous coding agents generate utility functions, abandoned components, and redundant types that persist in repositories and crowd future context windows.
2. **Zombie API Endpoints**: Backend controllers declare HTTP routes that frontend clients no longer call, retaining unused attack surface and compute overhead.
3. **Dead Dependencies**: Packages declared in manifests (`package.json`, `requirements.txt`, `go.mod`) remain installed despite having zero imports in reachable code.
4. **Whole-Graph Reachability**: Unlike single-file linters, TreePrune constructs a global reference graph from legitimate architectural entry points.

```
+-----------------------------------------------------------------------------------+
|                                     TREEPRUNE                                     |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
+-------v-------------------------+                 +-----------------------v-------+
|   Polyglot AST Parser Engine    |                 |   Root Entrypoint Discoverer  |
|  * TypeScript/JS (Babel/Recast) |                 |  * Next.js / Express Routes   |
|  * Python (AST / Tokenizer)     |                 |  * FastAPI / Flask Handlers   |
|  * Go (AST & Export Scanner)    |                 |  * CLI main() & Export Roots  |
+-------+-------------------------+                 +-----------------------+-------+
        |                                                                   |
        +---------------------------------+---------------------------------+
                                          |
                        +-----------------v-----------------+
                        |   Global Reachability Analyzer    |
                        |  * BFS / DFS Graph Traversal      |
                        |  * Unreachable Island Detection   |
                        |  * Confidence & Dynamic Eval Guard|
                        +-----------------+-----------------+
                                          |
                        +-----------------v-----------------+
                        |    Zombie Endpoint Cross-Check    |
                        |  * Backend Routes vs Client Calls |
                        |  * fetch() / axios / trpc Mapper  |
                        |  * Abandoned Controller Detector  |
                        +-----------------+-----------------+
                                          |
                        +-----------------v-----------------+
                        |   Interactive Web Studio & CLI    |
                        |  * Reachability Graph Visualizer  |
                        |  * Dead Weight Savings Metrics    |
                        |  * 1-Click Safe Prune Git Branch  |
                        +-----------------------------------+
```

---

## 2. Directory Structure

```
treeprune/
├── src/
│   ├── parser/
│   │   ├── types.ts              # Common AST symbol and file models
│   │   ├── typescript_parser.ts  # Babel/Recast parser for TS/JS/JSX/TSX
│   │   ├── python_parser.ts      # Python AST parser for imports and calls
│   │   └── go_parser.ts          # Go AST parser for packages and exports
│   ├── graph/
│   │   ├── types.ts              # Graph node and edge schemas
│   │   ├── call_graph.ts         # Directed symbol reference graph
│   │   ├── import_tree.ts        # Module import hierarchy
│   │   └── reachability.ts       # Breadth-first search reachable traversal
│   ├── detectors/
│   │   ├── entrypoints.ts        # Framework root discoverer (Next.js, Express, FastAPI, Gin)
│   │   ├── zombie_routes.ts      # Backend route and frontend client cross-matcher
│   │   ├── dead_exports.ts       # Unused export scanner
│   │   ├── unused_deps.ts        # Manifest auditor (package.json, requirements.txt, go.mod)
│   │   └── ai_residue.ts         # AI clone helper and boilerplate detector
│   ├── pruner/
│   │   ├── safe_remover.ts       # Recast non-destructive code modifier
│   │   ├── git_patch.ts          # Branch creator and atomic committer
│   │   └── backup.ts             # Snapshot creator and rollback manager
│   ├── server/
│   │   ├── api.ts                # Fastify REST endpoints
│   │   ├── sse.ts                # Server-sent events progress broadcaster
│   │   └── index.ts              # Server bootstrap and static file hosting
│   ├── reporter/
│   │   ├── table_reporter.ts     # CLI terminal table formatter
│   │   ├── json_reporter.ts      # Structured JSON output
│   │   └── sarif_reporter.ts     # SARIF output for GitHub Actions annotations
│   ├── engine.ts                 # Central orchestrator connecting parsers, graph, detectors
│   └── cli.ts                    # Commander CLI entry point
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DeadWeightMetrics.tsx # Savings counter (KB, LOC, files, packages)
│   │   │   ├── ReachabilityGraph.tsx # Canvas/SVG graph cluster viewer
│   │   │   ├── ZombieRouteList.tsx   # Uncalled endpoint table
│   │   │   ├── DeadItemList.tsx      # Filterable list of dead files and exports
│   │   │   ├── UnusedDepsList.tsx    # Unused dependencies and uninstall commands
│   │   │   └── PrunePreviewModal.tsx # Side-by-side diff modal before pruning
│   │   ├── hooks/
│   │   │   └── usePruneAnalysis.ts   # Analysis state and SSE connection
│   │   ├── App.tsx                   # Main studio view
│   │   ├── index.css                 # Tailwind styles
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── tests/
│   ├── fixtures/                 # Polyglot sample repos with intentional dead code
│   │   ├── typescript_sample/
│   │   ├── python_sample/
│   │   └── go_sample/
│   ├── typescript_parser.test.ts
│   ├── python_parser.test.ts
│   ├── go_parser.test.ts
│   ├── reachability.test.ts
│   ├── zombie_routes.test.ts
│   ├── unused_deps.test.ts
│   ├── safe_remover.test.ts
│   └── e2e_scan_clean.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Implementation Plan & Phases

### Phase 1: Core Polyglot AST Parsers & Symbol Extractor
- Task 1.1: Project scaffolding with TypeScript 5, Babel parser/traverse, Recast, Fastify, Commander, Vitest.
- Task 1.2: Implement `src/parser/typescript_parser.ts`:
  - Parses `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`.
  - Extracts imports (`ImportDeclaration`, dynamic `import()`, `require()`).
  - Extracts exports (`ExportNamedDeclaration`, `ExportDefaultDeclaration`, `export * from`).
  - Extracts declared symbols (functions, classes, consts, interfaces, types).
  - Extracts function calls, method invocations, and JSX component references (`<Header />`).
- Task 1.3: Implement `src/parser/python_parser.ts`:
  - Parses `.py` files.
  - Extracts `import foo`, `from foo import bar`, `__all__` lists.
  - Extracts function and class definitions, decorators (`@app.get`), and callsites.
- Task 1.4: Implement `src/parser/go_parser.ts`:
  - Parses `.go` files.
  - Extracts package declarations, imports, functions, methods, and capitalized exports.
  - Extracts callsites and HTTP handler registrations.

### Phase 2: Root Entrypoint Discovery & Graph Reachability Engine
- Task 2.1: Implement `src/detectors/entrypoints.ts`:
  - Next.js App Router (`app/**/page.*`, `app/**/route.*`, `app/**/layout.*`, `app/**/error.*`).
  - Next.js Pages Router (`pages/**/*.*`, `pages/api/**/*.*`).
  - Express / Fastify / Koa route registrations.
  - FastAPI / Flask route decorators.
  - Gin / Chi / Go `main` packages and `func main()`.
  - Library export roots configured in `package.json` (`main`, `module`, `exports`).
  - CLI commands in `package.json` (`bin`).
- Task 2.2: Implement `src/graph/call_graph.ts` and `src/graph/import_tree.ts`:
  - Builds directed adjacency graph linking symbol nodes via caller, reference, and import edges.
- Task 2.3: Implement `src/graph/reachability.ts`:
  - Performs BFS traversal from discovered root entry points.
  - Identifies unvisited nodes (dead functions, orphaned exports, unreachable files).
  - Computes confidence scores: High (static certainty), Medium (contains dynamic references), Low.

### Phase 3: Zombie API Endpoint & Dead Dependency Detectors
- Task 3.1: Implement `src/detectors/zombie_routes.ts`:
  - Backend route extraction: parses HTTP method and normalized route templates (e.g. `/api/users/:id`, `/items/{item_id}`).
  - Frontend client callsite scanner: extracts URLs from `fetch()`, `axios.get/post()`, `ky`, `apiClient` calls.
  - Path normalization matching: parameterized paths match dynamic template strings and variable interpolations.
  - Flags backend endpoints with 0 client invocations as Zombie Endpoints.
- Task 3.2: Implement `src/detectors/unused_deps.ts`:
  - Ingests `dependencies` from `package.json`, `requirements.txt`, and `go.mod`.
  - Compares declared packages against reachable module imports.
  - Flags unused packages and provides exact uninstall commands.
- Task 3.3: Implement `src/detectors/ai_residue.ts`:
  - Identifies duplicate helper functions with matching normalized AST fingerprints across directories.
  - Flags unused boilerplate types and orphan helper modules typical of AI coding sessions.

### Phase 4: AST-Preserving Pruner & Rollback Manager
- Task 4.1: Implement `src/pruner/safe_remover.ts`:
  - Uses Recast for TypeScript/JavaScript to remove dead named exports, functions, and variables without altering surrounding comments or formatting.
  - Handles complete file removals and cleans corresponding re-exports in parent barrel files (`index.ts`).
  - Updates `package.json` to cleanly remove dead dependencies.
- Task 4.2: Implement `src/pruner/backup.ts`:
  - Creates timestamped snapshots in `.treeprune/snapshots/<id>` before mutations.
  - Restores snapshots with `treeprune rollback`.
- Task 4.3: Implement `src/pruner/git_patch.ts`:
  - Creates a dedicated cleanup branch (`treeprune/cleanup-dead-code`).
  - Commits pruned changes with a structured summary commit message.

### Phase 5: Fastify Backend & React 19 Web Studio
- Task 5.1: Implement `src/server/api.ts` and `src/server/sse.ts`:
  - Endpoints: `POST /api/scan`, `GET /api/events`, `POST /api/prune`, `GET /api/diff`, `GET /api/status`.
  - Real-time progress updates via SSE during parsing and graph generation.
- Task 5.2: Build React 19 Web Studio in `web/`:
  - Dead Weight Scorecard: Wasted KB, eliminated lines of code, dead files, zombie endpoints.
  - Reachability Graph: Interactive SVG/Canvas node visualizer showing connected roots vs isolated islands.
  - Zombie Route Table: Filterable list of orphaned routes.
  - Dead Items & Diff Preview: Side-by-side AST removal diffs before applying prunes.
  - 1-Click Prune Button: Triggers server-side branch creation and commit.

### Phase 6: CLI, CI Reporter & Comprehensive Testing
- Task 6.1: Implement `src/cli.ts` with Commander:
  - Commands: `scan`, `clean`, `serve`, `rollback`.
  - Output formats: formatted tables, JSON, and SARIF for GitHub Actions.
- Task 6.2: Build test fixtures in `tests/fixtures/`:
  - Polyglot repository covering TypeScript (Next.js + Express), Python (FastAPI), and Go (Gin).
- Task 6.3: Comprehensive test suite:
  - Unit tests for all parsers, graph reachability, detectors, and code modifier.
  - End-to-end integration test verifying full scan, dry-run, actual prune, and rollback.
