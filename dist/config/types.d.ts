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
export declare const DEFAULT_CONFIG: TreePruneConfig;
