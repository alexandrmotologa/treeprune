import { FullAnalysisReport } from "../graph/types.js";

export function formatJsonReport(report: FullAnalysisReport): string {
  return JSON.stringify(report, null, 2);
}
