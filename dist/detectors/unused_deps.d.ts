import { ParsedFile } from "../parser/types.js";
import { UnusedDependency } from "../graph/types.js";
export declare function detectUnusedDependencies(projectRoot: string, parsedFiles: ParsedFile[]): Promise<UnusedDependency[]>;
