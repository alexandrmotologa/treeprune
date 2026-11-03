import { describe, expect, it } from "vitest";
import { parseTypeScript } from "../src/parser/typescript_parser.js";

describe("parseTypeScript", () => {
  it("should extract functions, exports, imports, and calls", () => {
    const code = `
      import { add, multiply } from './math';
      import React from 'react';

      export const GREETING = "Hello World";

      export function computeTotal(a: number, b: number): number {
        const sum = add(a, b);
        return multiply(sum, 2);
      }

      function internalHelper() {
        console.log("secret");
      }

      export default function MainApp() {
        computeTotal(10, 20);
        return null;
      }
    `;

    const parsed = parseTypeScript(code, "src/index.ts", "src/index.ts");

    expect(parsed.language).toBe("typescript");
    expect(parsed.imports.length).toBe(2);
    expect(parsed.imports[0].source).toBe("./math");
    expect(parsed.imports[0].specifiers.map((s) => s.importedName)).toEqual(["add", "multiply"]);

    const symbolNames = parsed.symbols.map((s) => s.name);
    expect(symbolNames).toContain("GREETING");
    expect(symbolNames).toContain("computeTotal");
    expect(symbolNames).toContain("internalHelper");
    expect(symbolNames).toContain("MainApp");

    const totalSymbol = parsed.symbols.find((s) => s.name === "computeTotal");
    expect(totalSymbol?.isExported).toBe(true);

    const helperSymbol = parsed.symbols.find((s) => s.name === "internalHelper");
    expect(helperSymbol?.isExported).toBe(false);

    const callNames = parsed.calls.map((c) => c.callee);
    expect(callNames).toContain("add");
    expect(callNames).toContain("multiply");
    expect(callNames).toContain("computeTotal");
  });

  it("should detect Next.js App Router HTTP handlers", () => {
    const code = `
      export async function GET(request: Request) {
        return new Response("OK");
      }

      export async function POST(request: Request) {
        return new Response("Created", { status: 201 });
      }
    `;

    const parsed = parseTypeScript(code, "app/api/users/route.ts", "app/api/users/route.ts");
    expect(parsed.routes.length).toBe(2);
    expect(parsed.routes[0].method).toBe("GET");
    expect(parsed.routes[0].path).toBe("/api/users");
    expect(parsed.routes[1].method).toBe("POST");
  });

  it("should detect Express/Fastify route calls", () => {
    const code = `
      import express from 'express';
      const app = express();

      app.get('/api/v1/health', (req, res) => {
        res.json({ ok: true });
      });

      app.post('/api/v1/login', (req, res) => {
        res.json({ token: "xyz" });
      });
    `;

    const parsed = parseTypeScript(code, "src/server.ts", "src/server.ts");
    expect(parsed.routes.length).toBe(2);
    expect(parsed.routes.map((r) => r.path)).toContain("/api/v1/health");
    expect(parsed.routes.map((r) => r.path)).toContain("/api/v1/login");
  });

  it("should extract JSX component usage as references", () => {
    const code = `
      import { Header } from './Header';
      import { Footer } from './Footer';

      export function Page() {
        return (
          <div>
            <Header title="TreePrune" />
            <Footer />
          </div>
        );
      }
    `;

    const parsed = parseTypeScript(code, "src/Page.tsx", "src/Page.tsx");
    const callNames = parsed.calls.map((c) => c.callee);
    expect(callNames).toContain("Header");
    expect(callNames).toContain("Footer");
  });
});
