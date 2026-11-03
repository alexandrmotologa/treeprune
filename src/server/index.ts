import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { TreePruneEngine } from "../engine.js";
import { registerApiRoutes } from "./api.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port?: number;
  host?: string;
  projectRoot: string;
}

export async function createServer(options: ServerOptions): Promise<FastifyInstance> {
  const app = fastify({
    logger: false,
  });

  await app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  const engine = new TreePruneEngine();
  registerApiRoutes(app, engine, options.projectRoot);

  // Serve compiled React studio if web/dist exists
  const webDistPath = path.resolve(__dirname, "../../web/dist");
  if (fs.existsSync(webDistPath)) {
    await app.register(fastifyStatic, {
      root: webDistPath,
      prefix: "/",
    });

    // SPA fallback
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith("/api")) {
        reply.status(404).send({ error: "API route not found" });
      } else {
        reply.sendFile("index.html");
      }
    });
  } else {
    // Fallback landing page if web studio is not compiled
    app.get("/", async (req, reply) => {
      reply.type("text/html").send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>TreePrune Studio API</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
              h1 { color: #38bdf8; }
              code { background: #1e293b; padding: 0.2rem 0.4rem; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>TreePrune API Server Running</h1>
            <p>Target project: <code>${options.projectRoot}</code></p>
            <p>API endpoints ready at <code>/api/status</code>, <code>/api/scan</code>, <code>/api/events</code>.</p>
          </body>
        </html>
      `);
    });
  }

  return app;
}

export async function startServer(options: ServerOptions): Promise<{ port: number; host: string; url: string }> {
  const port = options.port || 9840;
  const host = options.host || "127.0.0.1";
  const app = await createServer(options);

  await app.listen({ port, host });
  const url = `http://${host}:${port}`;

  return { port, host, url };
}
