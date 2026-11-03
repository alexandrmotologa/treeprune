#!/usr/bin/env node
import { Command } from "commander";
import path from "node:path";
import fs from "node:fs/promises";
import pc from "picocolors";
import { TreePruneEngine } from "./engine.js";
import { formatTableReport, formatJsonReport, formatSarifReport } from "./reporter/index.js";
import { startServer } from "./server/index.js";
import { listSnapshots, restoreSnapshot } from "./pruner/backup.js";
import { generateGitHubWorkflow } from "./cli/init_ci.js";
const program = new Command();
program
    .name("treeprune")
    .description("Whole-codebase static analysis and dead code pruner for TypeScript, Python, and Go")
    .version("1.0.0");
// 1. SCAN COMMAND
program
    .command("scan [directory]")
    .description("Analyze codebase for dead code, zombie routes, and unused packages")
    .option("-f, --format <format>", "Output format: table, json, sarif", "table")
    .option("-o, --output <file>", "Save report output to a file")
    .option("--include-tests", "Treat test files as reachability roots", false)
    .option("--threshold <kb>", "Exit with non-zero code if dead code exceeds threshold (KB)")
    .option("--fail-on-zombie", "Exit with non-zero code if zombie routes are detected", false)
    .action(async (directory, options) => {
    const projectRoot = path.resolve(directory || process.cwd());
    const engine = new TreePruneEngine();
    console.log(pc.cyan(`\n🔍 Scanning project at ${projectRoot}...`));
    try {
        const report = await engine.scan(projectRoot, {
            includeTests: options.includeTests,
            onProgress: (evt) => {
                if (options.format === "table") {
                    process.stdout.write(`\r${pc.dim("→")} ${evt.message.padEnd(60)}`);
                }
            },
        });
        if (options.format === "table") {
            process.stdout.write("\r" + " ".repeat(70) + "\r");
        }
        let output = "";
        if (options.format === "json") {
            output = formatJsonReport(report);
        }
        else if (options.format === "sarif") {
            output = formatSarifReport(report);
        }
        else {
            output = formatTableReport(report);
        }
        if (options.output) {
            await fs.writeFile(path.resolve(options.output), output, "utf8");
            console.log(pc.green(`\n✔ Report written to ${options.output}`));
        }
        else {
            console.log(output);
        }
        // CI gate checks
        if (options.threshold) {
            const thresholdBytes = Number(options.threshold) * 1024;
            if (report.summary.deadBytes > thresholdBytes) {
                console.error(pc.red(`\n✖ CI Gate Failed: Dead code ${(report.summary.deadBytes / 1024).toFixed(1)} KB exceeds threshold of ${options.threshold} KB`));
                process.exit(1);
            }
        }
        if (options.failOnZombie && report.zombieRoutes.length > 0) {
            console.error(pc.red(`\n✖ CI Gate Failed: ${report.zombieRoutes.length} zombie API routes detected`));
            process.exit(1);
        }
    }
    catch (err) {
        console.error(pc.red(`\n✖ Error during scan: ${err.message}`));
        process.exit(1);
    }
});
// 2. CLEAN COMMAND
program
    .command("clean [directory]")
    .description("Safely remove dead files, orphaned exports, and unused dependencies")
    .option("-b, --branch <branch>", "Git branch for cleanup commit", "treeprune/cleanup-dead-code")
    .option("--dry-run", "Preview changes without modifying files", false)
    .option("--no-backup", "Skip creating a rollback snapshot")
    .option("--verify-types, --verify-build", "Verify project compiles before committing", false)
    .action(async (directory, options) => {
    const projectRoot = path.resolve(directory || process.cwd());
    const engine = new TreePruneEngine();
    console.log(pc.cyan(`\n🔍 Analyzing codebase at ${projectRoot}...`));
    try {
        const report = await engine.scan(projectRoot, {
            onProgress: (evt) => {
                process.stdout.write(`\r${pc.dim("→")} ${evt.message.padEnd(60)}`);
            },
        });
        process.stdout.write("\r" + " ".repeat(70) + "\r");
        if (report.summary.deadNodes === 0 && report.unusedDependencies.length === 0) {
            console.log(pc.green("✔ No dead code or unused dependencies found. Repository is clean!"));
            return;
        }
        console.log(pc.yellow(`Found ${report.summary.deadFilesCount} dead files, ${report.deadExports.length} unused exports, and ${report.unusedDependencies.length} unused packages (${(report.summary.deadBytes / 1024).toFixed(1)} KB total).`));
        const result = await engine.prune(projectRoot, report, {
            branchName: options.branch,
            dryRun: options.dryRun,
            createBackup: options.backup,
            verifyBuild: Boolean(options.verifyTypes || options.verifyBuild),
        });
        if (result.dryRun) {
            console.log(pc.bold(pc.cyan("\n[DRY RUN PREVIEW]")));
            console.log(`Files to be modified (${result.modifiedFiles.length}):`);
            result.modifiedFiles.forEach((f) => console.log(`  ~ ${f}`));
            console.log(`Files to be deleted (${result.deletedFiles.length}):`);
            result.deletedFiles.forEach((f) => console.log(`  - ${f}`));
            if (result.removedDependencies.length > 0) {
                console.log(`Packages to be removed: ${result.removedDependencies.join(", ")}`);
            }
            console.log(pc.dim("\nRun without --dry-run to apply changes to a dedicated Git branch."));
        }
        else {
            console.log(pc.bold(pc.green("\n✔ Prune completed successfully!")));
            if (result.snapshotId) {
                console.log(pc.dim(`Rollback snapshot saved: ${result.snapshotId}`));
            }
            if (result.branch) {
                console.log(pc.cyan(`Cleaned changes committed to branch: ${result.branch}`));
            }
            console.log(`Removed ${result.deletedFiles.length} files, modified ${result.modifiedFiles.length} files. Recovered ${(result.totalDeadBytesSaved / 1024).toFixed(1)} KB.`);
        }
    }
    catch (err) {
        console.error(pc.red(`\n✖ Error during prune: ${err.message}`));
        process.exit(1);
    }
});
// 3. SERVE COMMAND
program
    .command("serve [directory]")
    .description("Launch the interactive Web Studio UI and API server")
    .option("-p, --port <port>", "Port to bind", "9840")
    .option("--host <host>", "Host address to bind", "127.0.0.1")
    .action(async (directory, options) => {
    const projectRoot = path.resolve(directory || process.cwd());
    const port = parseInt(options.port, 10);
    const host = options.host;
    console.log(pc.cyan(`\n🚀 Starting TreePrune Studio...`));
    console.log(pc.dim(`Target project: ${projectRoot}`));
    try {
        const { url } = await startServer({
            port,
            host,
            projectRoot,
        });
        console.log(pc.bold(pc.green(`\n✔ TreePrune Studio running at: ${url}`)));
        console.log(pc.dim("Press Ctrl+C to stop the server\n"));
    }
    catch (err) {
        console.error(pc.red(`\n✖ Failed to start server: ${err.message}`));
        process.exit(1);
    }
});
// 4. ROLLBACK COMMAND
program
    .command("rollback [directory]")
    .description("Restore project to state prior to the most recent prune operation")
    .option("--list", "List available snapshots", false)
    .option("--id <snapshotId>", "Restore a specific snapshot ID")
    .action(async (directory, options) => {
    const projectRoot = path.resolve(directory || process.cwd());
    try {
        if (options.list) {
            const snapshots = await listSnapshots(projectRoot);
            if (snapshots.length === 0) {
                console.log(pc.dim("No snapshots found in .treeprune/snapshots"));
                return;
            }
            console.log(pc.bold("\nAvailable Rollback Snapshots:"));
            for (const snap of snapshots) {
                console.log(`  ${pc.cyan(snap.id)}: ${snap.timestamp} (${snap.files.length} files)`);
            }
            return;
        }
        console.log(pc.cyan(`\nRestoring rollback snapshot...`));
        const result = await restoreSnapshot(projectRoot, options.id);
        console.log(pc.green(`✔ Restored ${result.restoredCount} files from snapshot ${pc.bold(result.snapshotId)}`));
    }
    catch (err) {
        console.error(pc.red(`\n✖ Rollback failed: ${err.message}`));
        process.exit(1);
    }
});
// 5. INIT-CI COMMAND
program
    .command("init-ci [directory]")
    .description("Generate GitHub Actions automated dead code and zombie route audit workflow")
    .action(async (directory) => {
    const projectRoot = path.resolve(directory || process.cwd());
    try {
        const workflowPath = await generateGitHubWorkflow(projectRoot);
        console.log(pc.green(`\n✔ GitHub Actions workflow generated at:`));
        console.log(pc.cyan(`  ${workflowPath}`));
        console.log(pc.dim("\nCommit this workflow file to automatically audit PRs and upload SARIF security annotations."));
    }
    catch (err) {
        console.error(pc.red(`\n✖ Failed to generate workflow: ${err.message}`));
        process.exit(1);
    }
});
program.parse(process.argv);
