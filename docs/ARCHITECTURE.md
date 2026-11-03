# TreePrune Architecture

This document describes the internal design of TreePrune, its reachability pipeline, and its cross-language parsing strategy.

## Pipeline Overview

The analysis runs through five phases:

1. **Discovery & Parsing**: Discovers all source files in the target directory (TypeScript, JavaScript, Python, Go) while respecting ignore rules (`.gitignore`, `node_modules`, `dist`, vendor directories).
2. **Symbol & Edge Extraction**: Extracts declared identifiers, exported entities, import bindings, function declarations, class declarations, and callsites into language-agnostic AST records.
3. **Root Entrypoint Identification**: Heuristically detects architectural entry points that are reached by external triggers (HTTP requests, CLI executions, lifecycle hooks).
4. **Reachability Graph Traversal**: Constructs a global directed graph and performs breadth-first search from all discovered root nodes. Nodes with zero reachability paths are flagged as dead code.
5. **Cross-Domain Auditing**:
   - Matches frontend HTTP requests (`fetch`, `axios`, `ky`) against backend routes (Express, Fastify, FastAPI, Flask, Gin).
   - Audits project manifest files (`package.json`, `requirements.txt`, `go.mod`) against imports present in reachable files.
6. **Patch Synthesis & Pruning**: Transforms source code via non-destructive AST rewrite (Recast for JavaScript/TypeScript) or file removal, staged inside a designated Git branch.

## Graph Data Model

### Node Representation

Every traceable entity in a repository is assigned a unique symbol key:

```typescript
export interface GraphNode {
  id: string; // e.g. "src/utils/math.ts:calculateSum" or "src/routes/user.ts:GET"
  filePath: string;
  name: string;
  kind: "function" | "class" | "variable" | "export" | "route" | "file" | "package";
  language: "typescript" | "javascript" | "python" | "go";
  isExported: boolean;
  isRoot: boolean;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  byteSize: number;
}
```

### Edge Representation

Edges indicate dependency flow:

```typescript
export interface GraphEdge {
  from: string; // caller or importing symbol
  to: string;   // callee or imported symbol
  kind: "calls" | "imports" | "instantiates" | "references";
}
```

## Entrypoint Detectors

Framework roots do not have incoming call edges from internal files. TreePrune recognizes:

- **Next.js**:
  - App Router: `app/**/page.{tsx,jsx}`, `app/**/route.{ts,js}`, `app/**/layout.{tsx,jsx}`, `app/**/loading.{tsx,jsx}`, `app/**/error.{tsx,jsx}`
  - Pages Router: `pages/**/*.{tsx,jsx}`, `pages/api/**/*.{ts,js}`
- **Express / Fastify**:
  - `app.get()`, `app.post()`, `app.put()`, `app.delete()`, `app.use()`, `router.get()`, etc.
- **Python Frameworks**:
  - FastAPI / Flask: `@app.get(...)`, `@router.post(...)`, `@app.route(...)`
  - CLI: `if __name__ == '__main__':`
- **Go Frameworks**:
  - `package main` with `func main()`
  - Gin / Chi / Echo: `r.GET(...)`, `r.POST(...)`, `r.Handle(...)`
- **Libraries**:
  - Symbols exported by files designated in `package.json` (`main`, `module`, `exports`).

## Non-Destructive Code Rewriting

For TypeScript and JavaScript, TreePrune relies on Recast. Recast parses the code into an AST while storing token and formatting metadata. When an unused export or internal helper is pruned:

- Only the target AST node is removed.
- Surrounding comments, line breaks, indentations, and semicolons remain intact.
- If all exports of a file are dead, the entire file is deleted, and its export statement in parent barrel files (`index.ts`) is cleaned.

## Backup and Rollback

Prior to executing any file mutation, TreePrune creates a compressed snapshot in `.treeprune/snapshots/<timestamp>`. Running `treeprune rollback` restores the exact pre-prune state instantly.
