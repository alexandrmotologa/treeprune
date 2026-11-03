import { describe, expect, it } from "vitest";
import { verifyBuild } from "../src/pruner/build_verifier.js";
import path from "node:path";

describe("verifyBuild", () => {
  it("should return success: true and compiler: 'tsc' when executed on treeprune repository itself", async () => {
    const projectRoot = path.resolve(".");
    const res = await verifyBuild(projectRoot, ["src/engine.ts"]);
    // Should succeed or if it fails due to ENOENT npx, we check
    expect(res.compiler).toBe("tsc");
    expect(res.success).toBe(true);
  }, 30000);

  it("should return compiler: 'none' when neither tsconfig, go.mod nor python files exist", async () => {
    const tmpDir = path.resolve("./tests/fixtures");
    const res = await verifyBuild(tmpDir, []);
    expect(res.compiler).toBe("none");
    expect(res.success).toBe(true);
  });
});
