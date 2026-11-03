export interface TreePruneConfig {
  ignore?: string[];
  customRoots?: string[];
  preserveSymbols?: string[];
  thresholdKb?: number;
  failOnZombie?: boolean;
  includeTests?: boolean;
  verifyBuild?: boolean;
  defaultBranch?: string;
  editor?: "vscode" | "cursor";
}

export const DEFAULT_CONFIG: TreePruneConfig = {
  ignore: [],
  customRoots: [],
  preserveSymbols: [],
  thresholdKb: 0,
  failOnZombie: false,
  includeTests: false,
  verifyBuild: false,
  defaultBranch: "treeprune/cleanup-dead-code",
  editor: "cursor",
};
