import fs from "node:fs/promises";
import path from "node:path";
import * as recast from "recast";
import { parse } from "@babel/parser";
const babelParser = {
    parse(source) {
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
export async function createPrunePlan(projectRoot, deadFiles, deadSymbols, unusedDependencies) {
    const modifiedFiles = new Map();
    const deletedFiles = [...deadFiles];
    const deadFileSet = new Set(deadFiles);
    // Group dead symbols by file (excluding files that are completely deleted)
    const symbolsByFile = new Map();
    for (const sym of deadSymbols) {
        if (deadFileSet.has(sym.filePath))
            continue;
        if (!symbolsByFile.has(sym.filePath)) {
            symbolsByFile.set(sym.filePath, []);
        }
        symbolsByFile.get(sym.filePath).push(sym.symbolName);
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
        }
        catch {
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
        }
        catch {
            // No package.json
        }
    }
    return {
        modifiedFiles,
        deletedFiles,
        removedDependencies: unusedDependencies,
    };
}
function getIdName(id) {
    if (!id)
        return null;
    if (typeof id === "string")
        return id;
    if (typeof id.name === "string")
        return id.name;
    return null;
}
export function removeSymbolsFromCode(code, symbolNames, filePath) {
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
                    const fnName = getIdName(decl.id);
                    if (decl.type === "FunctionDeclaration" && fnName && targets.has(fnName)) {
                        pathRef.prune();
                        return false;
                    }
                    if (decl.type === "VariableDeclaration") {
                        decl.declarations = decl.declarations.filter((d) => {
                            const varName = getIdName(d.id);
                            return !(varName && targets.has(varName));
                        });
                        if (decl.declarations.length === 0) {
                            pathRef.prune();
                            return false;
                        }
                    }
                    const clsName = getIdName(decl.id);
                    if (decl.type === "ClassDeclaration" && clsName && targets.has(clsName)) {
                        pathRef.prune();
                        return false;
                    }
                }
                // Export specifiers: export { a, b as c }
                if (node.specifiers && node.specifiers.length > 0) {
                    node.specifiers = node.specifiers.filter((s) => {
                        const expName = s.exported ? (s.exported.name || s.exported.value) : s.local?.name;
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
                const fnName = getIdName(node.id);
                if (fnName && targets.has(fnName)) {
                    pathRef.prune();
                    return false;
                }
                this.traverse(pathRef);
            },
            visitVariableDeclaration(pathRef) {
                const node = pathRef.node;
                if (pathRef.parent?.node?.type === "ExportNamedDeclaration") {
                    this.traverse(pathRef);
                    return;
                }
                node.declarations = node.declarations.filter((d) => {
                    const varName = getIdName(d.id);
                    return !(varName && targets.has(varName));
                });
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
                const clsName = getIdName(node.id);
                if (clsName && targets.has(clsName)) {
                    pathRef.prune();
                    return false;
                }
                this.traverse(pathRef);
            },
        });
        return recast.print(ast).code;
    }
    catch (err) {
        // If AST parsing fails, fallback safely without mutating
        return code;
    }
}
export async function applyPrunePlan(projectRoot, plan) {
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
        }
        catch {
            // Ignore if already deleted
        }
    }
    return { modifiedCount, deletedCount };
}
