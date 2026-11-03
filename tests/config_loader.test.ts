import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/loader.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("loadConfig", () => {
  it("should return default config if no config file or package.json entry exists", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-cfg-"));
    try {
      const config = await loadConfig(tmpDir);
      expect(config.thresholdKb).toBe(0);
      expect(config.verifyBuild).toBe(false);
      expect(config.failOnZombie).toBe(false);
      expect(config.editor).toBe("cursor");
      expect(config.defaultBranch).toBe("treeprune/cleanup-dead-code");
      expect(config.ignore).toEqual([]);
      expect(config.preserveSymbols).toEqual([]);
      expect(config.customRoots).toEqual([]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("should load configuration from treeprune.config.json and merge arrays", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-cfg-"));
    try {
      const customConfig = {
        verifyBuild: true,
        thresholdKb: 50,
        preserveSymbols: ["preservedHandler"],
        customRoots: ["src/special_main.ts"],
        ignore: ["**/custom_vendor/**"],
      };
      await fs.writeFile(
        path.join(tmpDir, "treeprune.config.json"),
        JSON.stringify(customConfig, null, 2)
      );

      const config = await loadConfig(tmpDir);
      expect(config.verifyBuild).toBe(true);
      expect(config.thresholdKb).toBe(50);
      expect(config.preserveSymbols).toContain("preservedHandler");
      expect(config.customRoots).toContain("src/special_main.ts");
      expect(config.ignore).toContain("**/custom_vendor/**");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("should load configuration from package.json if dedicated config file is absent", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-cfg-"));
    try {
      const pkg = {
        name: "test-project",
        treeprune: {
          verifyBuild: true,
          preserveSymbols: ["globalInit"],
        },
      };
      await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify(pkg, null, 2));

      const config = await loadConfig(tmpDir);
      expect(config.verifyBuild).toBe(true);
      expect(config.preserveSymbols).toContain("globalInit");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
