import { ParsedFile, SupportedLanguage } from "./types.js";
export * from "./types.js";
export { parseTypeScript } from "./typescript_parser.js";
export { parsePython } from "./python_parser.js";
export { parseGo } from "./go_parser.js";
export declare function detectLanguage(filePath: string): SupportedLanguage | null;
export declare function parseSourceFile(fullPath: string, relativePath: string): Promise<ParsedFile | null>;
export declare function discoverAndParseFiles(targetDir: string, onProgress?: (current: number, total: number, file: string) => void): Promise<ParsedFile[]>;
