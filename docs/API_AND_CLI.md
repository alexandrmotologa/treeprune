# TreePrune CLI & API Reference

## Command Line Interface

TreePrune provides commands for terminal audits, automated cleaning, interactive web exploration, rollback snapshots, and CI pipeline setup: `scan`, `clean`, `serve`, `rollback`, and `init-ci`.

### Global Options

- `-V, --version`: Print current version.
- `-h, --help`: Display help and usage information.

### `treeprune scan [directory]`

Analyzes a target directory for dead code, unused exports, zombie API routes, unused package dependencies, commented-out dead code blocks, and redundant type definitions.

**Arguments:**
- `[directory]`: Project directory to inspect (defaults to current working directory).

**Options:**
- `-f, --format <format>`: Output display format: `table`, `json`, or `sarif` (default: `table`).
- `-o, --output <file>`: Write full analysis report to a file.
- `--include-tests`: Treat test files (`*.test.ts`, `*_test.go`, `test_*.py`) as reachability roots (default: `false`).
- `--threshold <kb>`: Set dead code weight threshold in KB; exits with non-zero status code if exceeded.
- `--fail-on-zombie`: Exit with non-zero status code if any zombie API routes are detected.

**Example:**
```bash
treeprune scan ./backend --format json --output report.json --threshold 50 --fail-on-zombie
```

### `treeprune clean [directory]`

Safely removes unreachable symbols, dead files, and unused package dependencies.

**Options:**
- `-b, --branch <name>`: Create a new Git branch containing the clean changes (default: `treeprune/cleanup-dead-code`).
- `--dry-run`: Preview file deletions and AST modifications without writing to disk (default: `false`).
- `--no-backup`: Skip creating a rollback snapshot in `.treeprune/snapshots`.
- `--verify-types, --verify-build`: Verify that the project compiles with native compilers (`tsc`, `go vet`, `py_compile`) before finalizing the Git commit. If errors occur, the changes are rolled back automatically.

**Example:**
```bash
treeprune clean ./my-app --branch prune-dead-code --verify-types
```

### `treeprune serve [directory]`

Launches the interactive Web Studio UI and Fastify API server.

**Options:**
- `-p, --port <number>`: Web server port (default: `9840`).
- `--host <address>`: Host interface to bind (default: `localhost`).
- `--open`: Open browser automatically once ready.

**Example:**
```bash
treeprune serve ./my-app --port 9840 --open
```

### `treeprune rollback [directory]`

Restores the project to its state before the most recent prune operation.

**Example:**
```bash
treeprune rollback ./my-app
```

### `treeprune init-ci [directory]`

Generates a complete GitHub Actions workflow file at `.github/workflows/treeprune-audit.yml` that performs automated static analysis on pull requests, exports SARIF findings, and uploads them to GitHub Code Scanning.

**Example:**
```bash
treeprune init-ci
```

---

## Configuration File (`treeprune.config.json`)

TreePrune supports custom project configuration either via `treeprune.config.json` in the project root, a `.treeprunerc.json` file, or a `"treeprune"` field inside `package.json`.

```json
{
  "ignore": [
    "**/custom_vendor/**",
    "**/legacy_fixtures/**"
  ],
  "customRoots": [
    "src/workers/background_task.ts",
    "cmd/custom_runner.go"
  ],
  "preserveSymbols": [
    "onExternalWebhookReceived",
    "legacyTelemetryCallback"
  ],
  "thresholdKb": 50,
  "failOnZombie": true,
  "includeTests": false,
  "verifyBuild": true,
  "defaultBranch": "cleanup/dead-code-v1",
  "editor": "cursor"
}
```

### Configuration Options

- `ignore`: Array of glob patterns to exclude from scanning (combined with default exclusions like `node_modules`, `dist`, `.git`).
- `customRoots`: Array of file paths or globs to treat as root entry points during reachability traversal.
- `preserveSymbols`: Symbol names that must never be marked as dead code (useful for runtime reflection or dynamic dispatch).
- `thresholdKb`: Maximum allowed dead weight before CI checks fail.
- `failOnZombie`: Whether to fail CI if zombie backend routes are discovered.
- `verifyBuild`: Automatically verify compilation (`tsc`, `go vet`, `py_compile`) during pruning.
- `editor`: Default editor scheme for 1-click navigation in Web Studio (`"cursor"` or `"vscode"`).

---

## Fastify Server REST & SSE Endpoints

When running `treeprune serve`, the server exposes the following HTTP endpoints:

### `GET /api/status`
Returns server status, current target directory, and Git repository metadata.

### `POST /api/scan`
Triggers an analysis scan.
- Payload: `{ "directory": "...", "includeTests": false }`
- Response: Full analysis report summary, node counts, zombie routes, and unused dependencies.

### `GET /api/events`
Server-Sent Events (SSE) stream providing real-time scanning progress:
- `event: progress` `{ "phase": "parsing", "currentFile": "src/app.ts", "percent": 45 }`
- `event: complete` `{ "reportId": "...", "totalDeadBytes": 142000 }`

### `POST /api/prune`
Executes safe pruning on selected nodes.
- Payload: `{ "nodeIds": ["..."], "branch": "cleanup-dead-code", "createBackup": true, "verifyBuild": true }`
- Response: Summary of modified files, deleted files, and Git commit hash.

### `GET /api/diff`
Returns unified git-style diffs of proposed AST removals for selected symbols.

### `GET /api/snapshots`
Lists all available rollback snapshots stored in `.treeprune/snapshots`.

### `POST /api/rollback`
Restores project files to a previous snapshot state.
- Payload: `{ "snapshotId": "..." }` (optional, defaults to the latest snapshot).
