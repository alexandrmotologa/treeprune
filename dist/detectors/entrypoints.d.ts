import { ParsedFile } from "../parser/types.js";
export interface PackageJsonConfig {
    name?: string;
    main?: string;
    module?: string;
    bin?: string | Record<string, string>;
    exports?: string | Record<string, any>;
    scripts?: Record<string, string>;
}
export interface RootDetectionOptions {
    includeTests?: boolean;
}
export declare function detectRootEntrypoints(projectRoot: string, parsedFiles: ParsedFile[], options?: RootDetectionOptions): Promise<Set<string>>;
