import React, { useState } from "react";
import { UnusedDependency } from "../types.js";
import { PackageX, Copy, Check, Terminal } from "lucide-react";

interface Props {
  deps: UnusedDependency[];
}

export const UnusedDepsList: React.FC<Props> = ({ deps }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (deps.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/80 rounded-xl p-12 text-center flex flex-col items-center">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
          <PackageX className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Zero Unused Dependencies</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          All packages declared in package.json, requirements.txt, or go.mod are imported and reachable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
        <div className="p-1.5 bg-blue-500/20 text-blue-300 rounded-lg shrink-0 mt-0.5">
          <PackageX className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-blue-200">Dependency Weight Elimination:</span> These packages are declared in your dependency manifests but have <span className="font-semibold text-rose-300">zero import statements</span> in reachable code. Removing them shrinks Docker image sizes, cuts CI install times, and eliminates supply chain vulnerabilities.
        </div>
      </div>

      <div className="bg-surface/80 border border-border/80 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 border-b border-border text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Package</th>
              <th className="py-3 px-4">Version</th>
              <th className="py-3 px-4">Manifest</th>
              <th className="py-3 px-4 text-right">Removal Command</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {deps.map((dep, idx) => (
              <tr key={dep.name} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-mono font-semibold text-slate-100 text-sm">{dep.name}</span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-400">
                  {dep.version || "latest"}
                </td>
                <td className="py-3 px-4">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-border">
                    {dep.manifestFile}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => copyCommand(dep.uninstallCommand, idx)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-border transition-colors font-mono text-[11px]"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        <code>{dep.uninstallCommand}</code>
                        <Copy className="w-3 h-3 text-slate-500 ml-1" />
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
