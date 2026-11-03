export type SupportedLanguage = "typescript" | "javascript" | "python" | "go";

export type SymbolKind =
  | "function"
  | "class"
  | "variable"
  | "interface"
  | "type"
  | "route"
  | "method"
  | "component"
  | "export";

export interface SourceLocation {
  line: number;
  column: number;
}

export interface NodeRange {
  start: SourceLocation;
  end: SourceLocation;
}

export interface DeclaredSymbol {
  id: string; // e.g., "src/math.ts:calculateSum"
  filePath: string;
  name: string;
  kind: SymbolKind;
  isExported: boolean;
  isDefaultExport?: boolean;
  loc: NodeRange;
  byteSize: number;
  lineCount: number;
  hash?: string; // Fingerprint of body for AI duplicate detection
  parentClass?: string;
}

export interface ImportSpecifier {
  importedName: string; // e.g. "calculateSum" or "default" or "*"
  localName: string;    // e.g. "sum"
}

export interface ImportRecord {
  source: string; // e.g. "./math", "fastapi", "fmt"
  specifiers: ImportSpecifier[];
  isDynamic?: boolean;
  loc: NodeRange;
}

export interface CallRecord {
  callee: string; // e.g. "calculateSum", "app.get", "fetch"
  memberObject?: string; // e.g. "app", "api", "Math"
  memberName?: string;   // e.g. "get", "fetch", "floor"
  arguments: Array<string | number | boolean | null>;
  loc: NodeRange;
}

export interface RouteRecord {
  id: string;
  filePath: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "ALL" | "USE";
  path: string; // e.g. "/api/v1/users/:id"
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
  hasDynamicEvaluation: boolean; // eval(), getattr(), dynamic import
  isTestFile: boolean;
}
