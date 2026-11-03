import { describe, expect, it } from "vitest";
import path from "node:path";
import { TreePruneEngine } from "../src/engine.js";

describe("E2E Scan and Clean Suite", () => {
  const fixtureDir = path.resolve(__dirname, "fixtures/sample_repo");

  it("should run whole-codebase static analysis against polyglot sample repository", async () => {
    const engine = new TreePruneEngine();
    const report = await engine.scan(fixtureDir);

    expect(report.summary.scannedFiles).toBeGreaterThanOrEqual(7);

    // 1. Verify dead files detection
    const normalizedDeadFiles = report.deadFiles.map((f) => f.replace(/\\/g, "/"));
    expect(normalizedDeadFiles).toContain("src/legacy/dead_module.ts");
    expect(normalizedDeadFiles).toContain("python_service/unused_service.py");

    // 2. Verify dead exports detection
    const deadSymbolNames = report.deadExports.map((e) => e.symbolName);
    expect(deadSymbolNames).toContain("unusedDeadFunction");
    expect(deadSymbolNames).toContain("DeadGoFunction");

    // 3. Verify zombie route detection
    const zombiePaths = report.zombieRoutes.map((r) => r.path);
    expect(zombiePaths).toContain("/api/orphan-route");
    // /api/users is called by frontend client, so not zombie
    expect(zombiePaths).not.toContain("/api/users");

    // 4. Verify unused dependencies detection
    const unusedDepNames = report.unusedDependencies.map((d) => d.name);
    expect(unusedDepNames).toContain("unused-heavy-library");
    expect(unusedDepNames).toContain("lodash");
    // express is used, so should not be in unused dependencies
    expect(unusedDepNames).not.toContain("express");

    // 5. Test Dry Run Prune Execution
    const pruneResult = await engine.prune(fixtureDir, report, { dryRun: true });
    expect(pruneResult.dryRun).toBe(true);
    expect(pruneResult.deletedFiles.length).toBeGreaterThanOrEqual(2);
    expect(pruneResult.removedDependencies).toContain("unused-heavy-library");
  });
});
