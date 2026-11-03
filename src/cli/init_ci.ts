import fs from "node:fs/promises";
import path from "node:path";

export async function generateGitHubWorkflow(projectRoot: string): Promise<string> {
  const workflowDir = path.join(projectRoot, ".github", "workflows");
  await fs.mkdir(workflowDir, { recursive: true });

  const workflowPath = path.join(workflowDir, "treeprune-audit.yml");

  const workflowYaml = `name: TreePrune Dead Code & Zombie Route Audit

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

permissions:
  contents: read
  security-events: write

jobs:
  audit:
    name: Reachability & Dead Weight Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Codebase
        uses: actions/checkout@v4

      - name: Setup Node.js Runtime
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Project Dependencies
        run: |
          if [ -f package-lock.json ]; then
            npm ci
          elif [ -f package.json ]; then
            npm install
          fi

      - name: Run TreePrune Static Analysis
        run: |
          npx treeprune scan --format sarif --output treeprune-results.sarif --threshold 50

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: treeprune-results.sarif
`;

  await fs.writeFile(workflowPath, workflowYaml, "utf8");
  return workflowPath;
}
