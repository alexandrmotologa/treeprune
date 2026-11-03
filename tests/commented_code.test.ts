import { describe, expect, it } from "vitest";
import { detectCommentedCode } from "../src/detectors/commented_code.js";
import { ParsedFile } from "../src/parser/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

describe("detectCommentedCode", () => {
  it("should flag consecutive commented-out code statements", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-comm-"));
    const srcDir = path.join(tmpDir, "src");
    await fs.mkdir(srcDir, { recursive: true });

    const codeWithDeadComment = `
export function activeFunction() {
  return 42;
}

// const oldCalculation = 123;
// function deprecatedHelper() {
//   const temp = oldCalculation * 2;
//   return temp;
// }

export function anotherActive() {
  return "ok";
}
`;
    const filePath = "src/example.ts";
    await fs.writeFile(path.join(tmpDir, filePath), codeWithDeadComment);

    const mockFile: ParsedFile = {
      filePath,
      language: "typescript",
      byteSize: codeWithDeadComment.length,
      lineCount: 15,
      symbols: [],
      imports: [],
      calls: [],
      routes: [],
      hasDynamicEvaluation: false,
      isTestFile: false,
    };

    try {
      const blocks = await detectCommentedCode(tmpDir, [mockFile]);
      expect(blocks.length).toBe(1);
      expect(blocks[0].filePath).toBe("src/example.ts");
      expect(blocks[0].lineCount).toBeGreaterThanOrEqual(4);
      expect(blocks[0].snippet).toContain("deprecatedHelper");
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("should not flag regular prose documentation comments", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "treeprune-comm-"));
    const srcDir = path.join(tmpDir, "src");
    await fs.mkdir(srcDir, { recursive: true });

    const docComments = `
/**
 * This is an extensive architectural explanation.
 * It describes why we choose a directed graph representation.
 * The system tracks inward and outward edges faithfully.
 * Every node has reachability indicators.
 */
export function documentedFunction() {
  return true;
}
`;
    const filePath = "src/doc.ts";
    await fs.writeFile(path.join(tmpDir, filePath), docComments);

    const mockFile: ParsedFile = {
      filePath,
      language: "typescript",
      byteSize: docComments.length,
      lineCount: 10,
      symbols: [],
      imports: [],
      calls: [],
      routes: [],
      hasDynamicEvaluation: false,
      isTestFile: false,
    };

    try {
      const blocks = await detectCommentedCode(tmpDir, [mockFile]);
      expect(blocks.length).toBe(0);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
