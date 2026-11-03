import React from "react";
import { Trash2, Skull, FileCode, PackageX, Sparkles, AlertCircle } from "lucide-react";
import { AnalysisSummary } from "../types.js";

interface Props {
  summary: AnalysisSummary;
  zombieCount: number;
  unusedDepsCount: number;
  aiResidueCount: number;
}

export const DeadWeightMetrics: React.FC<Props> = ({
  summary,
  zombieCount,
  unusedDepsCount,
  aiResidueCount,
}) => {
  const deadKb = (summary.deadBytes / 1024).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* 1. Recoverable Wasted Bytes */}
      <div className="bg-surface/80 border border-border/80 rounded-xl p-4 flex flex-col justify-between backdrop-blur shadow-sm hover:border-slate-600 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Dead Weight</span>
          <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
            <Trash2 className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-rose-400">{deadKb} <span className="text-sm font-normal text-slate-400">KB</span></div>
          <div className="text-xs text-slate-400 mt-1">
            {summary.deadLines.toLocaleString()} dead lines ({summary.wastedPercentage}% of repo)
          </div>
        </div>
      </div>

      {/* 2. Dead Files */}
      <div className="bg-surface/80 border border-border/80 rounded-xl p-4 flex flex-col justify-between backdrop-blur shadow-sm hover:border-slate-600 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Dead Files</span>
          <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400">
            <FileCode className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-orange-400">
            {summary.deadFilesCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            of {summary.scannedFiles} files scanned
          </div>
        </div>
      </div>

      {/* 3. Dead Symbols */}
      <div className="bg-surface/80 border border-border/80 rounded-xl p-4 flex flex-col justify-between backdrop-blur shadow-sm hover:border-slate-600 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Orphan Exports</span>
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {summary.deadNodes}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            unreachable AST nodes
          </div>
        </div>
      </div>

      {/* 4. Zombie Endpoints */}
      <div className="bg-surface/80 border border-border/80 rounded-xl p-4 flex flex-col justify-between backdrop-blur shadow-sm hover:border-slate-600 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Zombie Routes</span>
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Skull className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {zombieCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            0 frontend network calls
          </div>
        </div>
      </div>

      {/* 5. Unused Packages */}
      <div className="bg-surface/80 border border-border/80 rounded-xl p-4 flex flex-col justify-between backdrop-blur shadow-sm hover:border-slate-600 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">Dead Deps</span>
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <PackageX className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-blue-400">
            {unusedDepsCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            in package.json / reqs
          </div>
        </div>
      </div>

      {/* 6. AI Residue Clusters */}
      <div className="bg-surface/80 border border-border/80 rounded-xl p-4 flex flex-col justify-between backdrop-blur shadow-sm hover:border-slate-600 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-medium uppercase tracking-wider">AI Residue</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {aiResidueCount}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            duplicate helper clones
          </div>
        </div>
      </div>
    </div>
  );
};
