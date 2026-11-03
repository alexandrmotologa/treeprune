import { ParsedFile } from "../parser/types.js";
import { GraphEdge, GraphNode } from "./types.js";
export interface GraphBuildResult {
    nodes: Map<string, GraphNode>;
    edges: GraphEdge[];
    adjacency: Map<string, Set<string>>;
    reachabilityAdjacency: Map<string, Set<string>>;
}
export declare function buildCallGraph(parsedFiles: ParsedFile[]): GraphBuildResult;
