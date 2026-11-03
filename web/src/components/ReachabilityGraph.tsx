import React, { useRef, useEffect, useState, useMemo } from "react";
import { GraphNode, GraphEdge } from "../types.js";
import { ZoomIn, ZoomOut, RotateCcw, Filter, Search, Download, ExternalLink, Code } from "lucide-react";
import { getEditorLink } from "../utils/editor.js";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  projectRoot: string;
  onSelectNode?: (node: GraphNode) => void;
}

interface Point {
  x: number;
  y: number;
}

interface CanvasNode extends GraphNode {
  x: number;
  y: number;
  radius: number;
}

export const ReachabilityGraph: React.FC<Props> = ({
  nodes,
  edges,
  projectRoot,
  onSelectNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<CanvasNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "dead" | "reachable">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const canvasNodes = useMemo(() => {
    const list: CanvasNode[] = [];
    const height = 800;

    const filtered = nodes.filter((n) => {
      if (filterMode === "dead") return !n.reachable;
      if (filterMode === "reachable") return n.reachable;
      return true;
    });

    const rootNodes = filtered.filter((n) => n.isRoot);
    const reachableNonRoots = filtered.filter((n) => n.reachable && !n.isRoot);
    const deadNodes = filtered.filter((n) => !n.reachable);

    rootNodes.forEach((n, idx) => {
      const step = height / (rootNodes.length + 1);
      list.push({
        ...n,
        x: 150 + (idx % 2) * 50,
        y: step * (idx + 1) + (Math.random() - 0.5) * 30,
        radius: n.kind === "file" ? 8 : 6,
      });
    });

    reachableNonRoots.forEach((n, idx) => {
      const cols = 3;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const rowHeight = height / (Math.ceil(reachableNonRoots.length / cols) + 1);
      list.push({
        ...n,
        x: 350 + col * 120 + (Math.random() - 0.5) * 40,
        y: (row + 1) * Math.max(rowHeight, 40) + (Math.random() - 0.5) * 20,
        radius: n.kind === "file" ? 7 : 5,
      });
    });

    deadNodes.forEach((n, idx) => {
      const cols = 4;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const rowHeight = height / (Math.ceil(deadNodes.length / cols) + 1);
      list.push({
        ...n,
        x: 750 + col * 100 + (Math.random() - 0.5) * 40,
        y: (row + 1) * Math.max(rowHeight, 35) + (Math.random() - 0.5) * 20,
        radius: n.kind === "file" ? 7 : 5,
      });
    });

    return list;
  }, [nodes, filterMode]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    canvasNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [canvasNodes]);

  // Center camera on a specific node
  const focusNode = (target: CanvasNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const targetZoom = 1.3;
    setZoom(targetZoom);
    setOffset({
      x: canvas.width / 2 - target.x * targetZoom,
      y: canvas.height / 2 - target.y * targetZoom,
    });
    setSelectedNode(target);
    if (onSelectNode) onSelectNode(target);
  };

  // Search filter matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return canvasNodes
      .filter((n) => n.symbolName.toLowerCase().includes(q) || n.filePath.toLowerCase().includes(q))
      .slice(0, 5);
  }, [canvasNodes, searchQuery]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Cluster background zones
    ctx.fillStyle = "rgba(6, 182, 212, 0.03)";
    ctx.fillRect(80, 40, 220, canvas.height - 80);
    ctx.fillStyle = "rgba(16, 185, 129, 0.02)";
    ctx.fillRect(320, 40, 380, canvas.height - 80);
    ctx.fillStyle = "rgba(244, 63, 94, 0.03)";
    ctx.fillRect(720, 40, 420, canvas.height - 80);

    // Headers
    ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    ctx.fillStyle = "#06b6d4";
    ctx.fillText("ENTRYPOINT ROOTS", 100, 30);
    ctx.fillStyle = "#10b981";
    ctx.fillText("REACHABLE CALL GRAPH", 340, 30);
    ctx.fillStyle = "#f43f5e";
    ctx.fillText("THE DEAD ISLAND (ORPHANS)", 740, 30);

    // Edges
    for (const edge of edges) {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) continue;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);

      const isHighlighted =
        hoveredNode?.id === from.id ||
        hoveredNode?.id === to.id ||
        selectedNode?.id === from.id ||
        selectedNode?.id === to.id;

      if (isHighlighted) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
      } else if (!from.reachable || !to.reachable) {
        ctx.strokeStyle = "rgba(244, 63, 94, 0.15)";
        ctx.lineWidth = 0.8;
      } else {
        ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
        ctx.lineWidth = 0.8;
      }
      ctx.stroke();
    }

    // Nodes
    const isSearching = searchQuery.trim().length > 0;
    const lowerQuery = searchQuery.toLowerCase();

    for (const node of canvasNodes) {
      const isSearchMatch =
        isSearching &&
        (node.symbolName.toLowerCase().includes(lowerQuery) ||
          node.filePath.toLowerCase().includes(lowerQuery));

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      let fill = "#64748b";
      if (node.isRoot) {
        fill = "#06b6d4";
      } else if (node.kind === "route") {
        fill = "#a855f7";
      } else if (!node.reachable) {
        fill = "#f43f5e";
      } else {
        fill = "#10b981";
      }

      ctx.fillStyle = fill;
      ctx.fill();

      if (node.id === selectedNode?.id || node.id === hoveredNode?.id || isSearchMatch) {
        ctx.lineWidth = isSearchMatch ? 4 : 3;
        ctx.strokeStyle = isSearchMatch ? "#fbbf24" : "#ffffff";
        ctx.stroke();
      }

      if (zoom > 0.8 || node.id === hoveredNode?.id || node.id === selectedNode?.id || isSearchMatch) {
        ctx.font = isSearchMatch ? "bold 11px 'JetBrains Mono', monospace" : "10px 'JetBrains Mono', monospace";
        ctx.fillStyle = isSearchMatch ? "#fbbf24" : node.reachable ? "#94a3b8" : "#fca5a5";
        const label = node.symbolName || node.filePath.split("/").pop() || "";
        ctx.fillText(label, node.x + node.radius + 4, node.y + 3);
      }
    }

    ctx.restore();
  }, [canvasNodes, edges, offset, zoom, hoveredNode, selectedNode, nodeMap, searchQuery]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / zoom;
    const mouseY = (e.clientY - rect.top - offset.y) / zoom;

    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    let found: CanvasNode | null = null;
    for (const node of canvasNodes) {
      const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
      if (dist <= node.radius + 4) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / zoom;
    const mouseY = (e.clientY - rect.top - offset.y) / zoom;

    for (const node of canvasNodes) {
      const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
      if (dist <= node.radius + 4) {
        setSelectedNode(node);
        if (onSelectNode) onSelectNode(node);
        return;
      }
    }
    setSelectedNode(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(Math.max(z * delta, 0.3), 3));
  };

  const resetView = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const downloadGraphPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `treeprune-reachability-graph-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="relative w-full h-[650px] bg-slate-950/80 border border-border/80 rounded-xl overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        {/* Left: Filters and Search */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-surface/90 border border-border/80 backdrop-blur rounded-lg p-1.5 shadow-md">
            <Filter className="w-4 h-4 text-slate-400 ml-1" />
            <button
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                filterMode === "all" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({nodes.length})
            </button>
            <button
              onClick={() => setFilterMode("dead")}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                filterMode === "dead" ? "bg-rose-500/20 text-rose-300" : "text-slate-400 hover:text-white"
              }`}
            >
              Dead Only ({nodes.filter((n) => !n.reachable).length})
            </button>
            <button
              onClick={() => setFilterMode("reachable")}
              className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                filterMode === "reachable"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Reachable ({nodes.filter((n) => n.reachable).length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative bg-surface/90 border border-border/80 backdrop-blur rounded-lg shadow-md">
            <div className="flex items-center px-2.5 py-1">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search symbol / file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-36 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-slate-500 hover:text-slate-300 text-xs ml-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick search dropdown */}
            {searchMatches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl overflow-hidden z-30">
                {searchMatches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => {
                      focusNode(match);
                      setSearchQuery("");
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-slate-800 transition-colors flex items-center justify-between"
                  >
                    <span className="truncate text-slate-200">
                      {match.symbolName || match.filePath}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold ml-2 ${
                        match.reachable ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {match.reachable ? "live" : "dead"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Zoom & Export Controls */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-surface/90 border border-border/80 backdrop-blur rounded-lg p-1 shadow-md">
          <button
            onClick={() => setZoom((z) => Math.min(z * 1.2, 3))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z / 1.2, 0.3))}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={downloadGraphPng}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            title="Download Graph Image (PNG)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={650}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      />

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="absolute bottom-3 right-3 max-w-md w-full bg-surface/95 border border-border/80 backdrop-blur-md rounded-xl p-4 shadow-xl z-20 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span
                className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold rounded mb-1.5 ${
                  selectedNode.reachable
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-rose-500/20 text-rose-400"
                }`}
              >
                {selectedNode.reachable ? "Reachable" : "Dead Code"}
              </span>
              <h4 className="text-sm font-semibold font-mono text-white">
                {selectedNode.symbolName || selectedNode.filePath}
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedNode.filePath}:{selectedNode.loc.start.line}
              </p>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-border/60 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Kind:</span>
              <span className="text-slate-200 font-mono">{selectedNode.kind}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Language:</span>
              <span className="text-slate-200 capitalize">{selectedNode.language}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Distance from Root:</span>
              <span className="text-slate-200 font-mono">
                {selectedNode.reachabilityDistance >= 0
                  ? `${selectedNode.reachabilityDistance} hops`
                  : "Unreachable (∞)"}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Confidence:</span>
              <span
                className={`font-semibold ${
                  selectedNode.confidence === "high"
                    ? "text-emerald-400"
                    : "text-amber-400"
                }`}
              >
                {selectedNode.confidence.toUpperCase()}
              </span>
            </div>

            {selectedNode.reasons.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/40">
                <span className="text-[11px] text-slate-400 font-medium">Diagnostic Reasons:</span>
                <ul className="list-disc list-inside text-rose-300/90 text-[11px] mt-1 space-y-0.5">
                  {selectedNode.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Open in IDE buttons */}
            <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2">
              <a
                href={getEditorLink(projectRoot, selectedNode.filePath, selectedNode.loc.start.line, "cursor")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-mono border border-border transition-colors"
                title="Open directly in Cursor at this line"
              >
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                Cursor
              </a>
              <a
                href={getEditorLink(projectRoot, selectedNode.filePath, selectedNode.loc.start.line, "vscode")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-mono border border-border transition-colors"
                title="Open directly in VS Code at this line"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                VS Code
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
