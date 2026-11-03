import { ParsedFile } from "../parser/types.js";
import { AIDuplicateCluster, GraphBuildResult } from "../graph/index.js";
export declare function detectAIResidue(parsedFiles: ParsedFile[], graph: GraphBuildResult): AIDuplicateCluster[];
