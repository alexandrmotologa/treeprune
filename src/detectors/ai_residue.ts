import { ParsedFile } from "../parser/types.js";
import { AIDuplicateCluster, GraphBuildResult } from "../graph/index.js";

export function detectAIResidue(
  parsedFiles: ParsedFile[],
  graph: GraphBuildResult
): AIDuplicateCluster[] {
  // Group functions by body hash
  const hashMap = new Map<
    string,
    Array<{
      id: string;
      name: string;
      filePath: string;
      line: number;
      callersCount: number;
    }>
  >();

  for (const file of parsedFiles) {
    for (const sym of file.symbols) {
      if (sym.kind === "function" && sym.hash && sym.lineCount >= 2) {
        const inboundEdges = graph.edges.filter(
          (e) => e.to === sym.id && e.kind === "calls"
        ).length;

        if (!hashMap.has(sym.hash)) {
          hashMap.set(sym.hash, []);
        }

        hashMap.get(sym.hash)!.push({
          id: sym.id,
          name: sym.name,
          filePath: sym.filePath,
          line: sym.loc.start.line,
          callersCount: inboundEdges,
        });
      }
    }
  }

  const clusters: AIDuplicateCluster[] = [];

  for (const [hash, instances] of hashMap.entries()) {
    // If identical function exists in 2 or more different files, flag as duplicate AI residue!
    const distinctFiles = new Set(instances.map((i) => i.filePath));
    if (distinctFiles.size >= 2) {
      clusters.push({
        hash,
        name: instances[0].name,
        instances,
      });
    }
  }

  return clusters;
}
