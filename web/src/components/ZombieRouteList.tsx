import React, { useState } from "react";
import { ZombieRoute } from "../types.js";
import { Skull, AlertTriangle, ShieldCheck, Code } from "lucide-react";
import { getEditorLink } from "../utils/editor.js";

interface Props {
  routes: ZombieRoute[];
  projectRoot: string;
}

export const ZombieRouteList: React.FC<Props> = ({ routes, projectRoot }) => {
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  const filteredRoutes = routes.filter((r) => {
    if (methodFilter === "ALL") return true;
    return r.method === methodFilter;
  });

  const getMethodBadgeClass = (m: string) => {
    switch (m.toUpperCase()) {
      case "GET":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "POST":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "DELETE":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "PUT":
      case "PATCH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  if (routes.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/80 rounded-xl p-12 text-center flex flex-col items-center">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Zero Zombie API Endpoints</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          Every declared backend HTTP route has corresponding client network invocations. No abandoned controllers detected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informational Callout */}
      <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 flex items-start gap-3">
        <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg shrink-0 mt-0.5">
          <Skull className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-purple-200">Zombie Route Protection:</span> These HTTP endpoints are declared in your controllers or route handlers, but TreePrune found <span className="font-semibold text-rose-300">0 matching client callsites</span> across frontend code (<code className="text-purple-300">fetch</code>, <code className="text-purple-300">axios</code>, API clients). Removing abandoned endpoints reduces attack surface and dead logic.
        </div>
      </div>

      {/* Methods Filter Bar */}
      <div className="flex items-center gap-2">
        {["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => (
          <button
            key={m}
            onClick={() => setMethodFilter(m)}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
              methodFilter === m
                ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                : "border-border text-slate-400 hover:text-white"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Routes Table */}
      <div className="bg-surface/80 border border-border/80 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/60 border-b border-border/80 text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Method & Path</th>
              <th className="py-3 px-4">Framework</th>
              <th className="py-3 px-4">Declared In</th>
              <th className="py-3 px-4 text-right">Invocations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredRoutes.map((route) => (
              <tr key={route.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border ${getMethodBadgeClass(
                        route.method
                      )}`}
                    >
                      {route.method}
                    </span>
                    <span className="font-mono font-medium text-slate-200 text-sm">
                      {route.path}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-border">
                    {route.framework}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>{route.filePath}:{route.line}</span>
                    <a
                      href={getEditorLink(projectRoot, route.filePath, route.line, "cursor")}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Open in Cursor"
                    >
                      <Code className="w-3.5 h-3.5 text-cyan-400" />
                    </a>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="inline-flex items-center gap-1 text-rose-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" /> 0 Calls
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
