import { describe, expect, it } from "vitest";
import { removeSymbolsFromCode } from "../src/pruner/safe_remover.js";
import { createSnapshot, listSnapshots, restoreSnapshot } from "../src/pruner/backup.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("Safe AST Remover", () => {
  it("should cleanly remove target function while preserving surrounding code and comments", () => {
    const original = `
      // Math utility functions
      export function keepMe(a: number): number {
        return a * 2;
      }

      // This is dead code to remove
      export function pruneMe(): string {
        return "delete me";
      }

      export const GREETING = "hello";
    `;

    const cleaned = removeSymbolsFromCode(original, ["pruneMe"], "src/math.ts");

    expect(cleaned).toContain("keepMe");
    expect(cleaned).toContain("GREETING");
    expect(cleaned).not.toContain("pruneMe");
    expect(cleaned).toContain("// Math utility functions");
  });

  it("should prune specific named export specifiers", () => {
    const original = `
      const a = 1;
      const b = 2;
      export { a, b };
    `;

    const cleaned = removeSymbolsFromCode(original, ["b"], "src/module.ts");

    expect(cleaned).toContain("a");
    expect(cleaned).not.toContain("b");
  });
});

describe("Backup and Rollback Manager", () => {
  it("should create a snapshot and restore file state", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-snap-"));
    const filePath = "src/example.ts";
    const fullPath = path.join(tmpDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, "original content", "utf8");

    // 1. Create snapshot
    const snapId = await createSnapshot(tmpDir, [filePath]);
    expect(snapId).toBeDefined();

    const snapshots = await listSnapshots(tmpDir);
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].files).toContain(filePath);

    // 2. Modify file
    await fs.writeFile(fullPath, "mutated content", "utf8");
    expect(await fs.readFile(fullPath, "utf8")).toBe("mutated content");

    // 3. Restore snapshot
    const { restoredCount } = await restoreSnapshot(tmpDir, snapId);
    expect(restoredCount).toBe(1);
    expect(await fs.readFile(fullPath, "utf8")).toBe("original content");

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
