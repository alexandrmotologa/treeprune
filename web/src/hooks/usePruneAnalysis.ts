import { useState, useEffect, useCallback } from "react";
import { FullAnalysisReport, ScanProgress } from "../types.js";

export function usePruneAnalysis() {
  const [report, setReport] = useState<FullAnalysisReport | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isPruning, setIsPruning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // Connect to SSE stream for live updates
  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("progress", (e) => {
      try {
        const data = JSON.parse(e.data);
        setProgress(data);
      } catch {
        // Ignore parse error
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // Fetch initial report or status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      if (data.hasReport) {
        const repRes = await fetch("/api/report");
        if (repRes.ok) {
          const repData = await repRes.json();
          setReport(repData);
          initSelection(repData);
        }
      } else {
        // Trigger initial scan if no report exists yet
        triggerScan();
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  function initSelection(rep: FullAnalysisReport) {
    // By default, select all dead files and dead exports
    const set = new Set<string>();
    rep.deadFiles.forEach((f) => set.add(f));
    rep.deadExports.forEach((e) => set.add(e.id));
    rep.unusedDependencies.forEach((d) => set.add(`pkg:${d.name}`));
    setSelectedNodeIds(set);
  }

  const triggerScan = async (includeTests = false) => {
    setIsScanning(true);
    setError(null);
    setProgress({ phase: "discovering", message: "Starting static analysis scan..." });

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeTests }),
      });

      if (!res.ok) {
        throw new Error(`Scan failed with status ${res.status}`);
      }

      const repData = await res.json();
      setReport(repData);
      initSelection(repData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
      setProgress(null);
    }
  };

  const triggerPrune = async (options: {
    branch: string;
    createBackup: boolean;
    dryRun?: boolean;
  }) => {
    setIsPruning(true);
    setError(null);

    try {
      const res = await fetch("/api/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeIds: Array.from(selectedNodeIds),
          branch: options.branch,
          createBackup: options.createBackup,
          dryRun: options.dryRun,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Prune failed");
      }

      const result = await res.json();
      // Re-scan after pruning to update graph
      if (!options.dryRun) {
        await triggerScan(false);
      }
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsPruning(false);
    }
  };

  const toggleNodeSelection = (id: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (select: boolean) => {
    if (!report) return;
    if (select) {
      initSelection(report);
    } else {
      setSelectedNodeIds(new Set());
    }
  };

  return {
    report,
    isScanning,
    isPruning,
    progress,
    error,
    selectedNodeIds,
    triggerScan,
    triggerPrune,
    toggleNodeSelection,
    selectAll,
    refreshStatus: fetchStatus,
  };
}
