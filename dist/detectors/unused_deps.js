import fs from "node:fs/promises";
import path from "node:path";
function extractPackageRootName(importSource) {
    if (importSource.startsWith("@")) {
        const parts = importSource.split("/");
        return parts.slice(0, 2).join("/");
    }
    return importSource.split("/")[0];
}
export async function detectUnusedDependencies(projectRoot, parsedFiles) {
    const unusedList = [];
    // Collect all imported module names across parsed files
    const importedPackages = new Set();
    for (const file of parsedFiles) {
        for (const imp of file.imports) {
            if (!imp.source.startsWith(".") && !imp.source.startsWith("/")) {
                importedPackages.add(extractPackageRootName(imp.source));
            }
        }
    }
    // 1. Audit package.json
    const pkgJsonPath = path.join(projectRoot, "package.json");
    try {
        const raw = await fs.readFile(pkgJsonPath, "utf8");
        const pkg = JSON.parse(raw);
        const deps = pkg.dependencies || {};
        // Ignore known system/framework runtime bindings
        const ignoredDeps = new Set([
            "react", // often implicitly used via JSX transform
            "react-dom",
            "next",
            "typescript",
        ]);
        for (const [depName, version] of Object.entries(deps)) {
            if (ignoredDeps.has(depName))
                continue;
            if (!importedPackages.has(depName)) {
                unusedList.push({
                    name: depName,
                    version: String(version),
                    manifestFile: "package.json",
                    isDev: false,
                    uninstallCommand: `npm uninstall ${depName}`,
                });
            }
        }
    }
    catch {
        // No package.json or unreadable
    }
    // 2. Audit requirements.txt
    const reqPath = path.join(projectRoot, "requirements.txt");
    try {
        const rawReq = await fs.readFile(reqPath, "utf8");
        const lines = rawReq.split("\n");
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            const pkgName = trimmed.split(/[=<>~]/)[0].trim().toLowerCase();
            if (pkgName) {
                // Python module names can replace hyphens with underscores
                const altName = pkgName.replace(/-/g, "_");
                const isImported = importedPackages.has(pkgName) ||
                    importedPackages.has(altName) ||
                    Array.from(importedPackages).some((p) => p.toLowerCase() === pkgName || p.toLowerCase() === altName);
                if (!isImported) {
                    unusedList.push({
                        name: pkgName,
                        version: trimmed.slice(pkgName.length).trim(),
                        manifestFile: "requirements.txt",
                        isDev: false,
                        uninstallCommand: `pip uninstall -y ${pkgName}`,
                    });
                }
            }
        }
    }
    catch {
        // No requirements.txt
    }
    // 3. Audit go.mod
    const goModPath = path.join(projectRoot, "go.mod");
    try {
        const rawMod = await fs.readFile(goModPath, "utf8");
        const requireBlock = rawMod.match(/require\s*\(([\s\S]*?)\)/);
        if (requireBlock) {
            const lines = requireBlock[1].split("\n");
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2 && !parts[0].startsWith("//")) {
                    const modName = parts[0];
                    const modVersion = parts[1];
                    const isImported = Array.from(importedPackages).some((p) => p.startsWith(modName));
                    if (!isImported) {
                        unusedList.push({
                            name: modName,
                            version: modVersion,
                            manifestFile: "go.mod",
                            isDev: false,
                            uninstallCommand: "go mod tidy",
                        });
                    }
                }
            }
        }
    }
    catch {
        // No go.mod
    }
    return unusedList;
}
