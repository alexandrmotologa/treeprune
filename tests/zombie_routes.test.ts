import { describe, expect, it } from "vitest";
import { parseTypeScript } from "../src/parser/typescript_parser.js";
import { detectZombieRoutes, normalizeRoutePattern } from "../src/detectors/zombie_routes.js";
import { ParsedFile } from "../src/parser/types.js";

describe("detectZombieRoutes", () => {
  it("should normalize route parameter regex patterns correctly", () => {
    const { regex } = normalizeRoutePattern("/api/v1/users/:id");
    expect(regex.test("/api/v1/users/42")).toBe(true);
    expect(regex.test("/api/v1/users/abc-123")).toBe(true);
    expect(regex.test("/api/v1/users/42/details")).toBe(false);
  });

  it("should detect backend routes with zero frontend client calls", () => {
    // Backend controller with 2 routes
    const backendCode = `
      import express from 'express';
      const app = express();

      app.get('/api/v1/users', (req, res) => res.json([]));
      app.delete('/api/v1/users/:id', (req, res) => res.json({ deleted: true }));
      app.post('/api/v1/legacy-export', (req, res) => res.json({ ok: true }));
    `;

    // Frontend client calling only /api/v1/users and /api/v1/users/:id
    const frontendCode = `
      export async function loadUsers() {
        const res = await fetch('/api/v1/users');
        return res.json();
      }

      export async function deleteUser(id: string) {
        return fetch('/api/v1/users/' + id, { method: 'DELETE' });
      }
    `;

    const f1 = parseTypeScript(backendCode, "src/server.ts", "src/server.ts");
    const f2 = parseTypeScript(frontendCode, "web/api.ts", "web/api.ts");

    const parsedFiles: ParsedFile[] = [f1, f2];
    const zombies = detectZombieRoutes(parsedFiles);

    const zombiePaths = zombies.map((z) => z.path);
    // /api/v1/legacy-export is never called by frontend
    expect(zombiePaths).toContain("/api/v1/legacy-export");

    // /api/v1/users is called, so it should not be a zombie
    expect(zombiePaths).not.toContain("/api/v1/users");
  });
});
