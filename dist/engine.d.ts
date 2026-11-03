import { FullAnalysisReport } from "./graph/index.js";
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
export declare class TreePruneEngine {
    private lastReport;
    scan(projectRoot: string, options?: EngineScanOptions): Promise<FullAnalysisReport>;
    prune(projectRoot: string, report: FullAnalysisReport, options?: EnginePruneOptions): Promise<EnginePruneResult>;
    getLastReport(): FullAnalysisReport | null;
}
