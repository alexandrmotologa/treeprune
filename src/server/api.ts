import { FastifyInstance } from "fastify";
import path from "node:path";
import fs from "node:fs/promises";
import { TreePruneEngine } from "../engine.js";
import { sseBroadcaster } from "./sse.js";
import { listSnapshots, restoreSnapshot } from "../pruner/backup.js";
import { removeSymbolsFromCode } from "../pruner/safe_remover.js";

export function registerApiRoutes(
  server: FastifyInstance,
  engine: TreePruneEngine,
  projectRoot: string
) {
  // 1. Status endpoint
  server.get("/api/status", async () => {
    const report = engine.getLastReport();
    return {
      status: "ok",
      projectRoot: path.resolve(projectRoot),
      hasReport: report !== null,
      summary: report ? report.summary : null,
    };
  });

  // 2. SSE stream
  server.get("/api/events", async (request, reply) => {
    sseBroadcaster.addClient(reply);
  });

  // 3. Scan endpoint
  server.post("/api/scan", async (request: any) => {
    const body = request.body || {};
    const includeTests = Boolean(body.includeTests);

    const report = await engine.scan(projectRoot, {
      includeTests,
      onProgress: (evt) => sseBroadcaster.broadcast(evt),
    });

    return report;
  });

  // 4. Get last report
  server.get("/api/report", async (request, reply) => {
    const report = engine.getLastReport();
    if (!report) {
      reply.status(404);
      return { error: "No analysis has been executed yet. Run POST /api/scan first." };
    }
    return report;
  });

  // 5. Execute prune
  server.post("/api/prune", async (request: any, reply) => {
    const report = engine.getLastReport();
    if (!report) {
      reply.status(400);
      return { error: "Cannot prune without an initial scan report. Run scan first." };
    }

    const body = request.body || {};
    const result = await engine.prune(projectRoot, report, {
      nodeIds: body.nodeIds,
      branchName: body.branch,
      dryRun: Boolean(body.dryRun),
      createBackup: body.createBackup !== false,
    });

    return result;
  });

  // 6. List rollback snapshots
  server.get("/api/snapshots", async () => {
    const snapshots = await listSnapshots(projectRoot);
    return { snapshots };
  });

  // 7. Rollback snapshot
  server.post("/api/rollback", async (request: any, reply) => {
    const body = request.body || {};
    try {
      const res = await restoreSnapshot(projectRoot, body.snapshotId);
      return { success: true, ...res };
    } catch (err: any) {
      reply.status(400);
      return { error: err.message };
    }
  });

  // 8. Generate preview diff for a file before/after pruning
  server.get("/api/diff", async (request: any, reply) => {
    const query = (request.query || {}) as { file?: string; symbols?: string };
    if (!query.file) {
      reply.status(400);
      return { error: 'Query parameter "file" is required' };
    }

    const fullPath = path.join(projectRoot, query.file);
    try {
      const original = await fs.readFile(fullPath, "utf8");
      const symbolList = query.symbols ? query.symbols.split(",") : [];
      const transformed = removeSymbolsFromCode(original, symbolList, query.file);

      return {
        filePath: query.file,
        original,
        transformed,
        hasChanges: original !== transformed,
      };
    } catch (err: any) {
      reply.status(404);
      return { error: `Failed to read file ${query.file}` };
    }
  });
}
