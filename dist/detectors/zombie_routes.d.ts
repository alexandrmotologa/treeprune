import { ParsedFile } from "../parser/types.js";
import { ZombieRoute } from "../graph/types.js";
export declare function normalizeRoutePattern(routePath: string): {
    regex: RegExp;
    normalized: string;
};
export declare function detectZombieRoutes(parsedFiles: ParsedFile[]): ZombieRoute[];
