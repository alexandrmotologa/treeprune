import React, { useState, useEffect } from "react";
import { GitBranch, Check, Loader2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  previewFile?: string;
  previewSymbol?: string;
  onConfirmPrune: (options: {
    branch: string;
    createBackup: boolean;
    dryRun: boolean;
  }) => Promise<any>;
}

export const PrunePreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  selectedCount,
  previewFile,
  previewSymbol,
  onConfirmPrune,
}) => {
  const [branch, setBranch] = useState("treeprune/cleanup-dead-code");
  const [createBackup, setCreateBackup] = useState(true);
  const [isDryRun, setIsDryRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [diffData, setDiffData] = useState<{
    original: string;
    transformed: string;
  } | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // Load preview diff if a file is requested
  useEffect(() => {
    if (previewFile) {
      const url = `/api/diff?file=${encodeURIComponent(previewFile)}${
        previewSymbol ? `&symbols=${encodeURIComponent(previewSymbol)}` : ""
      }`;
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setDiffData(data);
        })
        .catch(() => {});
    } else {
      setDiffData(null);
    }
  }, [previewFile, previewSymbol]);

  if (!isOpen) return null;

  const handlePrune = async () => {
    setIsLoading(true);
    try {
      const res = await onConfirmPrune({
        branch,
        createBackup,
        dryRun: isDryRun,
      });
      setResult(res);
    } catch (err) {
      // Handled by hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {result ? "Prune Execution Completed" : "Synthesize Safe Prune Branch"}
              </h3>
              <p className="text-xs text-slate-400">
                {result
                  ? "Changes committed to dedicated Git branch"
                  : `${selectedCount} dead items selected for elimination`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Success Screen */}
        {result ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg shrink-0 mt-0.5">
                <Check className="w-4 h-4" />
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-emerald-300">
                  {result.dryRun ? "Dry Run Completed" : "Git Cleanup Branch Ready!"}
                </p>
                {result.branch && (
                  <p className="font-mono text-slate-200">Branch: {result.branch}</p>
                )}
                {result.commitHash && (
                  <p className="font-mono text-slate-400">Commit: {result.commitHash.slice(0, 7)}</p>
                )}
                {result.snapshotId && (
                  <p className="font-mono text-slate-400">Snapshot Backup: {result.snapshotId}</p>
                )}
                <p className="text-slate-400 pt-1">
                  Deleted {result.deletedFiles.length} files, modified {result.modifiedFiles.length} files. Recovered {(result.totalDeadBytesSaved / 1024).toFixed(1)} KB.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Close Studio
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Diff Preview if available */}
            {diffData && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>AST Rewrite Diff: <code className="text-cyan-300">{previewFile}</code></span>
                  {previewSymbol && (
                    <span className="text-rose-400 text-[11px]">Removing: {previewSymbol}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono rounded-lg overflow-hidden border border-border">
                  <div className="bg-slate-950 p-3 max-h-48 overflow-y-auto">
                    <span className="text-slate-500 block mb-1">Before:</span>
                    <pre className="text-slate-300">{diffData.original}</pre>
                  </div>
                  <div className="bg-slate-950 p-3 max-h-48 overflow-y-auto">
                    <span className="text-emerald-500 block mb-1">After (Pruned):</span>
                    <pre className="text-slate-300">{diffData.transformed}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* Options Form */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Git Branch Name:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-slate-900 border border-border rounded-lg px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                    placeholder="treeprune/cleanup-dead-code"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createBackup}
                    onChange={(e) => setCreateBackup(e.target.checked)}
                    className="rounded border-border bg-slate-900 text-cyan-500 focus:ring-0"
                  />
                  <span>Create rollback snapshot before applying</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="rounded border-border bg-slate-900 text-cyan-500 focus:ring-0"
                  />
                  <span>Dry run (preview changes without writing to disk)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrune}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Prune...
                  </>
                ) : (
                  <>
                    <GitBranch className="w-4 h-4" />
                    {isDryRun ? "Execute Dry Run" : "Create Cleanup Branch & Commit"}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
