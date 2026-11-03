import React, { useState } from "react";
import { GraphNode } from "../types.js";
import { FileCode, AlertCircle, CheckSquare, Square, Eye } from "lucide-react";

interface Props {
  deadFiles: string[];
  deadExports: GraphNode[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onPreviewDiff: (filePath: string, symbolName?: string) => void;
}

export const DeadItemList: React.FC<Props> = ({
  deadFiles,
  deadExports,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onPreviewDiff,
}) => {
  const [tab, setTab] = useState<"all" | "files" | "exports">("all");

  const allItemsCount = deadFiles.length + deadExports.length;
  const allSelected = allItemsCount > 0 && selectedIds.size >= allItemsCount;

  return (
    <div className="space-y-4">
      {/* Top Filter and Select-All Bar */}
      <div className="flex items-center justify-between bg-surface/60 border border-border/80 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectAll(!allSelected)}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            Select All ({allItemsCount})
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-border">
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              tab === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            All Items ({allItemsCount})
          </button>
          <button
            onClick={() => setTab("files")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              tab === "files" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Dead Files ({deadFiles.length})
          </button>
          <button
            onClick={() => setTab("exports")}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              tab === "exports" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Unused Exports ({deadExports.length})
          </button>
        </div>
      </div>

      {/* Dead Files Table */}
      {(tab === "all" || tab === "files") && deadFiles.length > 0 && (
        <div className="bg-surface/80 border border-border/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-border flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-orange-400" /> Completely Dead Files ({deadFiles.length})
            </span>
            <span className="text-[11px] text-slate-400">Will be unlinked from repository</span>
          </div>

          <div className="divide-y divide-border/60">
            {deadFiles.map((file) => {
              const isSelected = selectedIds.has(file);
              return (
                <div
                  key={file}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors text-xs ${
                    isSelected ? "bg-rose-500/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleSelect(file)}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <span className="font-mono text-slate-200 font-medium">{file}</span>
                      <p className="text-[11px] text-rose-400/80 mt-0.5">
                        Zero incoming calls or imports across whole project graph
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      Delete File
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dead Exports Table */}
      {(tab === "all" || tab === "exports") && deadExports.length > 0 && (
        <div className="bg-surface/80 border border-border/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 bg-slate-900/60 border-b border-border flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" /> Unused Export Declarations ({deadExports.length})
            </span>
            <span className="text-[11px] text-slate-400">Safely removed via AST rewrite</span>
          </div>

          <div className="divide-y divide-border/60">
            {deadExports.map((exp) => {
              const isSelected = selectedIds.has(exp.id);
              return (
                <div
                  key={exp.id}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors text-xs ${
                    isSelected ? "bg-amber-500/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onToggleSelect(exp.id)}
                      className="text-slate-500 hover:text-white transition-colors"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-100 font-semibold text-sm">
                          {exp.symbolName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {exp.kind}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                        {exp.filePath}:{exp.loc.start.line}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px] font-mono">
                      {(exp.byteSize / 1024).toFixed(1)} KB ({exp.lineCount} lines)
                    </span>
                    <button
                      onClick={() => onPreviewDiff(exp.filePath, exp.symbolName)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-border rounded-lg transition-colors"
                      title="Inspect AST Diff"
                    >
                      <Eye className="w-3.5 h-3.5" /> Diff
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
