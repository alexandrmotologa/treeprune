import { NodeRange, SupportedLanguage, SymbolKind } from "../parser/types.js";

export type NodeKind = SymbolKind | "file" | "package";

export type EdgeKind = "calls" | "imports" | "references" | "contains";

export type PruneConfidence = "high" | "medium" | "low";

export interface GraphNode {
  id: string; // e.g. "src/math.ts:calculateSum" or "src/math.ts"
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
  reachabilityDistance: number; // -1 if dead
  reachabilityPath: string[];   // ids leading from root to here
  confidence: PruneConfidence;
  reasons: string[];
}

export interface GraphEdge {
  from: string; // source node id
  to: string;   // target node id
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
}
