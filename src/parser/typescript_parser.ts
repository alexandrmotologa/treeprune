import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import * as t from "@babel/types";
import {
  CallRecord,
  DeclaredSymbol,
  ImportRecord,
  ImportSpecifier,
  NodeRange,
  ParsedFile,
  RouteRecord,
  SymbolKind,
} from "./types.js";
import { createHash } from "node:crypto";

// Handle default/named export interoperability for @babel/traverse
const traverse = (traverseModule as any).default || traverseModule;

function getNodeRange(node: { loc?: { start: { line: number; column: number }; end: { line: number; column: number } } | null }): NodeRange {
  if (node.loc) {
    return {
      start: { line: node.loc.start.line, column: node.loc.start.column },
      end: { line: node.loc.end.line, column: node.loc.end.column },
    };
  }
  return {
    start: { line: 1, column: 0 },
    end: { line: 1, column: 0 },
  };
}

function computeBodyHash(codeSnippet: string): string {
  // Normalize whitespace to generate consistent fingerprints for AI clone detection
  const normalized = codeSnippet.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

export function parseTypeScript(
  code: string,
  filePath: string,
  normalizedPath: string
): ParsedFile {
  const isJSX = filePath.endsWith(".tsx") || filePath.endsWith(".jsx");
  const isTS = filePath.endsWith(".ts") || filePath.endsWith(".tsx");

  const lines = code.split("\n");
  const lineCount = lines.length;
  const byteSize = Buffer.byteLength(code, "utf8");

  const symbols: DeclaredSymbol[] = [];
  const imports: ImportRecord[] = [];
  const calls: CallRecord[] = [];
  const routes: RouteRecord[] = [];
  let hasDynamicEvaluation = false;

  const isTestFile =
    /(?:^|[\\/])(?:__tests__|tests|test)[\\/]/.test(filePath) ||
    /\.(?:test|spec)\.[a-z]+$/.test(filePath);

  let ast: any;
  try {
    ast = parse(code, {
      sourceType: "module",
      plugins: [
        "typescript",
        "jsx",
        ["decorators", { decoratorsBeforeExport: true }],
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "exportDefaultFrom",
        "exportNamespaceFrom",
        "topLevelAwait",
        "dynamicImport",
      ],
      tokens: true,
      errorRecovery: true,
    });
  } catch {
    // If TypeScript plugin fails, attempt fallback without TypeScript
    try {
      ast = parse(code, {
        sourceType: "module",
        plugins: ["jsx", "topLevelAwait", "dynamicImport"],
        errorRecovery: true,
      });
    } catch {
      return {
        filePath: normalizedPath,
        language: isTS ? "typescript" : "javascript",
        byteSize,
        lineCount,
        symbols,
        imports,
        calls,
        routes,
        hasDynamicEvaluation: false,
        isTestFile,
      };
    }
  }

  // Next.js App Router route.ts detection
  const isNextAppRouteFile =
    /[\\/]app[\\/].*route\.(?:ts|js)$/.test(filePath) ||
    /^app[\\/].*route\.(?:ts|js)$/.test(filePath);

  traverse(ast, {
    // 1. Imports
    ImportDeclaration(path: any) {
      const source = path.node.source.value;
      const specifiers: ImportSpecifier[] = [];

      for (const spec of path.node.specifiers) {
        if (t.isImportSpecifier(spec)) {
          const importedName = t.isIdentifier(spec.imported)
            ? spec.imported.name
            : (spec.imported as any).value;
          specifiers.push({
            importedName,
            localName: spec.local.name,
          });
        } else if (t.isImportDefaultSpecifier(spec)) {
          specifiers.push({
            importedName: "default",
            localName: spec.local.name,
          });
        } else if (t.isImportNamespaceSpecifier(spec)) {
          specifiers.push({
            importedName: "*",
            localName: spec.local.name,
          });
        }
      }

      imports.push({
        source,
        specifiers,
        isDynamic: false,
        loc: getNodeRange(path.node),
      });
    },

    // 2. Export declarations
    ExportNamedDeclaration(path: any) {
      const isExported = true;
      const range = getNodeRange(path.node);

      if (path.node.declaration) {
        const decl = path.node.declaration;
        if (t.isFunctionDeclaration(decl) && decl.id) {
          const name = decl.id.name;
          const snippet = code.slice(decl.start || 0, decl.end || 0);
          symbols.push({
            id: `${normalizedPath}:${name}`,
            filePath: normalizedPath,
            name,
            kind: "function",
            isExported,
            loc: getNodeRange(decl),
            byteSize: Buffer.byteLength(snippet, "utf8"),
            lineCount: (decl.loc?.end.line ?? 1) - (decl.loc?.start.line ?? 1) + 1,
            hash: computeBodyHash(snippet),
          });

          // Check for Next.js HTTP route handlers (GET, POST, PUT, DELETE, PATCH)
          if (isNextAppRouteFile && ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"].includes(name)) {
            // Path extracted from file directory structure
            const routePath = filePath
              .replace(/^[\\/]?.*app/, "")
              .replace(/[\\/]route\.(?:ts|js)$/, "")
              .replace(/\\/g, "/")
              .replace(/\[\.\.\.([^\]]+)\]/g, "*$1")
              .replace(/\[([^\]]+)\]/g, ":$1") || "/";

            routes.push({
              id: `${normalizedPath}:${name}`,
              filePath: normalizedPath,
              method: name as any,
              path: routePath,
              handlerName: name,
              framework: "nextjs",
              loc: getNodeRange(decl),
            });
          }
        } else if (t.isVariableDeclaration(decl)) {
          for (const declarator of decl.declarations) {
            if (t.isIdentifier(declarator.id)) {
              const name = declarator.id.name;
              const kind: SymbolKind =
                t.isArrowFunctionExpression(declarator.init) ||
                t.isFunctionExpression(declarator.init)
                  ? "function"
                  : "variable";
              const snippet = code.slice(declarator.start || 0, declarator.end || 0);

              symbols.push({
                id: `${normalizedPath}:${name}`,
                filePath: normalizedPath,
                name,
                kind,
                isExported,
                loc: getNodeRange(declarator),
                byteSize: Buffer.byteLength(snippet, "utf8"),
                lineCount: (declarator.loc?.end.line ?? 1) - (declarator.loc?.start.line ?? 1) + 1,
                hash: computeBodyHash(snippet),
              });
            }
          }
        } else if (t.isClassDeclaration(decl) && decl.id) {
          const name = decl.id.name;
          const snippet = code.slice(decl.start || 0, decl.end || 0);
          symbols.push({
            id: `${normalizedPath}:${name}`,
            filePath: normalizedPath,
            name,
            kind: "class",
            isExported,
            loc: getNodeRange(decl),
            byteSize: Buffer.byteLength(snippet, "utf8"),
            lineCount: (decl.loc?.end.line ?? 1) - (decl.loc?.start.line ?? 1) + 1,
          });
        } else if (t.isTSInterfaceDeclaration(decl)) {
          symbols.push({
            id: `${normalizedPath}:${decl.id.name}`,
            filePath: normalizedPath,
            name: decl.id.name,
            kind: "interface",
            isExported,
            loc: getNodeRange(decl),
            byteSize: 0,
            lineCount: (decl.loc?.end.line ?? 1) - (decl.loc?.start.line ?? 1) + 1,
          });
        } else if (t.isTSTypeAliasDeclaration(decl)) {
          symbols.push({
            id: `${normalizedPath}:${decl.id.name}`,
            filePath: normalizedPath,
            name: decl.id.name,
            kind: "type",
            isExported,
            loc: getNodeRange(decl),
            byteSize: 0,
            lineCount: (decl.loc?.end.line ?? 1) - (decl.loc?.start.line ?? 1) + 1,
          });
        }
      }

      // Re-exports or named specifiers: export { a, b as c } from './other'
      if (path.node.specifiers && path.node.specifiers.length > 0) {
        const source = path.node.source?.value;
        if (source) {
          imports.push({
            source,
            specifiers: path.node.specifiers.map((s: any) => ({
              importedName: s.local ? s.local.name : s.exported.name,
              localName: s.exported.name,
            })),
            loc: range,
          });
        }
        for (const spec of path.node.specifiers) {
          if (t.isExportSpecifier(spec)) {
            const exportedName = t.isIdentifier(spec.exported)
              ? spec.exported.name
              : (spec.exported as any).value;
            symbols.push({
              id: `${normalizedPath}:${exportedName}`,
              filePath: normalizedPath,
              name: exportedName,
              kind: "export",
              isExported: true,
              loc: range,
              byteSize: 50,
              lineCount: 1,
            });
          }
        }
      }
    },

    ExportDefaultDeclaration(path: any) {
      const decl = path.node.declaration;
      let name = "default";
      let kind: SymbolKind = "function";

      if (t.isFunctionDeclaration(decl) && decl.id) {
        name = decl.id.name;
      } else if (t.isClassDeclaration(decl) && decl.id) {
        name = decl.id.name;
        kind = "class";
      } else if (t.isIdentifier(decl)) {
        name = decl.name;
      }

      const snippet = code.slice(path.node.start || 0, path.node.end || 0);
      symbols.push({
        id: `${normalizedPath}:${name}`,
        filePath: normalizedPath,
        name,
        kind,
        isExported: true,
        isDefaultExport: true,
        loc: getNodeRange(path.node),
        byteSize: Buffer.byteLength(snippet, "utf8"),
        lineCount: (path.node.loc?.end.line ?? 1) - (path.node.loc?.start.line ?? 1) + 1,
        hash: computeBodyHash(snippet),
      });
    },

    ExportAllDeclaration(path: any) {
      // export * from './module'
      if (path.node.source) {
        imports.push({
          source: path.node.source.value,
          specifiers: [{ importedName: "*", localName: "*" }],
          loc: getNodeRange(path.node),
        });
      }
    },

    // 3. Top-level declarations (not exported)
    FunctionDeclaration(path: any) {
      // If already captured by ExportNamedDeclaration, skip
      if (path.parent && t.isExportNamedDeclaration(path.parent)) return;
      if (path.parent && t.isExportDefaultDeclaration(path.parent)) return;

      if (path.node.id) {
        const name = path.node.id.name;
        const snippet = code.slice(path.node.start || 0, path.node.end || 0);
        symbols.push({
          id: `${normalizedPath}:${name}`,
          filePath: normalizedPath,
          name,
          kind: "function",
          isExported: false,
          loc: getNodeRange(path.node),
          byteSize: Buffer.byteLength(snippet, "utf8"),
          lineCount: (path.node.loc?.end.line ?? 1) - (path.node.loc?.start.line ?? 1) + 1,
          hash: computeBodyHash(snippet),
        });
      }
    },

    VariableDeclaration(path: any) {
      if (path.parent && t.isExportNamedDeclaration(path.parent)) return;
      // Only process top-level variables (under Program or Block if exported)
      if (!t.isProgram(path.parent)) return;

      for (const declarator of path.node.declarations) {
        if (t.isIdentifier(declarator.id)) {
          const name = declarator.id.name;
          const kind: SymbolKind =
            t.isArrowFunctionExpression(declarator.init) ||
            t.isFunctionExpression(declarator.init)
              ? "function"
              : "variable";
          const snippet = code.slice(declarator.start || 0, declarator.end || 0);

          symbols.push({
            id: `${normalizedPath}:${name}`,
            filePath: normalizedPath,
            name,
            kind,
            isExported: false,
            loc: getNodeRange(declarator),
            byteSize: Buffer.byteLength(snippet, "utf8"),
            lineCount: (declarator.loc?.end.line ?? 1) - (declarator.loc?.start.line ?? 1) + 1,
            hash: computeBodyHash(snippet),
          });
        }
      }
    },

    ClassDeclaration(path: any) {
      if (path.parent && t.isExportNamedDeclaration(path.parent)) return;
      if (path.parent && t.isExportDefaultDeclaration(path.parent)) return;

      if (path.node.id) {
        const name = path.node.id.name;
        const snippet = code.slice(path.node.start || 0, path.node.end || 0);
        symbols.push({
          id: `${normalizedPath}:${name}`,
          filePath: normalizedPath,
          name,
          kind: "class",
          isExported: false,
          loc: getNodeRange(path.node),
          byteSize: Buffer.byteLength(snippet, "utf8"),
          lineCount: (path.node.loc?.end.line ?? 1) - (path.node.loc?.start.line ?? 1) + 1,
        });
      }
    },

    // 4. Callsites & Routes
    CallExpression(path: any) {
      const callee = path.node.callee;
      let calleeName = "";
      let memberObj: string | undefined;
      let memberProp: string | undefined;

      // require('...')
      if (t.isIdentifier(callee, { name: "require" })) {
        const arg = path.node.arguments[0];
        if (t.isStringLiteral(arg)) {
          imports.push({
            source: arg.value,
            specifiers: [{ importedName: "*", localName: "*" }],
            loc: getNodeRange(path.node),
          });
        }
      }

      // dynamic import('...')
      if (t.isImport(callee)) {
        const arg = path.node.arguments[0];
        if (t.isStringLiteral(arg)) {
          imports.push({
            source: arg.value,
            specifiers: [{ importedName: "*", localName: "*" }],
            isDynamic: true,
            loc: getNodeRange(path.node),
          });
        }
      }

      if (t.isIdentifier(callee)) {
        calleeName = callee.name;
        if (callee.name === "eval") {
          hasDynamicEvaluation = true;
        }
      } else if (t.isMemberExpression(callee)) {
        if (t.isIdentifier(callee.object)) {
          memberObj = callee.object.name;
        }
        if (t.isIdentifier(callee.property)) {
          memberProp = callee.property.name;
          calleeName = `${memberObj || ""}.${memberProp}`;
        }
      }

      // Extract literal arguments for route matching (e.g. fetch('/api/users'), app.get('/api/users'))
      const extractedArgs: Array<string | number | boolean | null> = [];
      for (const arg of path.node.arguments) {
        if (t.isStringLiteral(arg)) {
          extractedArgs.push(arg.value);
        } else if (t.isNumericLiteral(arg)) {
          extractedArgs.push(arg.value);
        } else if (t.isBooleanLiteral(arg)) {
          extractedArgs.push(arg.value);
        } else if (t.isTemplateLiteral(arg)) {
          // Normalize template literals e.g. `/api/users/${id}` -> `/api/users/:param`
          const templateStr = arg.quasis.map((q: any) => q.value.raw).join(":param");
          extractedArgs.push(templateStr);
        }
      }

      if (calleeName) {
        calls.push({
          callee: calleeName,
          memberObject: memberObj,
          memberName: memberProp,
          arguments: extractedArgs,
          loc: getNodeRange(path.node),
        });

        // Express / Fastify / Koa HTTP route registration: app.get('/api/...', handler)
        const httpMethods = ["get", "post", "put", "delete", "patch", "options", "head", "all", "use"];
        if (
          memberProp &&
          httpMethods.includes(memberProp.toLowerCase()) &&
          extractedArgs.length > 0 &&
          typeof extractedArgs[0] === "string" &&
          (extractedArgs[0].startsWith("/") || extractedArgs[0].startsWith("http"))
        ) {
          routes.push({
            id: `${normalizedPath}:${memberProp.toUpperCase()}:${extractedArgs[0]}`,
            filePath: normalizedPath,
            method: memberProp.toUpperCase() as any,
            path: extractedArgs[0] as string,
            framework: "express",
            loc: getNodeRange(path.node),
          });
        }
      }
    },

    // 5. JSX references: <MyComponent /> references MyComponent
    JSXOpeningElement(path: any) {
      const nameNode = path.node.name;
      if (t.isJSXIdentifier(nameNode)) {
        const compName = nameNode.name;
        // React component names conventionally start with an uppercase letter
        if (/^[A-Z]/.test(compName)) {
          calls.push({
            callee: compName,
            arguments: [],
            loc: getNodeRange(path.node),
          });
        }
      }
    },
  });

  return {
    filePath: normalizedPath,
    language: isTS ? "typescript" : "javascript",
    byteSize,
    lineCount,
    symbols,
    imports,
    calls,
    routes,
    hasDynamicEvaluation,
    isTestFile,
  };
}
