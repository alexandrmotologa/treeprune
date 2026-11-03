export interface SourceLocation {
  line: number;
  column: number;
}

export interface NodeRange {
  start: SourceLocation;
  end: SourceLocation;
}

export interface GraphNode {
  id: string;
  filePath: string;
  symbolName: string;
  kind: string;
  language: string;
  isRoot: boolean;
  isExported: boolean;
  loc: NodeRange;
  byteSize: number;
  lineCount: number;
  reachable: boolean;
  reachabilityDistance: number;
  reachabilityPath: string[];
  confidence: "high" | "medium" | "low";
  reasons: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "calls" | "imports" | "references" | "contains";
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

export interface ScanProgress {
  phase: string;
  message: string;
  current?: number;
  total?: number;
  file?: string;
}
