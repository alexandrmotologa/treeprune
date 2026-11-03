import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG, TreePruneConfig } from "./types.js";

const CONFIG_FILENAMES = [
  "treeprune.config.json",
  ".treeprunerc.json",
  ".treeprunerc",
];

export async function loadConfig(projectRoot: string): Promise<TreePruneConfig> {
  let fileConfig: Partial<TreePruneConfig> = {};

  // 1. Check dedicated config files
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(projectRoot, filename);
    try {
      const raw = await fs.readFile(configPath, "utf8");
      fileConfig = JSON.parse(raw);
      break;
    } catch {
      // Continue search
    }
  }

  // 2. Check package.json "treeprune" property if not found
  if (Object.keys(fileConfig).length === 0) {
    try {
      const pkgPath = path.join(projectRoot, "package.json");
      const rawPkg = await fs.readFile(pkgPath, "utf8");
      const pkg = JSON.parse(rawPkg);
      if (pkg.treeprune && typeof pkg.treeprune === "object") {
        fileConfig = pkg.treeprune;
      }
    } catch {
      // No package.json
    }
  }

  return {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ignore: [...(DEFAULT_CONFIG.ignore || []), ...(fileConfig.ignore || [])],
    customRoots: [...(DEFAULT_CONFIG.customRoots || []), ...(fileConfig.customRoots || [])],
    preserveSymbols: [
      ...(DEFAULT_CONFIG.preserveSymbols || []),
      ...(fileConfig.preserveSymbols || []),
    ],
  };
}
