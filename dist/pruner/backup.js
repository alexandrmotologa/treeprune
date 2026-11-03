import fs from "node:fs/promises";
import path from "node:path";
export async function createSnapshot(projectRoot, filesToBackup) {
    const snapshotId = `snapshot-${Date.now()}`;
    const snapshotDir = path.join(projectRoot, ".treeprune", "snapshots", snapshotId);
    await fs.mkdir(snapshotDir, { recursive: true });
    const backedUpFiles = [];
    for (const relPath of filesToBackup) {
        const srcPath = path.join(projectRoot, relPath);
        try {
            const stat = await fs.stat(srcPath);
            if (stat.isFile()) {
                const destPath = path.join(snapshotDir, relPath);
                await fs.mkdir(path.dirname(destPath), { recursive: true });
                await fs.copyFile(srcPath, destPath);
                backedUpFiles.push(relPath);
            }
        }
        catch {
            // File may not exist or cannot be accessed
        }
    }
    const meta = {
        id: snapshotId,
        timestamp: new Date().toISOString(),
        files: backedUpFiles,
    };
    await fs.writeFile(path.join(snapshotDir, "meta.json"), JSON.stringify(meta, null, 2), "utf8");
    return snapshotId;
}
export async function listSnapshots(projectRoot) {
    const snapshotsRoot = path.join(projectRoot, ".treeprune", "snapshots");
    try {
        const entries = await fs.readdir(snapshotsRoot, { withFileTypes: true });
        const snapshots = [];
        for (const ent of entries) {
            if (ent.isDirectory()) {
                try {
                    const metaRaw = await fs.readFile(path.join(snapshotsRoot, ent.name, "meta.json"), "utf8");
                    snapshots.push(JSON.parse(metaRaw));
                }
                catch {
                    // Ignore invalid snapshot folder
                }
            }
        }
        return snapshots.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    catch {
        return [];
    }
}
export async function restoreSnapshot(projectRoot, snapshotId) {
    const snapshots = await listSnapshots(projectRoot);
    if (snapshots.length === 0) {
        throw new Error("No rollback snapshots found in .treeprune/snapshots");
    }
    const targetSnapshot = snapshotId
        ? snapshots.find((s) => s.id === snapshotId)
        : snapshots[0];
    if (!targetSnapshot) {
        throw new Error(`Snapshot with id "${snapshotId}" was not found`);
    }
    const snapshotDir = path.join(projectRoot, ".treeprune", "snapshots", targetSnapshot.id);
    let restoredCount = 0;
    for (const relPath of targetSnapshot.files) {
        const srcPath = path.join(snapshotDir, relPath);
        const destPath = path.join(projectRoot, relPath);
        try {
            await fs.mkdir(path.dirname(destPath), { recursive: true });
            await fs.copyFile(srcPath, destPath);
            restoredCount++;
        }
        catch (err) {
            // Skip failed file restore
        }
    }
    return { restoredCount, snapshotId: targetSnapshot.id };
}
