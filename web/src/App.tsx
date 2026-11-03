import { useState } from "react";
import {
  Scissors,
  RefreshCw,
  GitBranch,
  Network,
  Skull,
  FileCode,
  PackageX,
  Sparkles,
} from "lucide-react";
import { usePruneAnalysis } from "./hooks/usePruneAnalysis.js";
import { DeadWeightMetrics } from "./components/DeadWeightMetrics.js";
import { ReachabilityGraph } from "./components/ReachabilityGraph.js";
import { ZombieRouteList } from "./components/ZombieRouteList.js";
import { DeadItemList } from "./components/DeadItemList.js";
import { UnusedDepsList } from "./components/UnusedDepsList.js";
import { AIResidueList } from "./components/AIResidueList.js";
import { PrunePreviewModal } from "./components/PrunePreviewModal.js";

export function App() {
  const {
    report,
    isScanning,
    progress,
    selectedNodeIds,
    triggerScan,
    triggerPrune,
    toggleNodeSelection,
    selectAll,
  } = usePruneAnalysis();

  const [activeTab, setActiveTab] = useState<
    "graph" | "zombies" | "dead" | "deps" | "ai"
  >("graph");

  const [isPruneModalOpen, setIsPruneModalOpen] = useState(false);
  const [diffTarget, setDiffTarget] = useState<{
    file?: string;
    symbol?: string;
  }>({});
  const [includeTests, setIncludeTests] = useState(false);

  const handleOpenDiff = (filePath: string, symbolName?: string) => {
    setDiffTarget({ file: filePath, symbol: symbolName });
    setIsPruneModalOpen(true);
  };

  const handleStartPrune = () => {
    setDiffTarget({});
    setIsPruneModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border/80 bg-surface/70 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-white">
                TreePrune
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate max-w-md">
              {report?.projectRoot || "Polyglot Dead Code & Zombie Endpoint Pruner"}
            </p>
          </div>
        </div>

        {/* Live scanning progress bar indicator */}
        {isScanning && progress && (
          <div className="hidden lg:flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>{progress.message}</span>
          </div>
        )}

        {/* Header Action Buttons */}
        <div className="flex items-center gap-3">
          <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeTests}
              onChange={(e) => setIncludeTests(e.target.checked)}
              className="rounded border-border bg-slate-900 text-cyan-500 focus:ring-0"
            />
            <span>Include Tests as Roots</span>
          </label>

          <button
            onClick={() => triggerScan(includeTests)}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-border text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-cyan-400" : ""}`}
            />
            {isScanning ? "Analyzing..." : "Re-Scan"}
          </button>

          <button
            onClick={handleStartPrune}
            disabled={isScanning || !report || selectedNodeIds.size === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all disabled:opacity-40"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Prune Selected ({selectedNodeIds.size})</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Metrics Scorecard */}
        {report && (
          <DeadWeightMetrics
            summary={report.summary}
            zombieCount={report.zombieRoutes.length}
            unusedDepsCount={report.unusedDependencies.length}
            aiResidueCount={report.aiDuplicates.length}
          />
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("graph")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                activeTab === "graph"
                  ? "border-cyan-400 text-cyan-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Network className="w-4 h-4" />
              Reachability Graph
              {report && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {report.nodes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("zombies")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                activeTab === "zombies"
                  ? "border-purple-400 text-purple-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Skull className="w-4 h-4" />
              Zombie Routes
              {report && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  {report.zombieRoutes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("dead")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                activeTab === "dead"
                  ? "border-rose-400 text-rose-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileCode className="w-4 h-4" />
              Dead Files & Exports
              {report && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                  {report.deadFiles.length + report.deadExports.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("deps")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                activeTab === "deps"
                  ? "border-blue-400 text-blue-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <PackageX className="w-4 h-4" />
              Unused Dependencies
              {report && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                  {report.unusedDependencies.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all ${
                activeTab === "ai"
                  ? "border-emerald-400 text-emerald-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              AI Residue
              {report && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {report.aiDuplicates.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        {report ? (
          <div>
            {activeTab === "graph" && (
              <ReachabilityGraph
                nodes={report.nodes}
                edges={report.edges}
                onSelectNode={(node) => {
                  if (!node.reachable && node.kind !== "file") {
                    handleOpenDiff(node.filePath, node.symbolName);
                  }
                }}
              />
            )}

            {activeTab === "zombies" && (
              <ZombieRouteList routes={report.zombieRoutes} />
            )}

            {activeTab === "dead" && (
              <DeadItemList
                deadFiles={report.deadFiles}
                deadExports={report.deadExports}
                selectedIds={selectedNodeIds}
                onToggleSelect={toggleNodeSelection}
                onSelectAll={selectAll}
                onPreviewDiff={handleOpenDiff}
              />
            )}

            {activeTab === "deps" && (
              <UnusedDepsList deps={report.unusedDependencies} />
            )}

            {activeTab === "ai" && (
              <AIResidueList clusters={report.aiDuplicates} />
            )}
          </div>
        ) : (
          <div className="bg-surface/40 border border-border/80 rounded-2xl p-16 text-center flex flex-col items-center justify-center">
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
            <h3 className="text-base font-semibold text-white">
              Analyzing repository reachability...
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Discovering AST symbols, identifying roots, and mapping call graph edges.
            </p>
          </div>
        )}
      </main>

      {/* Prune Diff & Confirmation Modal */}
      <PrunePreviewModal
        isOpen={isPruneModalOpen}
        onClose={() => setIsPruneModalOpen(false)}
        selectedCount={selectedNodeIds.size}
        previewFile={diffTarget.file}
        previewSymbol={diffTarget.symbol}
        onConfirmPrune={triggerPrune}
      />
    </div>
  );
}
