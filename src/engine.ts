import path from "node:path";
import { discoverAndParseFiles } from "./parser/index.js";
import { detectRootEntrypoints, detectUnusedDependencies, detectZombieRoutes, detectAIResidue } from "./detectors/index.js";
import { buildCallGraph, computeReachability, FullAnalysisReport, GraphNode } from "./graph/index.js";
import { applyPrunePlan, createGitCleanupBranch, createPrunePlan, createSnapshot, PruneTarget } from "./pruner/index.js";

export interface ScanProgressEvent {
  phase: "discovering" | "parsing" | "entrypoints" | "graph" | "reachability" | "detectors" | "complete";
  message: string;
  current?: number;
  total?: number;
  file?: string;
}

export interface EngineScanOptions {
  includeTests?: boolean;
  onProgress?: (event: ScanProgressEvent) => void;
}

export interface EnginePruneOptions {
  nodeIds?: string[];
  branchName?: string;
  createBackup?: boolean;
  dryRun?: boolean;
}

export interface EnginePruneResult {
  dryRun: boolean;
  branch?: string;
  commitHash?: string;
  modifiedFiles: string[];
  deletedFiles: string[];
  removedDependencies: string[];
  snapshotId?: string;
  totalDeadBytesSaved: number;
}

export class TreePruneEngine {
  private lastReport: FullAnalysisReport | null = null;

  async scan(
    projectRoot: string,
    options: EngineScanOptions = {}
  ): Promise<FullAnalysisReport> {
    const notify = options.onProgress || (() => {});

    notify({ phase: "discovering", message: "Discovering source files across repository..." });

    // 1. Discover and parse source files
    const parsedFiles = await discoverAndParseFiles(projectRoot, (curr, tot, file) => {
      notify({
        phase: "parsing",
        message: `Parsing source files (${curr}/${tot})`,
        current: curr,
        total: tot,
        file,
      });
    });

    // 2. Discover root architectural entry points
    notify({ phase: "entrypoints", message: "Identifying architectural entrypoints..." });
    const roots = await detectRootEntrypoints(projectRoot, parsedFiles, {
      includeTests: options.includeTests,
    });

    // 3. Build polyglot reference call graph
    notify({ phase: "graph", message: "Constructing directed call and reference graph..." });
    const graph = buildCallGraph(parsedFiles);

    // 4. Compute reachability traversal
    notify({ phase: "reachability", message: "Traversing whole-project reachability..." });
    const reachability = computeReachability(graph, roots, parsedFiles);

    // 5. Detect zombie routes, unused dependencies, and AI residue
    notify({ phase: "detectors", message: "Auditing zombie routes and dependency manifests..." });
    const zombieRoutes = detectZombieRoutes(parsedFiles);
    const unusedDeps = await detectUnusedDependencies(projectRoot, parsedFiles);
    const aiDuplicates = detectAIResidue(parsedFiles, graph);

    const report: FullAnalysisReport = {
      timestamp: new Date().toISOString(),
      projectRoot: path.resolve(projectRoot),
      summary: reachability.summary,
      nodes: reachability.nodes,
      edges: graph.edges,
      deadFiles: reachability.deadFiles,
      deadExports: reachability.deadExports,
      zombieRoutes,
      unusedDependencies: unusedDeps,
      aiDuplicates,
    };

    this.lastReport = report;
    notify({ phase: "complete", message: "Analysis complete" });
    return report;
  }

  async prune(
    projectRoot: string,
    report: FullAnalysisReport,
    options: EnginePruneOptions = {}
  ): Promise<EnginePruneResult> {
    const targetNodeIds = options.nodeIds
      ? new Set(options.nodeIds)
      : new Set(
          report.nodes.filter((n) => !n.reachable).map((n) => n.id)
        );

    // Filter dead symbols and files to prune
    const deadFilesToPrune = report.deadFiles.filter((f) => targetNodeIds.has(f));
    const deadSymbolsToPrune: PruneTarget[] = report.deadExports
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
    const plan = await createPrunePlan(
      projectRoot,
      deadFilesToPrune,
      deadSymbolsToPrune,
      unusedDepsToPrune
    );

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
    let snapshotId: string | undefined;
    if (options.createBackup !== false) {
      const filesToBackup = [...modifiedList, ...deletedList];
      if (filesToBackup.length > 0) {
        snapshotId = await createSnapshot(projectRoot, filesToBackup);
      }
    }

    // 3. Apply changes to disk
    await applyPrunePlan(projectRoot, plan);

    // 4. Create Git cleanup branch and commit
    const gitResult = await createGitCleanupBranch(projectRoot, {
      branchName: options.branchName,
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
    };
  }

  getLastReport(): FullAnalysisReport | null {
    return this.lastReport;
  }
}
