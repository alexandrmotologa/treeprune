export function computeReachability(graph, rootNodeIds, parsedFiles) {
    const { nodes, edges, reachabilityAdjacency } = graph;
    // Build lookup of files with dynamic eval
    const dynamicFiles = new Set();
    parsedFiles.forEach((f) => {
        if (f.hasDynamicEvaluation)
            dynamicFiles.add(f.filePath);
    });
    // Initialize queue with verified root nodes
    const queue = [];
    for (const rootId of rootNodeIds) {
        const node = nodes.get(rootId);
        if (node) {
            node.isRoot = true;
            node.reachable = true;
            node.reachabilityDistance = 0;
            node.reachabilityPath = [node.id];
            queue.push({ id: node.id, distance: 0, path: [node.id] });
        }
    }
    // BFS traversal through directed reachability edges
    while (queue.length > 0) {
        const { id, distance, path } = queue.shift();
        const neighbors = reachabilityAdjacency.get(id);
        if (!neighbors)
            continue;
        for (const neighborId of neighbors) {
            const neighbor = nodes.get(neighborId);
            if (!neighbor)
                continue;
            if (!neighbor.reachable || distance + 1 < neighbor.reachabilityDistance) {
                neighbor.reachable = true;
                neighbor.reachabilityDistance = distance + 1;
                neighbor.reachabilityPath = [...path, neighbor.id];
                queue.push({
                    id: neighbor.id,
                    distance: distance + 1,
                    path: neighbor.reachabilityPath,
                });
            }
        }
    }
    // Calculate inbound edge counts for confidence and diagnostics
    const inboundCount = new Map();
    for (const edge of edges) {
        if (edge.kind !== "contains") {
            inboundCount.set(edge.to, (inboundCount.get(edge.to) || 0) + 1);
        }
    }
    const allNodeList = Array.from(nodes.values());
    const deadExports = [];
    const deadFilesSet = new Set();
    // Flag unreachable nodes with diagnostic reasons and confidence
    for (const node of allNodeList) {
        if (!node.reachable) {
            const reasons = [];
            const inbounds = inboundCount.get(node.id) || 0;
            if (inbounds === 0) {
                reasons.push("Zero incoming references or calls");
            }
            else {
                reasons.push("Only referenced by other unreachable dead code");
            }
            if (node.isExported) {
                reasons.push("Exported symbol never reached from any application entrypoint");
                if (node.kind !== "file") {
                    deadExports.push(node);
                }
            }
            // Check dynamic evaluation safety
            if (dynamicFiles.has(node.filePath)) {
                node.confidence = "medium";
                reasons.push("File contains dynamic evaluation or reflection");
            }
            else {
                node.confidence = "high";
            }
            node.reasons = reasons;
        }
    }
    // Group by file to find completely dead files
    const fileNodes = allNodeList.filter((n) => n.kind === "file");
    for (const fileNode of fileNodes) {
        if (!fileNode.reachable) {
            // Check if all symbols inside are also unreachable
            const fileSymbols = allNodeList.filter((n) => n.filePath === fileNode.filePath && n.kind !== "file");
            const allDead = fileSymbols.every((s) => !s.reachable);
            if (allDead) {
                deadFilesSet.add(fileNode.filePath);
            }
        }
    }
    // Compute summary metrics
    let totalBytes = 0;
    let deadBytes = 0;
    let deadLines = 0;
    for (const file of parsedFiles) {
        totalBytes += file.byteSize;
        if (deadFilesSet.has(file.filePath)) {
            deadBytes += file.byteSize;
            deadLines += file.lineCount;
        }
    }
    // Add dead export bytes for files that are not completely dead
    for (const exp of deadExports) {
        if (!deadFilesSet.has(exp.filePath)) {
            deadBytes += exp.byteSize;
            deadLines += exp.lineCount;
        }
    }
    const reachableNodes = allNodeList.filter((n) => n.reachable).length;
    const deadNodes = allNodeList.length - reachableNodes;
    const wastedPercentage = totalBytes > 0 ? Number(((deadBytes / totalBytes) * 100).toFixed(1)) : 0;
    const summary = {
        scannedFiles: parsedFiles.length,
        totalNodes: allNodeList.length,
        totalEdges: edges.length,
        rootCount: rootNodeIds.size,
        reachableNodes,
        deadNodes,
        deadFilesCount: deadFilesSet.size,
        totalBytes,
        deadBytes,
        deadLines,
        wastedPercentage,
    };
    return {
        nodes: allNodeList,
        summary,
        deadFiles: Array.from(deadFilesSet),
        deadExports,
    };
}
