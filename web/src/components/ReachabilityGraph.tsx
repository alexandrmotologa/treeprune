import React, { useRef, useEffect, useState, useMemo } from "react";
import { GraphNode, GraphEdge } from "../types.js";
import { ZoomIn, ZoomOut, RotateCcw, Filter } from "lucide-react";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode?: (node: GraphNode) => void;
}

interface Point {
  x: number;
  y: number;
}

interface CanvasNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const ReachabilityGraph: React.FC<Props> = ({ nodes, edges, onSelectNode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<CanvasNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "dead" | "reachable">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Position nodes into clusters: Roots on left, Reachable in center, Dead on right
  const canvasNodes = useMemo(() => {
    const list: CanvasNode[] = [];
    const width = 1200;
    const height = 800;

    // Filter nodes if needed
    const filtered = nodes.filter((n) => {
      if (filterMode === "dead") return !n.reachable;
      if (filterMode === "reachable") return n.reachable;
      return true;
    });

    const rootNodes = filtered.filter((n) => n.isRoot);
    const reachableNonRoots = filtered.filter((n) => n.reachable && !n.isRoot);
    const deadNodes = filtered.filter((n) => !n.reachable);

    // Layout Roots (Col 1)
    rootNodes.forEach((n, idx) => {
      const step = height / (rootNodes.length + 1);
      list.push({
        ...n,
        x: 150 + (idx % 2) * 50,
        y: step * (idx + 1) + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
        radius: n.kind === "file" ? 8 : 6,
      });
    });

    // Layout Reachable (Col 2-3)
    reachableNonRoots.forEach((n, idx) => {
      const cols = 3;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const rowHeight = height / (Math.ceil(reachableNonRoots.length / cols) + 1);
      list.push({
        ...n,
        x: 350 + col * 120 + (Math.random() - 0.5) * 40,
        y: (row + 1) * Math.max(rowHeight, 40) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: n.kind === "file" ? 7 : 5,
      });
    });

    // Layout Dead Island (Col 4-5)
    deadNodes.forEach((n, idx) => {
      const cols = 4;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const rowHeight = height / (Math.ceil(deadNodes.length / cols) + 1);
      list.push({
        ...n,
        x: 750 + col * 100 + (Math.random() - 0.5) * 40,
        y: (row + 1) * Math.max(rowHeight, 35) + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        radius: n.kind === "file" ? 7 : 5,
      });
    });

    return list;
  }, [nodes, filterMode]);

  // Fast node ID lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    canvasNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [canvasNodes]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.scale(zoom, zoom);

      // Draw cluster background zones
      ctx.fillStyle = "rgba(6, 182, 212, 0.03)";
      ctx.fillRect(80, 40, 220, canvas.height - 80);
      ctx.fillStyle = "rgba(16, 185, 129, 0.02)";
      ctx.fillRect(320, 40, 380, canvas.height - 80);
      ctx.fillStyle = "rgba(244, 63, 94, 0.03)";
      ctx.fillRect(720, 40, 420, canvas.height - 80);

      // Draw cluster headers
      ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#06b6d4";
      ctx.fillText("ENTRYPOINT ROOTS", 100, 30);
      ctx.fillStyle = "#10b981";
      ctx.fillText("REACHABLE CALL GRAPH", 340, 30);
      ctx.fillStyle = "#f43f5e";
      ctx.fillText("THE DEAD ISLAND (ORPHANS)", 740, 30);

      // Draw Edges
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

      // Draw Nodes
      for (const node of canvasNodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

        // Color node by state
        let fill = "#64748b";
        if (node.isRoot) {
          fill = "#06b6d4"; // Cyan
        } else if (node.kind === "route") {
          fill = "#a855f7"; // Purple
        } else if (!node.reachable) {
          fill = "#f43f5e"; // Rose
        } else {
          fill = "#10b981"; // Emerald
        }

        ctx.fillStyle = fill;
        ctx.fill();

        // Selected / Hovered ring
        if (node.id === selectedNode?.id || node.id === hoveredNode?.id) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
        }

        // Node label if zoom is sufficient or hovered
        if (zoom > 0.8 || node.id === hoveredNode?.id || node.id === selectedNode?.id) {
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.fillStyle = node.reachable ? "#94a3b8" : "#fca5a5";
          const label = node.symbolName || node.filePath.split("/").pop() || "";
          ctx.fillText(label, node.x + node.radius + 4, node.y + 3);
        }
      }

      ctx.restore();
    };

    render();
  }, [canvasNodes, edges, offset, zoom, hoveredNode, selectedNode, nodeMap]);

  // Mouse interaction handlers
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

    // Check hit test for hover
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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

  return (
    <div className="relative w-full h-[650px] bg-slate-950/80 border border-border/80 rounded-xl overflow-hidden flex flex-col">
      {/* Top Toolbar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
        {/* Filters */}
        <div className="flex items-center gap-2 pointer-events-auto bg-surface/90 border border-border/80 backdrop-blur rounded-lg p-1.5 shadow-md">
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

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1 pointer-events-auto bg-surface/90 border border-border/80 backdrop-blur rounded-lg p-1 shadow-md">
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
          </div>
        </div>
      )}
    </div>
  );
};
