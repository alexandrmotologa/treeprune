import React from "react";
import { CommentedCodeBlock } from "../types.js";
import { MessageSquareOff, Code, ExternalLink } from "lucide-react";
import { getEditorLink } from "../utils/editor.js";

interface Props {
  blocks: CommentedCodeBlock[];
  projectRoot: string;
}

export const CommentedCodeList: React.FC<Props> = ({ blocks, projectRoot }) => {
  if (blocks.length === 0) {
    return (
      <div className="bg-surface/60 border border-border/80 rounded-xl p-12 text-center flex flex-col items-center">
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full mb-3">
          <MessageSquareOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">Zero Commented-Out Code Blocks</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          No large blocks of commented dead functions or discarded refactors detected in source files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <div className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg shrink-0 mt-0.5">
          <MessageSquareOff className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-semibold text-amber-200">Commented-Out Dead Code:</span> Coding agents often comment out obsolete implementations during iterative prompts instead of deleting them. These blocks clutter source files and confuse future LLM context windows.
        </div>
      </div>

      <div className="space-y-3">
        {blocks.map((block) => (
          <div
            key={block.id}
            className="bg-surface/80 border border-border/80 rounded-xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-xs font-semibold text-slate-200">
                {block.filePath}:{block.startLine}-{block.endLine}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-border">
                  {block.lineCount} commented lines
                </span>
                <a
                  href={getEditorLink(projectRoot, block.filePath, block.startLine, "cursor")}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Open in Cursor"
                >
                  <Code className="w-3.5 h-3.5 text-cyan-400" />
                </a>
              </div>
            </div>

            <pre className="p-3 bg-slate-950 rounded-lg border border-border/60 text-[11px] font-mono text-slate-400 overflow-x-auto max-h-36">
              {block.snippet}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
