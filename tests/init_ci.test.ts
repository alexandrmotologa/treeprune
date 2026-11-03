import { describe, expect, it } from "vitest";
import { generateGitHubWorkflow } from "../src/cli/init_ci.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("init-ci", () => {
  it("should create .github/workflows/treeprune-audit.yml with SARIF upload step", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-ci-"));
    try {
      const generatedPath = await generateGitHubWorkflow(tmpDir);
      expect(generatedPath).toContain("treeprune-audit.yml");

      const exists = await fs.stat(generatedPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(generatedPath, "utf8");
      expect(content).toContain("name: TreePrune Dead Code & Zombie Route Audit");
      expect(content).toContain("treeprune scan --format sarif");
      expect(content).toContain("upload-sarif@v3");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
