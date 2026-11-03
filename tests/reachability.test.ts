import { describe, expect, it } from "vitest";
import { parseTypeScript } from "../src/parser/typescript_parser.js";
import { buildCallGraph } from "../src/graph/call_graph.js";
import { computeReachability } from "../src/graph/reachability.js";
import { ParsedFile } from "../src/parser/types.js";

describe("Reachability Engine", () => {
  it("should trace reachability from root and identify dead functions and files", () => {
    // 1. Entry point file (e.g. Next.js page)
    const pageCode = `
      import { add } from '../utils/math';

      export default function HomePage() {
        const result = add(2, 3);
        return null;
      }
    `;

    // 2. Utility file with one used function and one orphan
    const mathCode = `
      export function add(a: number, b: number): number {
        return a + b;
      }

      export function unusedSubtract(a: number, b: number): number {
        return a - b;
      }
    `;

    // 3. Completely isolated dead file
    const deadCode = `
      export function abandonedHelper() {
        return "I am never called";
      }
    `;

    const f1 = parseTypeScript(pageCode, "app/page.tsx", "app/page.tsx");
    const f2 = parseTypeScript(mathCode, "utils/math.ts", "utils/math.ts");
    const f3 = parseTypeScript(deadCode, "legacy/deprecated.ts", "legacy/deprecated.ts");

    const parsedFiles: ParsedFile[] = [f1, f2, f3];
    const graph = buildCallGraph(parsedFiles);

    // Entrypoint root: app/page.tsx:HomePage
    const roots = new Set<string>(["app/page.tsx", "app/page.tsx:HomePage"]);

    const result = computeReachability(graph, roots, parsedFiles);

    const addNode = result.nodes.find((n) => n.id === "utils/math.ts:add");
    const subNode = result.nodes.find((n) => n.id === "utils/math.ts:unusedSubtract");
    const deadHelper = result.nodes.find((n) => n.id === "legacy/deprecated.ts:abandonedHelper");

    // add should be reached
    expect(addNode?.reachable).toBe(true);

    // unusedSubtract should be dead
    expect(subNode?.reachable).toBe(false);
    expect(subNode?.confidence).toBe("high");

    // abandonedHelper should be dead
    expect(deadHelper?.reachable).toBe(false);

    // legacy/deprecated.ts should be flagged as dead file
    expect(result.deadFiles).toContain("legacy/deprecated.ts");
    expect(result.summary.deadFilesCount).toBe(1);
    expect(result.deadExports.map((e) => e.symbolName)).toContain("unusedSubtract");
  });
});
