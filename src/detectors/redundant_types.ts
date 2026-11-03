import { ParsedFile } from "../parser/types.js";
import { RedundantTypeCluster } from "../graph/types.js";

export function detectRedundantTypes(parsedFiles: ParsedFile[]): RedundantTypeCluster[] {
  const typeMap = new Map<string, Array<{ id: string; filePath: string; line: number; isExported: boolean; kind: "interface" | "type" }>>();

  for (const file of parsedFiles) {
    for (const sym of file.symbols) {
      if (sym.kind === "interface" || sym.kind === "type") {
        if (!typeMap.has(sym.name)) {
          typeMap.set(sym.name, []);
        }
        typeMap.get(sym.name)!.push({
          id: sym.id,
          filePath: sym.filePath,
          line: sym.loc.start.line,
          isExported: sym.isExported,
          kind: sym.kind,
        });
      }
    }
  }

  const clusters: RedundantTypeCluster[] = [];

  for (const [name, instances] of typeMap.entries()) {
    const distinctFiles = new Set(instances.map((i) => i.filePath));
    // If the same type/interface is defined in 2 or more files, flag as redundant AI duplication
    if (distinctFiles.size >= 2) {
      clusters.push({
        name,
        kind: instances[0].kind,
        instances,
      });
    }
  }

  return clusters;
}
