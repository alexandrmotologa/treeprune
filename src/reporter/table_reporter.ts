import pc from "picocolors";
import { FullAnalysisReport } from "../graph/types.js";

export function formatTableReport(report: FullAnalysisReport): string {
  const { summary, deadFiles, deadExports, zombieRoutes, unusedDependencies, aiDuplicates } = report;
  const lines: string[] = [];

  lines.push("");
  lines.push(pc.bold(pc.cyan("=== TreePrune Static Analysis Report ===")));
  lines.push(pc.dim(`Target: ${report.projectRoot}`));
  lines.push(pc.dim(`Timestamp: ${report.timestamp}`));
  lines.push("");

  // Summary Metrics Box
  lines.push(pc.bold("Summary Metrics:"));
  lines.push(
    `  Files Scanned:      ${pc.bold(String(summary.scannedFiles))} ` +
    `(${summary.totalNodes} AST nodes, ${summary.totalEdges} graph edges)`
  );
  lines.push(
    `  Root Entrypoints:   ${pc.green(pc.bold(String(summary.rootCount)))} architectural roots`
  );
  lines.push(
    `  Reachable Code:     ${pc.green(String(summary.reachableNodes))} nodes`
  );
  lines.push(
    `  Dead Nodes:         ${pc.red(pc.bold(String(summary.deadNodes)))} unreachable symbols`
  );
  lines.push(
    `  Dead Files:         ${pc.red(pc.bold(String(summary.deadFilesCount)))} files`
  );
  lines.push(
    `  Dead Weight:        ${pc.yellow(pc.bold(`${(summary.deadBytes / 1024).toFixed(1)} KB`))} ` +
    `(${summary.deadLines} lines of dead code, ${summary.wastedPercentage}% of codebase)`
  );
  lines.push("");

  // Dead Files
  if (deadFiles.length > 0) {
    lines.push(pc.bold(pc.red(`Dead Files (${deadFiles.length}):`)));
    for (const f of deadFiles) {
      lines.push(`  ${pc.red("✖")} ${f}`);
    }
    lines.push("");
  }

  // Dead Exports
  if (deadExports.length > 0) {
    lines.push(pc.bold(pc.yellow(`Unused Export Declarations (${deadExports.length}):`)));
    for (const exp of deadExports.slice(0, 15)) {
      lines.push(
        `  ${pc.yellow("⚠")} ${pc.dim(exp.filePath + ":")}${pc.bold(exp.symbolName)} ` +
        pc.dim(`(${exp.kind}, line ${exp.loc.start.line})`)
      );
    }
    if (deadExports.length > 15) {
      lines.push(pc.dim(`  ... and ${deadExports.length - 15} more unused exports`));
    }
    lines.push("");
  }

  // Zombie Routes
  if (zombieRoutes.length > 0) {
    lines.push(pc.bold(pc.magenta(`Zombie API Endpoints (${zombieRoutes.length}):`)));
    lines.push(pc.dim("  Declared in backend but never invoked by any client network call:"));
    for (const r of zombieRoutes) {
      lines.push(
        `  ${pc.magenta("⚰")} ${pc.bold(r.method)} ${pc.cyan(r.path)} ` +
        pc.dim(`(${r.filePath}:${r.line})`)
      );
    }
    lines.push("");
  }

  // Unused Dependencies
  if (unusedDependencies.length > 0) {
    lines.push(pc.bold(pc.blue(`Unused Manifest Dependencies (${unusedDependencies.length}):`)));
    for (const dep of unusedDependencies) {
      lines.push(
        `  ${pc.blue("📦")} ${pc.bold(dep.name)} ${pc.dim(`(${dep.version} in ${dep.manifestFile})`)} ` +
        pc.dim(`-> ${dep.uninstallCommand}`)
      );
    }
    lines.push("");
  }

  // AI Residue
  if (aiDuplicates.length > 0) {
    lines.push(pc.bold(pc.green(`AI Residue & Duplicate Helpers (${aiDuplicates.length}):`)));
    for (const cluster of aiDuplicates) {
      lines.push(`  ${pc.green("🤖")} Identical function ${pc.bold(cluster.name)}:`);
      for (const inst of cluster.instances) {
        lines.push(pc.dim(`     - ${inst.filePath}:${inst.line}`));
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
