import fs from "node:fs/promises";
import path from "node:path";
import * as recast from "recast";
import { parse } from "@babel/parser";

const babelParser = {
  parse(source: string) {
    return parse(source, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        ["decorators", { decoratorsBeforeExport: true }],
        "classProperties",
        "classPrivateProperties",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "topLevelAwait",
        "dynamicImport",
      ],
      tokens: true,
      errorRecovery: true,
    });
  },
};

export interface PruneTarget {
  id: string; // e.g. "src/math.ts:unusedSubtract"
  filePath: string;
  symbolName: string;
  kind: string;
}

export interface PruneExecutionPlan {
  modifiedFiles: Map<string, string>; // filePath -> newContent
  deletedFiles: string[];
  removedDependencies: string[];
}

export async function createPrunePlan(
  projectRoot: string,
  deadFiles: string[],
  deadSymbols: PruneTarget[],
  unusedDependencies: string[]
): Promise<PruneExecutionPlan> {
  const modifiedFiles = new Map<string, string>();
  const deletedFiles: string[] = [...deadFiles];
  const deadFileSet = new Set(deadFiles);

  // Group dead symbols by file (excluding files that are completely deleted)
  const symbolsByFile = new Map<string, string[]>();
  for (const sym of deadSymbols) {
    if (deadFileSet.has(sym.filePath)) continue;
    if (!symbolsByFile.has(sym.filePath)) {
      symbolsByFile.set(sym.filePath, []);
    }
    symbolsByFile.get(sym.filePath)!.push(sym.symbolName);
  }

  // Rewrite code for files with dead symbols using Recast
  for (const [relPath, targetSymbols] of symbolsByFile.entries()) {
    const fullPath = path.join(projectRoot, relPath);
    try {
      const code = await fs.readFile(fullPath, "utf8");
      const rewritten = removeSymbolsFromCode(code, targetSymbols, relPath);
      if (rewritten !== code) {
        modifiedFiles.set(relPath, rewritten);
      }
    } catch {
      // Ignore unparseable or inaccessible file
    }
  }

  // Update package.json if any unused dependencies were selected
  if (unusedDependencies.length > 0) {
    const pkgPath = path.join(projectRoot, "package.json");
    try {
      const pkgRaw = await fs.readFile(pkgPath, "utf8");
      const pkg = JSON.parse(pkgRaw);
      let changed = false;

      if (pkg.dependencies) {
        for (const dep of unusedDependencies) {
          if (pkg.dependencies[dep]) {
            delete pkg.dependencies[dep];
            changed = true;
          }
        }
      }

      if (changed) {
        modifiedFiles.set("package.json", JSON.stringify(pkg, null, 2) + "\n");
      }
    } catch {
      // No package.json
    }
  }

  return {
    modifiedFiles,
    deletedFiles,
    removedDependencies: unusedDependencies,
  };
}

export function removeSymbolsFromCode(
  code: string,
  symbolNames: string[],
  filePath: string
): string {
  const isTS = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
  const isJS = filePath.endsWith(".js") || filePath.endsWith(".jsx");

  // If not JS/TS, return original for now
  if (!isTS && !isJS) {
    return code;
  }

  const targets = new Set(symbolNames);

  try {
    const ast = recast.parse(code, { parser: babelParser });
    const b = recast.types.builders;

    recast.visit(ast, {
      visitExportNamedDeclaration(pathRef) {
        const node = pathRef.node;

        // Named export with declaration: export function foo() {}
        if (node.declaration) {
          const decl = node.declaration;
          if (decl.type === "FunctionDeclaration" && decl.id && targets.has(decl.id.name)) {
            pathRef.prune();
            return false;
          }
          if (decl.type === "VariableDeclaration") {
            decl.declarations = decl.declarations.filter(
              (d: any) => !(d.id && d.id.type === "Identifier" && targets.has(d.id.name))
            );
            if (decl.declarations.length === 0) {
              pathRef.prune();
              return false;
            }
          }
          if (decl.type === "ClassDeclaration" && decl.id && targets.has(decl.id.name)) {
            pathRef.prune();
            return false;
          }
        }

        // Export specifiers: export { a, b as c }
        if (node.specifiers && node.specifiers.length > 0) {
          node.specifiers = node.specifiers.filter((s: any) => {
            const expName = s.exported ? s.exported.name : s.local?.name;
            return !targets.has(expName);
          });
          if (node.specifiers.length === 0) {
            pathRef.prune();
            return false;
          }
        }

        this.traverse(pathRef);
      },

      visitFunctionDeclaration(pathRef) {
        const node = pathRef.node;
        if (node.id && targets.has(node.id.name)) {
          pathRef.prune();
          return false;
        }
        this.traverse(pathRef);
      },

      visitVariableDeclaration(pathRef) {
        const node = pathRef.node;
        // Don't duplicate prune if already handled by ExportNamedDeclaration
        if (pathRef.parent?.node?.type === "ExportNamedDeclaration") {
          this.traverse(pathRef);
          return;
        }

        node.declarations = node.declarations.filter(
          (d: any) => !(d.id && d.id.type === "Identifier" && targets.has(d.id.name))
        );

        if (node.declarations.length === 0) {
          pathRef.prune();
          return false;
        }
        this.traverse(pathRef);
      },

      visitClassDeclaration(pathRef) {
        const node = pathRef.node;
        if (pathRef.parent?.node?.type === "ExportNamedDeclaration") {
          this.traverse(pathRef);
          return;
        }
        if (node.id && targets.has(node.id.name)) {
          pathRef.prune();
          return false;
        }
        this.traverse(pathRef);
      },
    });

    return recast.print(ast).code;
  } catch (err) {
    // If AST parsing fails, fallback safely without mutating
    return code;
  }
}

export async function applyPrunePlan(
  projectRoot: string,
  plan: PruneExecutionPlan
): Promise<{ modifiedCount: number; deletedCount: number }> {
  let modifiedCount = 0;
  let deletedCount = 0;

  // Apply file modifications
  for (const [relPath, content] of plan.modifiedFiles.entries()) {
    const fullPath = path.join(projectRoot, relPath);
    await fs.writeFile(fullPath, content, "utf8");
    modifiedCount++;
  }

  // Apply file deletions
  for (const relPath of plan.deletedFiles) {
    const fullPath = path.join(projectRoot, relPath);
    try {
      await fs.unlink(fullPath);
      deletedCount++;
    } catch {
      // Ignore if already deleted
    }
  }

  return { modifiedCount, deletedCount };
}
