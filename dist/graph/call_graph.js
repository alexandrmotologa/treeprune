import path from "node:path";
export function buildCallGraph(parsedFiles) {
    const nodes = new Map();
    const edges = [];
    const adjacency = new Map();
    const reachabilityAdjacency = new Map();
    function addEdge(from, to, kind, propagatesReachability = true) {
        if (from === to)
            return;
        edges.push({ from, to, kind });
        if (!adjacency.has(from)) {
            adjacency.set(from, new Set());
        }
        adjacency.get(from).add(to);
        if (propagatesReachability) {
            if (!reachabilityAdjacency.has(from)) {
                reachabilityAdjacency.set(from, new Set());
            }
            reachabilityAdjacency.get(from).add(to);
        }
    }
    // Index files by normalized path
    const fileMap = new Map();
    const filesByStem = new Map();
    for (const file of parsedFiles) {
        const norm = file.filePath;
        fileMap.set(norm, file);
        const stem = norm.replace(/\.[a-zA-Z0-9]+$/, "");
        if (!filesByStem.has(stem)) {
            filesByStem.set(stem, []);
        }
        filesByStem.get(stem).push(norm);
        // Create file-level node
        nodes.set(norm, {
            id: norm,
            filePath: norm,
            symbolName: "",
            kind: "file",
            language: file.language,
            isRoot: false,
            isExported: true,
            loc: { start: { line: 1, column: 0 }, end: { line: file.lineCount, column: 0 } },
            byteSize: file.byteSize,
            lineCount: file.lineCount,
            reachable: false,
            reachabilityDistance: -1,
            reachabilityPath: [],
            confidence: "high",
            reasons: [],
        });
        // Create symbol nodes
        for (const sym of file.symbols) {
            nodes.set(sym.id, {
                id: sym.id,
                filePath: sym.filePath,
                symbolName: sym.name,
                kind: sym.kind,
                language: file.language,
                isRoot: false,
                isExported: sym.isExported,
                loc: sym.loc,
                byteSize: sym.byteSize,
                lineCount: sym.lineCount,
                reachable: false,
                reachabilityDistance: -1,
                reachabilityPath: [],
                confidence: "high",
                reasons: [],
            });
            // "contains" informs hierarchy, but does NOT automatically mean importing the file runs every function
            addEdge(norm, sym.id, "contains", false);
            // If symbol is used, its containing file is needed
            addEdge(sym.id, norm, "references", true);
        }
        // Create route nodes if any
        for (const route of file.routes) {
            nodes.set(route.id, {
                id: route.id,
                filePath: route.filePath,
                symbolName: `${route.method} ${route.path}`,
                kind: "route",
                language: file.language,
                isRoot: true,
                isExported: true,
                loc: route.loc,
                byteSize: 0,
                lineCount: 1,
                reachable: false,
                reachabilityDistance: -1,
                reachabilityPath: [],
                confidence: "high",
                reasons: [],
            });
            addEdge(norm, route.id, "contains", false);
            addEdge(route.id, norm, "references", true);
            if (route.handlerName) {
                const handlerId = `${norm}:${route.handlerName}`;
                if (nodes.has(handlerId)) {
                    addEdge(route.id, handlerId, "calls", true);
                }
            }
        }
    }
    function resolveTargetFile(sourceFile, importPath) {
        if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
            const cleanAlias = importPath.replace(/^@\//, "src/");
            const candidates = filesByStem.get(cleanAlias);
            if (candidates && candidates.length > 0)
                return candidates[0];
            return null;
        }
        const dir = path.dirname(sourceFile);
        const resolvedRel = path.normalize(path.join(dir, importPath)).replace(/\\/g, "/");
        if (fileMap.has(resolvedRel))
            return resolvedRel;
        // Stem match (e.g. resolve .js to .ts/.tsx in NodeNext ESM)
        const cleanStem = resolvedRel.replace(/\.[a-zA-Z0-9]+$/, "");
        const candidates = filesByStem.get(cleanStem);
        if (candidates && candidates.length > 0)
            return candidates[0];
        const indexStem = `${cleanStem}/index`;
        const indexCandidates = filesByStem.get(indexStem);
        if (indexCandidates && indexCandidates.length > 0)
            return indexCandidates[0];
        return null;
    }
    for (const file of parsedFiles) {
        const norm = file.filePath;
        const localImportMap = new Map();
        for (const imp of file.imports) {
            const targetFilePath = resolveTargetFile(norm, imp.source);
            if (targetFilePath) {
                // File imports file
                addEdge(norm, targetFilePath, "imports", true);
                const targetFile = fileMap.get(targetFilePath);
                for (const spec of imp.specifiers) {
                    if (spec.importedName === "*") {
                        localImportMap.set(spec.localName, {
                            targetFile: targetFilePath,
                            targetSymbol: "*",
                        });
                        if (targetFile) {
                            targetFile.symbols
                                .filter((s) => s.isExported)
                                .forEach((s) => {
                                addEdge(norm, s.id, "references", true);
                            });
                        }
                    }
                    else {
                        localImportMap.set(spec.localName, {
                            targetFile: targetFilePath,
                            targetSymbol: spec.importedName,
                        });
                        const targetSymbolId = `${targetFilePath}:${spec.importedName}`;
                        if (nodes.has(targetSymbolId)) {
                            // The importing file references the specific target symbol
                            addEdge(norm, targetSymbolId, "references", true);
                        }
                    }
                }
            }
        }
        for (const sym of file.symbols) {
            const symStart = sym.loc.start.line;
            const symEnd = sym.loc.end.line;
            const innerCalls = file.calls.filter((c) => c.loc.start.line >= symStart && c.loc.end.line <= symEnd);
            for (const call of innerCalls) {
                const callee = call.callee;
                // 1. Local function in the same file
                const sameFileSymbolId = `${norm}:${callee}`;
                if (nodes.has(sameFileSymbolId) && sameFileSymbolId !== sym.id) {
                    addEdge(sym.id, sameFileSymbolId, "calls", true);
                    continue;
                }
                // 2. Imported symbol
                const imported = localImportMap.get(callee);
                if (imported) {
                    const targetId = `${imported.targetFile}:${imported.targetSymbol}`;
                    if (nodes.has(targetId)) {
                        addEdge(sym.id, targetId, "calls", true);
                        continue;
                    }
                }
                // 3. Member expressions e.g. MathUtils.calculateSum
                if (call.memberObject && call.memberName) {
                    const importedObj = localImportMap.get(call.memberObject);
                    if (importedObj) {
                        const targetId = `${importedObj.targetFile}:${call.memberName}`;
                        if (nodes.has(targetId)) {
                            addEdge(sym.id, targetId, "calls", true);
                            continue;
                        }
                    }
                }
            }
        }
    }
    return { nodes, edges, adjacency, reachabilityAdjacency };
}
