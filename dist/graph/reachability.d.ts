import { ParsedFile } from "../parser/types.js";
import { GraphBuildResult } from "./call_graph.js";
import { AnalysisSummary, GraphNode } from "./types.js";
export interface ReachabilityAnalysisResult {
    nodes: GraphNode[];
    summary: AnalysisSummary;
    deadFiles: string[];
    deadExports: GraphNode[];
}
export declare function computeReachability(graph: GraphBuildResult, rootNodeIds: Set<string>, parsedFiles: ParsedFile[]): ReachabilityAnalysisResult;
