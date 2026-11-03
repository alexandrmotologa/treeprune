import fs from "node:fs/promises";
import path from "node:path";
import { ParsedFile } from "../parser/types.js";

export interface PackageJsonConfig {
  name?: string;
  main?: string;
  module?: string;
  bin?: string | Record<string, string>;
  exports?: string | Record<string, any>;
  scripts?: Record<string, string>;
}

export interface RootDetectionOptions {
  includeTests?: boolean;
}

export async function detectRootEntrypoints(
  projectRoot: string,
  parsedFiles: ParsedFile[],
  options: RootDetectionOptions = {}
): Promise<Set<string>> {
  const rootNodeIds = new Set<string>();

  // 1. Ingest package.json to identify library roots and CLI bins
  let pkgJson: PackageJsonConfig | null = null;
  try {
    const pkgPath = path.join(projectRoot, "package.json");
    const raw = await fs.readFile(pkgPath, "utf8");
    pkgJson = JSON.parse(raw);
  } catch {
    // Non-Node project or missing package.json
  }

  const manifestRootFiles = new Set<string>();
  if (pkgJson) {
    if (pkgJson.main) manifestRootFiles.add(normalizePath(pkgJson.main));
    if (pkgJson.module) manifestRootFiles.add(normalizePath(pkgJson.module));
    if (typeof pkgJson.bin === "string") {
      manifestRootFiles.add(normalizePath(pkgJson.bin));
    } else if (pkgJson.bin && typeof pkgJson.bin === "object") {
      Object.values(pkgJson.bin).forEach((b) => manifestRootFiles.add(normalizePath(b)));
    }
    if (typeof pkgJson.exports === "string") {
      manifestRootFiles.add(normalizePath(pkgJson.exports));
    } else if (pkgJson.exports && typeof pkgJson.exports === "object") {
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
    const isManifestRoot = Array.from(manifestRootFiles).some((mf) =>
      norm.endsWith(mf) || mf.endsWith(norm) || stripExt(norm) === stripExt(mf)
    );
    if (isManifestRoot) {
      rootNodeIds.add(norm);
      // All exported symbols in a library root are public roots
      file.symbols
        .filter((s) => s.isExported)
        .forEach((s) => rootNodeIds.add(s.id));
    }

    // Next.js App Router: app/**/page.*, app/**/route.*, app/**/layout.*, etc.
    if (
      /(?:^|[\\/])app[\\/].*\b(?:page|route|layout|error|not-found|template|loading|default)\.[a-z]+$/.test(
        norm
      )
    ) {
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
    if (
      baseName === "cli.ts" ||
      baseName === "cli.js" ||
      baseName === "main.ts" ||
      baseName === "main.js" ||
      baseName === "main.go" ||
      baseName === "main.py" ||
      baseName === "app.py" ||
      baseName === "server.ts" ||
      baseName === "server.js" ||
      baseName === "index.ts" ||
      baseName === "index.js"
    ) {
      rootNodeIds.add(norm);
      // If it has a main or default function, mark it
      file.symbols.forEach((s) => {
        if (["main", "__main__", "run", "start", "default"].includes(s.name) || s.isExported) {
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

function normalizePath(p: string): string {
  return p.replace(/^[.\\/]+/, "").replace(/\\/g, "/");
}

function stripExt(p: string): string {
  return p.replace(/\.[a-zA-Z0-9]+$/, "");
}

function collectExportStrings(exportsObj: any, set: Set<string>): void {
  if (typeof exportsObj === "string") {
    set.add(normalizePath(exportsObj));
  } else if (typeof exportsObj === "object" && exportsObj !== null) {
    for (const val of Object.values(exportsObj)) {
      collectExportStrings(val, set);
    }
  }
}
