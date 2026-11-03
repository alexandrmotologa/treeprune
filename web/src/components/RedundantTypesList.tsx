import React from "react";
import { RedundantTypeCluster } from "../types.js";
import { Layers, Code, ExternalLink } from "lucide-react";
import { getEditorLink } from "../utils/editor.js";

interface Props {
  clusters: RedundantTypeCluster[];
  projectRoot: string;
}

export const RedundantTypesList: React.FC<Props> = ({ clusters, projectRoot }) => {
  if (clusters.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/80 rounded-xl p-12 text-center flex flex-col items-center">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
          <Layers className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Zero Redundant Type Declarations</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          No duplicate interfaces or type aliases declared across different modules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4 flex items-start gap-3">
        <div className="p-1.5 bg-cyan-500/20 text-cyan-300 rounded-lg shrink-0 mt-0.5">
          <Layers className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-cyan-200">Redundant Type Consolidation:</span> These interfaces or type aliases share identical names across multiple files without importing from a single source of truth. Consolidating them prevents schema drift.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.name}
            className="bg-surface/80 border border-border/80 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono">
                  {cluster.kind}
                </span>
                {cluster.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {cluster.instances.length} declarations
              </span>
            </div>

            <div className="space-y-1.5 mt-3">
              {cluster.instances.map((inst, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded bg-slate-900/60 border border-border/50 text-xs font-mono text-slate-300 flex items-center justify-between"
                >
                  <span className="truncate max-w-[280px]">
                    {inst.filePath}:{inst.line}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {inst.isExported ? "exported" : "internal"}
                    </span>
                    <a
                      href={getEditorLink(projectRoot, inst.filePath, inst.line, "cursor")}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Open in Cursor"
                    >
                      <Code className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
