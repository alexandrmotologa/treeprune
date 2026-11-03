export interface PruneTarget {
    id: string;
    filePath: string;
    symbolName: string;
    kind: string;
}
export interface PruneExecutionPlan {
    modifiedFiles: Map<string, string>;
    deletedFiles: string[];
    removedDependencies: string[];
}
export declare function createPrunePlan(projectRoot: string, deadFiles: string[], deadSymbols: PruneTarget[], unusedDependencies: string[]): Promise<PruneExecutionPlan>;
export declare function removeSymbolsFromCode(code: string, symbolNames: string[], filePath: string): string;
export declare function applyPrunePlan(projectRoot: string, plan: PruneExecutionPlan): Promise<{
    modifiedCount: number;
    deletedCount: number;
}>;
