import { FullAnalysisReport } from "./graph/index.js";
import { TreePruneConfig } from "./config/index.js";
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
    config?: TreePruneConfig;
}
export interface EnginePruneOptions {
    nodeIds?: string[];
    branchName?: string;
    createBackup?: boolean;
    verifyBuild?: boolean;
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
    verifiedCompiler?: string;
}
export declare class TreePruneEngine {
    private lastReport;
    private projectConfig;
    scan(projectRoot: string, options?: EngineScanOptions): Promise<FullAnalysisReport>;
    prune(projectRoot: string, report: FullAnalysisReport, options?: EnginePruneOptions): Promise<EnginePruneResult>;
    getLastReport(): FullAnalysisReport | null;
}
