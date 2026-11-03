import { FullAnalysisReport } from "../graph/types.js";

export function formatSarifReport(report: FullAnalysisReport): string {
  const results: any[] = [];

  // 1. Report dead files
  for (const deadFile of report.deadFiles) {
    results.push({
      ruleId: "TREEPRUNE001",
      level: "warning",
      message: {
        text: `File "${deadFile}" is completely unreachable from any application entrypoint.`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: deadFile },
            region: { startLine: 1, startColumn: 1 },
          },
        },
      ],
    });
  }

  // 2. Report dead exports
  for (const exp of report.deadExports) {
    results.push({
      ruleId: "TREEPRUNE002",
      level: "warning",
      message: {
        text: `Exported symbol "${exp.symbolName}" (${exp.kind}) is never imported or referenced.`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: exp.filePath },
            region: {
              startLine: exp.loc.start.line,
              startColumn: exp.loc.start.column + 1,
              endLine: exp.loc.end.line,
              endColumn: exp.loc.end.column + 1,
            },
          },
        },
      ],
    });
  }

  // 3. Report zombie routes
  for (const route of report.zombieRoutes) {
    results.push({
      ruleId: "TREEPRUNE003",
      level: "warning",
      message: {
        text: `Zombie HTTP route "${route.method} ${route.path}" has zero client network invocations.`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: route.filePath },
            region: { startLine: route.line, startColumn: 1 },
          },
        },
      ],
    });
  }

  const sarif = {
    $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "TreePrune",
            version: "1.0.0",
            informationUri: "https://github.com/alexandrmotologa/treeprune",
            rules: [
              {
                id: "TREEPRUNE001",
                name: "UnreachableFile",
                shortDescription: { text: "Unreachable dead file" },
              },
              {
                id: "TREEPRUNE002",
                name: "UnusedExport",
                shortDescription: { text: "Unreferenced exported symbol" },
              },
              {
                id: "TREEPRUNE003",
                name: "ZombieRoute",
                shortDescription: { text: "Abandoned backend HTTP route" },
              },
            ],
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
