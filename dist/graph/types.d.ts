import { NodeRange, SupportedLanguage, SymbolKind } from "../parser/types.js";
export type NodeKind = SymbolKind | "file" | "package";
export type EdgeKind = "calls" | "imports" | "references" | "contains";
export type PruneConfidence = "high" | "medium" | "low";
export interface GraphNode {
    id: string;
    filePath: string;
    symbolName: string;
    kind: NodeKind;
    language: SupportedLanguage;
    isRoot: boolean;
    isExported: boolean;
    loc: NodeRange;
    byteSize: number;
    lineCount: number;
    reachable: boolean;
    reachabilityDistance: number;
    reachabilityPath: string[];
    confidence: PruneConfidence;
    reasons: string[];
}
export interface GraphEdge {
    from: string;
    to: string;
    kind: EdgeKind;
}
export interface ZombieRoute {
    id: string;
    method: string;
    path: string;
    filePath: string;
    framework: string;
    line: number;
    handlerName?: string;
    possibleFrontendMatches: string[];
}
export interface UnusedDependency {
    name: string;
    version: string;
    manifestFile: "package.json" | "requirements.txt" | "go.mod";
    isDev: boolean;
    uninstallCommand: string;
}
export interface AIDuplicateCluster {
    hash: string;
    name: string;
    instances: Array<{
        id: string;
        filePath: string;
        line: number;
        callersCount: number;
    }>;
}
export interface AnalysisSummary {
    scannedFiles: number;
    totalNodes: number;
    totalEdges: number;
    rootCount: number;
    reachableNodes: number;
    deadNodes: number;
    deadFilesCount: number;
    totalBytes: number;
    deadBytes: number;
    deadLines: number;
    wastedPercentage: number;
}
export interface CommentedCodeBlock {
    id: string;
    filePath: string;
    startLine: number;
    endLine: number;
    lineCount: number;
    snippet: string;
}
export interface RedundantTypeCluster {
    name: string;
    kind: "interface" | "type";
    instances: Array<{
        id: string;
        filePath: string;
        line: number;
        isExported: boolean;
    }>;
}
export interface FullAnalysisReport {
    timestamp: string;
    projectRoot: string;
    summary: AnalysisSummary;
    nodes: GraphNode[];
    edges: GraphEdge[];
    deadFiles: string[];
    deadExports: GraphNode[];
    zombieRoutes: ZombieRoute[];
    unusedDependencies: UnusedDependency[];
    aiDuplicates: AIDuplicateCluster[];
    commentedCode: CommentedCodeBlock[];
    redundantTypes: RedundantTypeCluster[];
}
