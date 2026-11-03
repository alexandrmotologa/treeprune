export interface BuildVerificationResult {
    success: boolean;
    compiler: string;
    output?: string;
    error?: string;
}
export declare function verifyBuild(projectRoot: string, modifiedFiles: string[]): Promise<BuildVerificationResult>;
