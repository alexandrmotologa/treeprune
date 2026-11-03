import { createHash } from "node:crypto";
import {
  CallRecord,
  DeclaredSymbol,
  ImportRecord,
  ImportSpecifier,
  ParsedFile,
  RouteRecord,
  SymbolKind,
} from "./types.js";

function computeBodyHash(codeSnippet: string): string {
  const normalized = codeSnippet.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function parsePython(
  code: string,
  filePath: string,
  normalizedPath: string
): ParsedFile {
  const lines = code.split("\n");
  const lineCount = lines.length;
  const byteSize = Buffer.byteLength(code, "utf8");

  const symbols: DeclaredSymbol[] = [];
  const imports: ImportRecord[] = [];
  const calls: CallRecord[] = [];
  const routes: RouteRecord[] = [];
  let hasDynamicEvaluation = false;

  const isTestFile =
    /(?:^|[\\/])(?:tests|test)[\\/]/.test(filePath) ||
    /(?:^|[\\/])test_[^\\/]+\.py$/.test(filePath) ||
    /_test\.py$/.test(filePath);

  // Check for dynamic reflection
  if (/\b(?:eval|exec|getattr|setattr|importlib)\b/.test(code)) {
    hasDynamicEvaluation = true;
  }

  // Check for __all__ export whitelist
  const allMatch = code.match(/__all__\s*=\s*\[([^\]]+)\]/);
  const explicitExports = new Set<string>();
  if (allMatch && allMatch[1]) {
    const items = allMatch[1].match(/['"]([^'"]+)['"]/g);
    if (items) {
      items.forEach((item) => explicitExports.add(item.replace(/['"]/g, "")));
    }
  }

  // Iterate line by line to extract definitions, decorators, and imports
  let currentDecorators: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Decorator e.g. @app.get('/api/users')
    if (trimmed.startsWith("@")) {
      currentDecorators.push(trimmed);
      continue;
    }

    // Imports: from module import a, b as c
    const fromImportMatch = trimmed.match(
      /^from\s+([.\w]+)\s+import\s+(.+)$/
    );
    if (fromImportMatch) {
      const source = fromImportMatch[1];
      const items = fromImportMatch[2].split(",").map((s) => s.trim());
      const specifiers: ImportSpecifier[] = [];

      for (const item of items) {
        if (!item) continue;
        const aliasMatch = item.match(/^(\w+)\s+as\s+(\w+)$/);
        if (aliasMatch) {
          specifiers.push({
            importedName: aliasMatch[1],
            localName: aliasMatch[2],
          });
        } else {
          specifiers.push({
            importedName: item,
            localName: item,
          });
        }
      }

      imports.push({
        source,
        specifiers,
        loc: {
          start: { line: lineNum, column: 0 },
          end: { line: lineNum, column: rawLine.length },
        },
      });
      currentDecorators = [];
      continue;
    }

    // Imports: import a, b as c
    const simpleImportMatch = trimmed.match(/^import\s+(.+)$/);
    if (simpleImportMatch) {
      const items = simpleImportMatch[1].split(",").map((s) => s.trim());
      for (const item of items) {
        const aliasMatch = item.match(/^([\w.]+)\s+as\s+(\w+)$/);
        const source = aliasMatch ? aliasMatch[1] : item;
        const local = aliasMatch ? aliasMatch[2] : item;
        imports.push({
          source,
          specifiers: [{ importedName: "*", localName: local }],
          loc: {
            start: { line: lineNum, column: 0 },
            end: { line: lineNum, column: rawLine.length },
          },
        });
      }
      currentDecorators = [];
      continue;
    }

    // Function definitions: def func_name(...):
    const funcMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z_]\w*)\s*\(/);
    if (funcMatch) {
      const name = funcMatch[1];
      // In Python, symbols without leading underscore are exported by default, unless __all__ exists
      const isExported = explicitExports.size > 0
        ? explicitExports.has(name)
        : !name.startsWith("_");

      // Extract function body length by indentation
      const baseIndent = rawLine.match(/^\s*/)?.[0].length ?? 0;
      let endLine = lineNum;
      for (let j = i + 1; j < lines.length; j++) {
        const nextRaw = lines[j];
        const nextTrimmed = nextRaw.trim();
        if (!nextTrimmed || nextTrimmed.startsWith("#")) continue;
        const nextIndent = nextRaw.match(/^\s*/)?.[0].length ?? 0;
        if (nextIndent <= baseIndent) {
          break;
        }
        endLine = j + 1;
      }

      const bodyLines = lines.slice(i, endLine).join("\n");
      const symbol: DeclaredSymbol = {
        id: `${normalizedPath}:${name}`,
        filePath: normalizedPath,
        name,
        kind: "function",
        isExported,
        loc: {
          start: { line: lineNum, column: baseIndent },
          end: { line: endLine, column: lines[endLine - 1]?.length ?? 0 },
        },
        byteSize: Buffer.byteLength(bodyLines, "utf8"),
        lineCount: endLine - lineNum + 1,
        hash: computeBodyHash(bodyLines),
      };
      symbols.push(symbol);

      // Check if function was decorated with route: @app.get('/api/users') or @router.post('/items')
      for (const dec of currentDecorators) {
        const routeDecMatch = dec.match(
          /@(?:app|router|blueprint|bp)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/i
        );
        if (routeDecMatch) {
          const method = routeDecMatch[1].toUpperCase() as any;
          const routePath = routeDecMatch[2];
          routes.push({
            id: `${normalizedPath}:${method}:${routePath}`,
            filePath: normalizedPath,
            method,
            path: routePath,
            handlerName: name,
            framework: "fastapi",
            loc: symbol.loc,
          });
        }
      }

      currentDecorators = [];
      continue;
    }

    // Class definitions: class ClassName(...)
    const classMatch = trimmed.match(/^class\s+([a-zA-Z_]\w*)/);
    if (classMatch) {
      const name = classMatch[1];
      const isExported = explicitExports.size > 0
        ? explicitExports.has(name)
        : !name.startsWith("_");

      symbols.push({
        id: `${normalizedPath}:${name}`,
        filePath: normalizedPath,
        name,
        kind: "class",
        isExported,
        loc: {
          start: { line: lineNum, column: 0 },
          end: { line: lineNum, column: rawLine.length },
        },
        byteSize: 100,
        lineCount: 1,
      });

      currentDecorators = [];
      continue;
    }

    // CLI Entrypoint: if __name__ == '__main__':
    if (/if\s+__name__\s*==\s*['"]__main__['"]/.test(trimmed)) {
      symbols.push({
        id: `${normalizedPath}:__main__`,
        filePath: normalizedPath,
        name: "__main__",
        kind: "function",
        isExported: true,
        loc: {
          start: { line: lineNum, column: 0 },
          end: { line: lineNum, column: rawLine.length },
        },
        byteSize: 50,
        lineCount: 1,
      });
    }

    // Call expressions e.g. func(args), requests.get('/api/users')
    const callMatches = trimmed.matchAll(/([a-zA-Z_][\w.]*)\s*\(([^)]*)\)/g);
    for (const match of callMatches) {
      const callee = match[1];
      const argsRaw = match[2];
      const strArg = argsRaw.match(/['"]([^'"]+)['"]/);

      calls.push({
        callee,
        arguments: strArg ? [strArg[1]] : [],
        loc: {
          start: { line: lineNum, column: 0 },
          end: { line: lineNum, column: rawLine.length },
        },
      });
    }

    currentDecorators = [];
  }

  return {
    filePath: normalizedPath,
    language: "python",
    byteSize,
    lineCount,
    symbols,
    imports,
    calls,
    routes,
    hasDynamicEvaluation,
    isTestFile,
  };
}
