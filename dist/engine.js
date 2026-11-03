import path from "node:path";
import { discoverAndParseFiles } from "./parser/index.js";
import { detectRootEntrypoints, detectUnusedDependencies, detectZombieRoutes, detectAIResidue, detectCommentedCode, detectRedundantTypes, } from "./detectors/index.js";
import { buildCallGraph, computeReachability } from "./graph/index.js";
import { applyPrunePlan, createGitCleanupBranch, createPrunePlan, createSnapshot, restoreSnapshot, verifyBuild, } from "./pruner/index.js";
import { loadConfig } from "./config/index.js";
export class TreePruneEngine {
    lastReport = null;
    projectConfig = null;
    async scan(projectRoot, options = {}) {
        const notify = options.onProgress || (() => { });
        const config = options.config || (await loadConfig(projectRoot));
        this.projectConfig = config;
        const shouldIncludeTests = options.includeTests ?? config.includeTests ?? false;
        notify({ phase: "discovering", message: "Discovering source files across repository..." });
        // 1. Discover and parse source files (with config ignore rules)
        const parsedFiles = await discoverAndParseFiles(projectRoot, (curr, tot, file) => {
            notify({
                phase: "parsing",
                message: `Parsing source files (${curr}/${tot})`,
                current: curr,
                total: tot,
                file,
            });
        }, config.ignore);
        // 2. Discover root architectural entry points (with config custom roots)
        notify({ phase: "entrypoints", message: "Identifying architectural entrypoints..." });
        const roots = await detectRootEntrypoints(projectRoot, parsedFiles, {
            includeTests: shouldIncludeTests,
            customRoots: config.customRoots,
        });
        // 3. Build polyglot reference call graph
        notify({ phase: "graph", message: "Constructing directed call and reference graph..." });
        const graph = buildCallGraph(parsedFiles);
        // 4. Compute reachability traversal
        notify({ phase: "reachability", message: "Traversing whole-project reachability..." });
        const reachability = computeReachability(graph, roots, parsedFiles);
        // 5. Apply preserveSymbols configuration rules
        if (config.preserveSymbols && config.preserveSymbols.length > 0) {
            const preservePatterns = config.preserveSymbols;
            for (const node of reachability.nodes) {
                if (!node.reachable) {
                    const isPreserved = preservePatterns.some((pattern) => {
                        if (pattern.includes("*")) {
                            const reg = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
                            return reg.test(node.symbolName) || reg.test(node.filePath);
                        }
                        return node.symbolName === pattern || node.filePath === pattern;
                    });
                    if (isPreserved) {
                        node.reachable = true;
                        node.reasons = ["Preserved by configuration rule"];
                    }
                }
            }
        }
        // Re-filter deadExports & deadFiles after preserveSymbols
        const deadExports = reachability.nodes.filter((n) => !n.reachable && n.isExported && n.kind !== "file");
        const deadFiles = reachability.deadFiles.filter((f) => {
            const fileSymbols = reachability.nodes.filter((n) => n.filePath === f && n.kind !== "file");
            return fileSymbols.every((s) => !s.reachable);
        });
        // 6. Detect zombie routes, unused dependencies, and AI residue
        notify({ phase: "detectors", message: "Auditing zombie routes and dependency manifests..." });
        const zombieRoutes = detectZombieRoutes(parsedFiles);
        const unusedDeps = await detectUnusedDependencies(projectRoot, parsedFiles);
        const aiDuplicates = detectAIResidue(parsedFiles, graph);
        const commentedCode = await detectCommentedCode(projectRoot, parsedFiles);
        const redundantTypes = detectRedundantTypes(parsedFiles);
        const report = {
            timestamp: new Date().toISOString(),
            projectRoot: path.resolve(projectRoot),
            summary: {
                ...reachability.summary,
                deadFilesCount: deadFiles.length,
                deadNodes: reachability.nodes.filter((n) => !n.reachable).length,
            },
            nodes: reachability.nodes,
            edges: graph.edges,
            deadFiles,
            deadExports,
            zombieRoutes,
            unusedDependencies: unusedDeps,
            aiDuplicates,
            commentedCode,
            redundantTypes,
        };
        this.lastReport = report;
        notify({ phase: "complete", message: "Analysis complete" });
        return report;
    }
    async prune(projectRoot, report, options = {}) {
        const config = this.projectConfig || (await loadConfig(projectRoot));
        const targetBranch = options.branchName || config.defaultBranch || "treeprune/cleanup-dead-code";
        const shouldVerify = options.verifyBuild ?? config.verifyBuild ?? false;
        const targetNodeIds = options.nodeIds
            ? new Set(options.nodeIds)
            : new Set(report.nodes.filter((n) => !n.reachable).map((n) => n.id));
        const deadFilesToPrune = report.deadFiles.filter((f) => targetNodeIds.has(f));
        const deadSymbolsToPrune = report.deadExports
            .filter((e) => targetNodeIds.has(e.id))
            .map((e) => ({
            id: e.id,
            filePath: e.filePath,
            symbolName: e.symbolName,
            kind: e.kind,
        }));
        const unusedDepsToPrune = options.nodeIds
            ? report.unusedDependencies
                .filter((d) => targetNodeIds.has(`pkg:${d.name}`))
                .map((d) => d.name)
            : report.unusedDependencies.map((d) => d.name);
        // 1. Create execution plan
        const plan = await createPrunePlan(projectRoot, deadFilesToPrune, deadSymbolsToPrune, unusedDepsToPrune);
        const modifiedList = Array.from(plan.modifiedFiles.keys());
        const deletedList = plan.deletedFiles;
        let totalSaved = 0;
        for (const f of report.nodes.filter((n) => targetNodeIds.has(n.id))) {
            totalSaved += f.byteSize;
        }
        if (options.dryRun) {
            return {
                dryRun: true,
                modifiedFiles: modifiedList,
                deletedFiles: deletedList,
                removedDependencies: plan.removedDependencies,
                totalDeadBytesSaved: totalSaved,
            };
        }
        // 2. Create rollback snapshot backup
        let snapshotId;
        if (options.createBackup !== false) {
            const filesToBackup = [...modifiedList, ...deletedList];
            if (filesToBackup.length > 0) {
                snapshotId = await createSnapshot(projectRoot, filesToBackup);
            }
        }
        // 3. Apply changes to disk
        await applyPrunePlan(projectRoot, plan);
        // 4. Verify build if enabled
        let verifiedCompiler;
        if (shouldVerify) {
            const verResult = await verifyBuild(projectRoot, modifiedList);
            if (!verResult.success) {
                // Rollback to snapshot if verification breaks
                if (snapshotId) {
                    await restoreSnapshot(projectRoot, snapshotId);
                }
                throw new Error(`Prune verification failed with ${verResult.compiler}. Changes have been rolled back automatically:\n${verResult.error}`);
            }
            verifiedCompiler = verResult.compiler;
        }
        // 5. Create Git cleanup branch and commit
        const gitResult = await createGitCleanupBranch(projectRoot, {
            branchName: targetBranch,
            modifiedFiles: modifiedList,
            deletedFiles: deletedList,
            deadBytes: totalSaved,
        });
        return {
            dryRun: false,
            branch: gitResult.branch,
            commitHash: gitResult.commitHash,
            modifiedFiles: modifiedList,
            deletedFiles: deletedList,
            removedDependencies: plan.removedDependencies,
            snapshotId,
            totalDeadBytesSaved: totalSaved,
            verifiedCompiler,
        };
    }
    getLastReport() {
        return this.lastReport;
    }
}
