import { describe, expect, it } from "vitest";
import { detectRedundantTypes } from "../src/detectors/redundant_types.js";
import { ParsedFile } from "../src/parser/types.js";

describe("detectRedundantTypes", () => {
  it("should cluster identical type names defined across separate files", () => {
    const mockFiles: ParsedFile[] = [
      {
        filePath: "src/user.ts",
        language: "typescript",
        byteSize: 100,
        lineCount: 10,
        symbols: [
          {
            id: "src/user.ts:UserData",
            name: "UserData",
            kind: "interface",
            isExported: true,
            loc: { start: { line: 1, column: 0 }, end: { line: 5, column: 1 } },
            filePath: "src/user.ts",
          },
        ],
        imports: [],
        calls: [],
        routes: [],
        hasDynamicEvaluation: false,
        isTestFile: false,
      },
      {
        filePath: "src/legacy/types.ts",
        language: "typescript",
        byteSize: 100,
        lineCount: 10,
        symbols: [
          {
            id: "src/legacy/types.ts:UserData",
            name: "UserData",
            kind: "type",
            isExported: true,
            loc: { start: { line: 10, column: 0 }, end: { line: 15, column: 1 } },
            filePath: "src/legacy/types.ts",
          },
        ],
        imports: [],
        calls: [],
        routes: [],
        hasDynamicEvaluation: false,
        isTestFile: false,
      },
      {
        filePath: "src/unique.ts",
        language: "typescript",
        byteSize: 50,
        lineCount: 5,
        symbols: [
          {
            id: "src/unique.ts:UniqueConfig",
            name: "UniqueConfig",
            kind: "interface",
            isExported: true,
            loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
            filePath: "src/unique.ts",
          },
        ],
        imports: [],
        calls: [],
        routes: [],
        hasDynamicEvaluation: false,
        isTestFile: false,
      },
    ];

    const clusters = detectRedundantTypes(mockFiles);
    expect(clusters.length).toBe(1);
    expect(clusters[0].name).toBe("UserData");
    expect(clusters[0].instances.length).toBe(2);
    expect(clusters[0].instances[0].filePath).toBe("src/user.ts");
    expect(clusters[0].instances[1].filePath).toBe("src/legacy/types.ts");
  });
});
