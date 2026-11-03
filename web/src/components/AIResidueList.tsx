import React from "react";
import { AIDuplicateCluster } from "../types.js";
import { Sparkles, FileCode } from "lucide-react";

interface Props {
  clusters: AIDuplicateCluster[];
}

export const AIResidueList: React.FC<Props> = ({ clusters }) => {
  if (clusters.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/80 rounded-xl p-12 text-center flex flex-col items-center">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Zero AI Residue Clusters</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          No duplicate helper clones or hallucinated utility functions detected across project subdirectories.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
        <div className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-emerald-200">AI Assistant Duplicate Fingerprinting:</span> Coding assistants (Cursor, Claude Code) frequently generate duplicate utility helpers in isolated directories instead of reusing existing ones. TreePrune normalizes AST function bodies into structural fingerprints to identify clone clusters across your codebase.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.hash}
            className="bg-surface/80 border border-border/80 rounded-xl p-4 flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  {cluster.name}()
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-border">
                  Hash: {cluster.hash}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Identical AST function body implemented across {cluster.instances.length} files:
              </p>

              <div className="space-y-1.5">
                {cluster.instances.map((inst, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-slate-900/60 border border-border/50 text-xs font-mono text-slate-300 flex items-center justify-between"
                  >
                    <span className="truncate max-w-[280px]">{inst.filePath}:{inst.line}</span>
                    <span className="text-[11px] text-slate-500 shrink-0 ml-2">
                      {inst.callersCount} callers
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
