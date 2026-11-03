export interface GitPatchOptions {
    branchName?: string;
    commitMessage?: string;
    modifiedFiles: string[];
    deletedFiles: string[];
    deadBytes: number;
}
export interface GitPatchResult {
    success: boolean;
    branch: string;
    commitHash?: string;
    isGitRepo: boolean;
    error?: string;
}
export declare function createGitCleanupBranch(projectRoot: string, options: GitPatchOptions): Promise<GitPatchResult>;
