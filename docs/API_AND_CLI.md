# TreePrune CLI & API Reference

## Command Line Interface

TreePrune provides three primary commands: `scan`, `clean`, and `serve`, along with a `rollback` utility.

### Global Options

- `-v, --version`: Print current version.
- `-h, --help`: Display help and usage information.

### `treeprune scan [directory]`

Analyzes a target directory for dead code, unused exports, zombie API routes, and unused packages.

**Arguments:**
- `[directory]`: Project directory to inspect (defaults to current working directory).

**Options:**
- `-f, --format <table|json|csv>`: Output display format (default: `table`).
- `-o, --output <path>`: Write full analysis report to a file.
- `--include-tests`: Treat test files (`*.test.ts`, `*_test.go`, `test_*.py`) as reachability roots.
- `--threshold <kb>`: Set minimum dead code threshold (in KB) before returning a non-zero exit code (for CI gates).
- `--verbose`: Show detailed debug logs and traversal paths.

**Example:**
```bash
treeprune scan ./backend --format json --output report.json
```

### `treeprune clean [directory]`

Removes unreachable symbols, dead files, and unused package dependencies.

**Options:**
- `-b, --branch <name>`: Create a new Git branch containing the clean changes (default: `treeprune/cleanup-dead-code`).
- `--dry-run`: Preview file deletions and AST modifications without writing to disk.
- `--no-backup`: Skip creating a rollback snapshot in `.treeprune/snapshots`.
- `-y, --yes`: Apply changes without confirmation prompts.
- `--only <files|exports|deps|routes>`: Limit pruning to specific categories.

**Example:**
```bash
treeprune clean ./my-app --branch prune-dead-code --yes
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

**Options:**
- `--list`: Display available rollback snapshots.
- `--id <snapshot-id>`: Restore a specific snapshot version.

**Example:**
```bash
treeprune rollback ./my-app
```

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
- Payload: `{ "nodeIds": ["..."], "branch": "cleanup-dead-code", "createBackup": true }`
- Response: Summary of modified files, deleted files, and Git commit hash.

### `GET /api/diff`
Returns unified git-style diffs of proposed AST removals for selected symbols.
