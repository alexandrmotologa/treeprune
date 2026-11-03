import { ParsedFile } from "../parser/types.js";
import { RedundantTypeCluster } from "../graph/types.js";
export declare function detectRedundantTypes(parsedFiles: ParsedFile[]): RedundantTypeCluster[];
