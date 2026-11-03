import fs from "node:fs/promises";
import path from "node:path";
export async function detectRootEntrypoints(projectRoot, parsedFiles, options = {}) {
    const rootNodeIds = new Set();
    // 1. Ingest package.json to identify library roots and CLI bins
    let pkgJson = null;
    try {
        const pkgPath = path.join(projectRoot, "package.json");
        const raw = await fs.readFile(pkgPath, "utf8");
        pkgJson = JSON.parse(raw);
    }
    catch {
        // Non-Node project or missing package.json
    }
    const manifestRootFiles = new Set();
    if (pkgJson) {
        if (pkgJson.main)
            addSourceVariants(manifestRootFiles, pkgJson.main);
        if (pkgJson.module)
            addSourceVariants(manifestRootFiles, pkgJson.module);
        if (typeof pkgJson.bin === "string") {
            addSourceVariants(manifestRootFiles, pkgJson.bin);
        }
        else if (pkgJson.bin && typeof pkgJson.bin === "object") {
            Object.values(pkgJson.bin).forEach((b) => addSourceVariants(manifestRootFiles, b));
        }
        if (typeof pkgJson.exports === "string") {
            addSourceVariants(manifestRootFiles, pkgJson.exports);
        }
        else if (pkgJson.exports && typeof pkgJson.exports === "object") {
            collectExportStrings(pkgJson.exports, manifestRootFiles);
        }
    }
    // 2. Iterate through parsed files and identify framework & architectural roots
    for (const file of parsedFiles) {
        const norm = file.filePath;
        // Check if test file should be considered root
        if (file.isTestFile) {
            if (options.includeTests) {
                rootNodeIds.add(norm);
                file.symbols.forEach((s) => rootNodeIds.add(s.id));
            }
            continue;
        }
        // Check if file is declared in package.json roots
        const isManifestRoot = Array.from(manifestRootFiles).some((mf) => norm.endsWith(mf) || mf.endsWith(norm) || stripExt(norm) === stripExt(mf));
        if (isManifestRoot) {
            rootNodeIds.add(norm);
            // All exported symbols in a library root are public roots
            file.symbols
                .filter((s) => s.isExported)
                .forEach((s) => rootNodeIds.add(s.id));
        }
        // Next.js App Router: app/**/page.*, app/**/route.*, app/**/layout.*, etc.
        if (/(?:^|[\\/])app[\\/].*\b(?:page|route|layout|error|not-found|template|loading|default)\.[a-z]+$/.test(norm)) {
            rootNodeIds.add(norm);
            file.symbols.forEach((s) => {
                if (s.isExported || s.isDefaultExport) {
                    rootNodeIds.add(s.id);
                }
            });
            // Also register route records
            file.routes.forEach((r) => rootNodeIds.add(r.id));
        }
        // Next.js Pages Router: pages/**/*.{tsx,jsx,js,ts}
        if (/(?:^|[\\/])pages[\\/].*\.[a-z]+$/.test(norm)) {
            rootNodeIds.add(norm);
            file.symbols.forEach((s) => {
                if (s.isExported || s.isDefaultExport) {
                    rootNodeIds.add(s.id);
                }
            });
        }
        // Express / Fastify / Gin declared routes
        if (file.routes.length > 0) {
            file.routes.forEach((r) => {
                rootNodeIds.add(r.id);
                if (r.handlerName) {
                    rootNodeIds.add(`${norm}:${r.handlerName}`);
                }
            });
        }
        // CLI Entrypoints: cli.ts, main.ts, main.go, if __name__ == '__main__':
        const baseName = path.basename(norm);
        if (baseName === "cli.ts" ||
            baseName === "cli.js" ||
            baseName === "main.ts" ||
            baseName === "main.js" ||
            baseName === "main.go" ||
            baseName === "main.py" ||
            baseName === "app.py" ||
            baseName === "server.ts" ||
            baseName === "server.js" ||
            baseName === "index.ts" ||
            baseName === "index.js") {
            rootNodeIds.add(norm);
            // If it has a main or default function, mark it as entrypoint root
            file.symbols.forEach((s) => {
                if (["main", "__main__", "run", "start", "default"].includes(s.name) ||
                    (baseName.startsWith("index.") && s.isExported)) {
                    rootNodeIds.add(s.id);
                }
            });
        }
        // Python __main__
        const mainSymbol = file.symbols.find((s) => s.name === "__main__");
        if (mainSymbol) {
            rootNodeIds.add(norm);
            rootNodeIds.add(mainSymbol.id);
        }
        // Go main package
        if (file.language === "go") {
            const goMain = file.symbols.find((s) => s.name === "main");
            if (goMain) {
                rootNodeIds.add(norm);
                rootNodeIds.add(goMain.id);
            }
        }
    }
    return rootNodeIds;
}
function normalizePath(p) {
    return p.replace(/^[.\\/]+/, "").replace(/\\/g, "/");
}
function addSourceVariants(targetSet, filePath) {
    const norm = normalizePath(filePath);
    targetSet.add(norm);
    // Map dist/, build/, lib/ to src/
    const srcVariant = norm.replace(/^(?:dist|build|lib|out)[\\/]/, "src/");
    targetSet.add(srcVariant);
    // Map .js/.mjs/.cjs to .ts/.tsx
    const tsVariant = srcVariant.replace(/\.m?[jt]sx?$/, ".ts");
    targetSet.add(tsVariant);
    targetSet.add(tsVariant + "x");
}
function stripExt(p) {
    return p.replace(/\.[a-zA-Z0-9]+$/, "");
}
function collectExportStrings(exportsObj, set) {
    if (typeof exportsObj === "string") {
        addSourceVariants(set, exportsObj);
    }
    else if (typeof exportsObj === "object" && exportsObj !== null) {
        for (const val of Object.values(exportsObj)) {
            collectExportStrings(val, set);
        }
    }
}
