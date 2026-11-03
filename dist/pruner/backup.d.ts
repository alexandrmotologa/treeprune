export interface SnapshotMeta {
    id: string;
    timestamp: string;
    files: string[];
}
export declare function createSnapshot(projectRoot: string, filesToBackup: string[]): Promise<string>;
export declare function listSnapshots(projectRoot: string): Promise<SnapshotMeta[]>;
export declare function restoreSnapshot(projectRoot: string, snapshotId?: string): Promise<{
    restoredCount: number;
    snapshotId: string;
}>;
