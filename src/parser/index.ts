import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { ParsedFile, SupportedLanguage } from "./types.js";
import { parseTypeScript } from "./typescript_parser.js";
import { parsePython } from "./python_parser.js";
import { parseGo } from "./go_parser.js";

export * from "./types.js";
export { parseTypeScript } from "./typescript_parser.js";
export { parsePython } from "./python_parser.js";
export { parseGo } from "./go_parser.js";

const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.treeprune/**",
  "**/coverage/**",
  "**/vendor/**",
  "**/__pycache__/**",
  "**/.venv/**",
  "**/venv/**",
];

export function detectLanguage(filePath: string): SupportedLanguage | null {
  const ext = path.extname(filePath).toLowerCase();
  if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) return "typescript";
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "javascript";
  if (ext === ".py") return "python";
  if (ext === ".go") return "go";
  return null;
}

export async function parseSourceFile(
  fullPath: string,
  relativePath: string
): Promise<ParsedFile | null> {
  const lang = detectLanguage(relativePath);
  if (!lang) return null;

  try {
    const code = await fs.readFile(fullPath, "utf8");
    const normalized = relativePath.replace(/\\/g, "/");

    if (lang === "typescript" || lang === "javascript") {
      return parseTypeScript(code, relativePath, normalized);
    }
    if (lang === "python") {
      return parsePython(code, relativePath, normalized);
    }
    if (lang === "go") {
      return parseGo(code, relativePath, normalized);
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function discoverAndParseFiles(
  targetDir: string,
  onProgress?: (current: number, total: number, file: string) => void
): Promise<ParsedFile[]> {
  const patterns = [
    "**/*.{ts,tsx,js,jsx,mjs,cjs}",
    "**/*.py",
    "**/*.go",
  ];

  const matched = await fg(patterns, {
    cwd: targetDir,
    ignore: DEFAULT_IGNORE,
    dot: false,
    absolute: false,
  });

  const parsedFiles: ParsedFile[] = [];
  const total = matched.length;

  for (let i = 0; i < total; i++) {
    const rel = matched[i];
    const abs = path.join(targetDir, rel);
    if (onProgress) {
      onProgress(i + 1, total, rel);
    }
    const parsed = await parseSourceFile(abs, rel);
    if (parsed) {
      parsedFiles.push(parsed);
    }
  }

  return parsedFiles;
}
