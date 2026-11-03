export type SupportedLanguage = "typescript" | "javascript" | "python" | "go";
export type SymbolKind = "function" | "class" | "variable" | "interface" | "type" | "route" | "method" | "component" | "export";
export interface SourceLocation {
    line: number;
    column: number;
}
export interface NodeRange {
    start: SourceLocation;
    end: SourceLocation;
}
export interface DeclaredSymbol {
    id: string;
    filePath: string;
    name: string;
    kind: SymbolKind;
    isExported: boolean;
    isDefaultExport?: boolean;
    loc: NodeRange;
    byteSize: number;
    lineCount: number;
    hash?: string;
    parentClass?: string;
}
export interface ImportSpecifier {
    importedName: string;
    localName: string;
}
export interface ImportRecord {
    source: string;
    specifiers: ImportSpecifier[];
    isDynamic?: boolean;
    loc: NodeRange;
}
export interface CallRecord {
    callee: string;
    memberObject?: string;
    memberName?: string;
    arguments: Array<string | number | boolean | null>;
    loc: NodeRange;
}
export interface RouteRecord {
    id: string;
    filePath: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ALL" | "USE";
    path: string;
    handlerName?: string;
    framework: "nextjs" | "express" | "fastify" | "fastapi" | "flask" | "gin" | "other";
    loc: NodeRange;
}
export interface ParsedFile {
    filePath: string;
    language: SupportedLanguage;
    byteSize: number;
    lineCount: number;
    symbols: DeclaredSymbol[];
    imports: ImportRecord[];
    calls: CallRecord[];
    routes: RouteRecord[];
    hasDynamicEvaluation: boolean;
    isTestFile: boolean;
}
