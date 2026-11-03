# TreePrune: Master Implementation Plan

> **Whole-Codebase Polyglot Dead Code, Zombie Endpoint & Unused Export Pruner (TypeScript, Python, Go)**
>
> *High-performance static analysis engine and code pruner for AI-generated and legacy codebases. Builds whole-project AST reachability graphs, identifies orphaned functions, detects zombie backend API routes never called by frontend clients, audits unused package dependencies, and synthesizes safe 1-click prune patches.*

---

## 1. Project Overview & Architecture

Autonomous AI coding agents (Claude Code, Cursor, Devin) and agile development teams write code at breakneck speed. However, codebases rapidly accumulate technical debt and dead weight:
1. **The AI-Code Bloat Epidemic**: AI agents generate duplicate utility functions, abandoned components, and unused types that linger permanently in repositories, confusing future agent context windows.
2. **Zombie API Endpoints**: Backend controllers define dozens of API endpoints that frontend clients or mobile apps stopped calling months ago, wasting compute and expanding attack surfaces.
3. **Bloated Dependencies**: Packages declared in `package.json`, `requirements.txt`, or `go.mod` remain installed despite their imports being deleted, inflating Docker image sizes and build times.
4. **Flawed File-by-File Linters**: Traditional linters (ESLint, Ruff) analyze files in isolation and cannot detect when an exported function is unreachable across the broader project architecture.

**TreePrune** provides a cross-language, whole-codebase reachability engine and pruning studio:
- **Whole-Project Reference Graph**: Constructs a unified directed graph mapping Call Graphs, Import Trees, and Route Declarations across TypeScript, Python, and Go codebases.
- **Root Entrypoint Reachability Analysis**: Starts from legitimate entrypoints (Next.js/Express/FastAPI/Gin route handlers, CLI `main()` functions, exported library roots) and traverses forward to isolate unreachable code islands.
- **Zombie API Endpoint Detector**: Cross-references declared backend HTTP routes against frontend API client calls (`fetch`, `axios`, `trpc`, or generated SDKs), flagging orphaned endpoints.
- **Dead Dependency & Export Auditor**: Identifies unused packages ready for deletion (`npm uninstall`, `pip uninstall`, `go mod tidy`) and unreferenced exports.
- **Automated 1-Click Prune Patch**: Calculates exact byte savings and generates a clean Git branch with automated removal patches: `treeprune clean --branch cleanup-dead-code`.

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
|  * Python (AST / Tree-Sitter)   |                 |  * FastAPI / Flask Handlers   |
|  * Go (go/parser AST)           |                 |  * CLI main() & Export Roots  |
+-------+-------------------------+                 +-----------------------+-------+
        |                                                                   |
        +---------------------------------+---------------------------------+
                                          |
                        +-----------------v-----------------+
                        |   Global Reachability Analyzer    |
                        |  * BFS / DFS Graph Traversal      |
                        |  * Unreachable Island Detection   |
                        |  * Dynamic Eval & Reflection Flags|
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
│   │   ├── typescript_parser.ts  # Babel/Recast AST parser for TS/JS
│   │   ├── python_parser.ts      # Python AST and import resolver
│   │   └── go_parser.ts          # Go AST callsite and export extractor
│   ├── graph/
│   │   ├── call_graph.ts         # Direct and indirect function call edges
│   │   ├── import_tree.ts        # Module dependency tree
│   │   └── reachability.ts       # Graph traversal and unreferenced node finder
│   ├── detectors/
│   │   ├── entrypoints.ts        # Identifies frameworks: Next.js, Express, FastAPI, Gin
│   │   ├── zombie_routes.ts      # Correlates backend endpoints with frontend callsites
│   │   ├── dead_exports.ts       # Unused export declaration scanner
│   │   └── unused_deps.ts        # package.json, requirements.txt, go.mod auditor
│   ├── pruner/
│   │   ├── safe_remover.ts       # Rewrites AST to safely remove dead functions/types
│   │   ├── git_patch.ts          # Creates clean git feature branch with atomic commits
│   │   └── backup.ts             # Rollback snapshot manager
│   ├── server/
│   │   ├── api.ts                # Fastify backend for web studio
│   │   └── sse.ts                # Live scan progress event stream
│   └── cli.ts                    # Commander CLI entrypoint
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DeadWeightMetrics.tsx # Wasted KB, lines of code, and dead file count
│   │   │   ├── ReachabilityGraph.tsx # Interactive D3 node graph showing orphaned islands
│   │   │   ├── ZombieRouteList.tsx   # Abandoned API endpoints with last commit age
│   │   │   └── PrunePreviewModal.tsx # Side-by-side diff of proposed removals
│   │   ├── hooks/
│   │   │   └── usePruneAnalysis.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── tests/
│   ├── reachability.test.ts
│   └── zombie_routes.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Implementation Roadmap

### Phase 1: Polyglot AST Ingestion & Module Call Graph
- Implement `src/parser/typescript_parser.ts`:
  - Parse files using `@babel/parser` with full TypeScript and JSX plugins.
  - Extract: `ImportDeclaration`, `ExportNamedDeclaration`, `ExportDefaultDeclaration`, `CallExpression`, `Identifier`.
- Implement `src/parser/python_parser.ts` and `go_parser.ts`:
  - Resolve module paths, relative imports, and function calls.
- Construct `src/graph/call_graph.ts`:
  - Build directed adjacency matrix: Node = `filepath:symbolName`, Edge = `calls / imports`.

### Phase 2: Root Entrypoint Discovery & Reachability Traversal
- Implement `src/detectors/entrypoints.ts`:
  - Automatically identify legitimate starting points:
    - Next.js App Router (`app/**/page.tsx`, `route.ts`) and Pages Router (`pages/**/*.tsx`).
    - Express / Fastify / Gin / FastAPI route registrations (`app.get(...)`, `@app.get(...)`).
    - CLI entrypoints (`main.go`, `cli.ts`, `if __name__ == "__main__":`).
    - Library package entrypoints defined in `package.json` (`main`, `exports`).
- Implement `src/graph/reachability.ts`:
  - Perform Breadth-First Search (BFS) starting from all identified entrypoints.
  - Any node not visited during traversal is marked as **DEAD CODE**.

### Phase 3: Zombie API Endpoint Detector
- Implement `src/detectors/zombie_routes.ts`:
  - Ingest backend declared routes: Method (GET/POST) and URL Path Pattern (e.g. `/api/v1/users/:id`).
  - Scan frontend client codebases for matching string literals, template strings, or generated API client methods (e.g. `api.users.get(id)` or `fetch('/api/v1/users/' + id)`).
  - Flag any backend endpoint with 0 frontend callsites as a **ZOMBIE ENDPOINT**.

### Phase 4: Dead Dependency Auditor & Safe Removal Synthesizer
- Implement `src/detectors/unused_deps.ts`:
  - Parse `dependencies` in `package.json`.
  - Compare declared packages against actual reachable import statements.
  - Flag packages that are never imported anywhere in the reachable code graph.
- Implement `src/pruner/safe_remover.ts` using `recast`:
  - Remove dead export statements, functions, and interfaces while preserving surrounding code formatting and comments.
  - If removing an entire file, delete the file and clean up its export in `index.ts`.

### Phase 5: Web Studio, Git PR Patch & CLI
- Build modern React 19 interface in `web/`:
  - **Dead Weight Metrics Scorecard**: Display total lines eliminated, bundle size reduction (KB), and dead dependencies.
  - **Reachability Graph Viewer**: Interactive visual cluster highlighting connected components vs dead islands.
  - **1-Click Clean Branch**: Automatically executes `git checkout -b prune-dead-code` and commits changes.
- Implement CLI commands:
  - `npx treeprune scan --dir ./my-project`: Output dead code report.
  - `npx treeprune clean --dir ./my-project --dry-run`: Preview removals.
  - `npx treeprune serve --port 9840`: Launch interactive web studio.

---

## 4. Agent Kickoff Prompt

```markdown
You are implementing **TreePrune**, a whole-codebase polyglot dead code, zombie endpoint, and unused export pruner in Node.js 22 + TypeScript + React 19.

### Execution Plan:
1. Initialize the project in `B:\workgit\treeprune` with root `package.json`, TypeScript configuration, and dependencies (`@babel/parser`, `@babel/traverse`, `recast`, `fastify`, `commander`).
2. Implement `src/parser/` to parse TypeScript/JavaScript, Python, and Go files into ASTs and extract function calls and import declarations.
3. Implement `src/detectors/entrypoints.ts` to identify root starting points (Next.js/Express routes, CLI mains, exported library symbols).
4. Implement `src/graph/reachability.ts` to build the whole-project call graph and perform BFS traversal to isolate unreachable code islands.
5. Implement `src/detectors/zombie_routes.ts` to detect backend API routes that have zero callsites in frontend clients.
6. Implement `src/pruner/` to safely rewrite ASTs, remove dead code, and generate a clean Git cleanup branch.
7. Build the modern React 19 web studio in `web/` featuring the Dead Weight Scorecard, Reachability Graph Viewer, and Diff Preview.
8. Implement the CLI in `src/cli.ts` supporting `scan`, `clean`, and `serve --port 9840`.

Maintain 100% production code without mocks, placeholders, or empty handlers.
```
