import { createHash } from "node:crypto";
function computeBodyHash(codeSnippet) {
    const normalized = codeSnippet.replace(/\s+/g, " ").trim();
    return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}
export function parseGo(code, filePath, normalizedPath) {
    const lines = code.split("\n");
    const lineCount = lines.length;
    const byteSize = Buffer.byteLength(code, "utf8");
    const symbols = [];
    const imports = [];
    const calls = [];
    const routes = [];
    const hasDynamicEvaluation = false;
    const isTestFile = filePath.endsWith("_test.go");
    // Package name extraction
    let packageName = "";
    const pkgMatch = code.match(/package\s+([a-zA-Z_]\w*)/);
    if (pkgMatch) {
        packageName = pkgMatch[1];
    }
    // Multiline / single line import blocks
    const importBlockRegex = /import\s*\(([\s\S]*?)\)/g;
    let importBlockMatch;
    while ((importBlockMatch = importBlockRegex.exec(code)) !== null) {
        const blockContent = importBlockMatch[1];
        const importLines = blockContent.split("\n");
        for (const impLine of importLines) {
            const match = impLine.trim().match(/^(?:([a-zA-Z_]\w*)\s+)?["']([^"']+)["']/);
            if (match) {
                const alias = match[1];
                const src = match[2];
                const parts = src.split("/");
                const defaultName = parts[parts.length - 1];
                imports.push({
                    source: src,
                    specifiers: [{ importedName: "*", localName: alias || defaultName }],
                    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
                });
            }
        }
    }
    // Single line imports: import "fmt"
    const singleImportRegex = /import\s+(?:([a-zA-Z_]\w*)\s+)?["']([^"']+)["']/g;
    let singleMatch;
    while ((singleMatch = singleImportRegex.exec(code)) !== null) {
        // Avoid re-matching multi-line imports
        if (code.slice(singleMatch.index - 5, singleMatch.index).includes("("))
            continue;
        const alias = singleMatch[1];
        const src = singleMatch[2];
        const parts = src.split("/");
        const defaultName = parts[parts.length - 1];
        imports.push({
            source: src,
            specifiers: [{ importedName: "*", localName: alias || defaultName }],
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
        });
    }
    // Function and method definitions
    // func (r *Receiver) MethodName(...) ...
    // func FuncName(...) ...
    for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        const rawLine = lines[i];
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith("//"))
            continue;
        const funcMatch = trimmed.match(/^func\s+(?:\([^)]+\)\s+)?([a-zA-Z_]\w*)\s*\(/);
        if (funcMatch) {
            const name = funcMatch[1];
            // In Go, uppercase initial letter means exported
            const isExported = /^[A-Z]/.test(name);
            // Find closing brace to measure function length
            let openBraces = 0;
            let endLine = lineNum;
            for (let j = i; j < lines.length; j++) {
                const l = lines[j];
                openBraces += (l.match(/\{/g) || []).length;
                openBraces -= (l.match(/\}/g) || []).length;
                if (openBraces === 0 && j > i) {
                    endLine = j + 1;
                    break;
                }
            }
            const bodyLines = lines.slice(i, endLine).join("\n");
            const symbol = {
                id: `${normalizedPath}:${name}`,
                filePath: normalizedPath,
                name,
                kind: "function",
                isExported,
                loc: {
                    start: { line: lineNum, column: 0 },
                    end: { line: endLine, column: lines[endLine - 1]?.length ?? 0 },
                },
                byteSize: Buffer.byteLength(bodyLines, "utf8"),
                lineCount: endLine - lineNum + 1,
                hash: computeBodyHash(bodyLines),
            };
            symbols.push(symbol);
            // If package is main and function is main, it's a CLI entrypoint
            if (packageName === "main" && name === "main") {
                symbol.isExported = true;
            }
        }
        // Route registrations: Gin / Echo / Chi / net/http
        // e.g. r.GET("/api/users", handler), router.POST("/api/items", handler)
        const ginRouteMatch = trimmed.match(/(?:r|router|e|app)\.(GET|POST|PUT|DELETE|PATCH|Handle)\s*\(\s*["']([^"']+)["']/i);
        if (ginRouteMatch) {
            const method = ginRouteMatch[1].toUpperCase();
            const path = ginRouteMatch[2];
            routes.push({
                id: `${normalizedPath}:${method}:${path}`,
                filePath: normalizedPath,
                method: method === "HANDLE" ? "ALL" : method,
                path,
                framework: "gin",
                loc: {
                    start: { line: lineNum, column: 0 },
                    end: { line: lineNum, column: rawLine.length },
                },
            });
        }
        // Call expressions e.g. service.DoSomething(...), handler(...)
        const callMatches = trimmed.matchAll(/([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)?)\s*\(([^)]*)\)/g);
        for (const match of callMatches) {
            const callee = match[1];
            const argsRaw = match[2];
            const strArg = argsRaw.match(/["']([^"']+)["']/);
            calls.push({
                callee,
                arguments: strArg ? [strArg[1]] : [],
                loc: {
                    start: { line: lineNum, column: 0 },
                    end: { line: lineNum, column: rawLine.length },
                },
            });
        }
    }
    return {
        filePath: normalizedPath,
        language: "go",
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
