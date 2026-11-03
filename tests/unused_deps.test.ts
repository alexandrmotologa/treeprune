import { describe, expect, it } from "vitest";
import { detectUnusedDependencies } from "../src/detectors/unused_deps.js";
import { ParsedFile } from "../src/parser/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("detectUnusedDependencies", () => {
  it("should flag packages declared in package.json but not imported in source files", async () => {
    // Create temporary directory with mock package.json
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-test-"));
    const pkgJson = {
      dependencies: {
        "lodash": "^4.17.21",
        "chalk": "^5.0.0",
        "axios": "^1.7.0",
      },
    };
    await fs.writeFile(path.join(tmpDir, "package.json"), JSON.stringify(pkgJson, null, 2));

    // Mock parsed files importing only lodash
    const mockFiles: ParsedFile[] = [
      {
        filePath: "src/app.ts",
        language: "typescript",
        byteSize: 100,
        lineCount: 10,
        symbols: [],
        imports: [
          {
            source: "lodash",
            specifiers: [{ importedName: "merge", localName: "merge" }],
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
          },
        ],
        calls: [],
        routes: [],
        hasDynamicEvaluation: false,
        isTestFile: false,
      },
    ];

    const unused = await detectUnusedDependencies(tmpDir, mockFiles);
    const names = unused.map((u) => u.name);

    expect(names).toContain("chalk");
    expect(names).toContain("axios");
    expect(names).not.toContain("lodash");

    // Cleanup
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
