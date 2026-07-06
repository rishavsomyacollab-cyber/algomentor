"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { api } from "@/lib/api";
import type { Topic } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphEdge {
  source: string;
  target: string;
  rel_type: string;
}

interface TopicGraphProps {
  /** Show ego-graph for a single topic */
  topicId?: string;
  /** Show full category subgraph */
  category?: string;
  /** Currently highlighted topic id */
  currentTopicId?: string;
  onTopicSelect?: (topic: Topic) => void;
  height?: number;
}

// ── Colour helpers ────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  beginner:     { border: "#10b981", bg: "rgba(16,185,129,.1)",  text: "#34d399" },
  intermediate: { border: "#f59e0b", bg: "rgba(245,158,11,.1)",  text: "#fbbf24" },
  advanced:     { border: "#ef4444", bg: "rgba(239,68,68,.1)",   text: "#f87171" },
};

const diffColor = (d: string) =>
  DIFF_COLORS[d?.toLowerCase()] ?? { border: "#475569", bg: "rgba(71,85,105,.1)", text: "#94a3b8" };

// ── Custom node ───────────────────────────────────────────────────────────────

function TopicNode({ data }: NodeProps) {
  const c = diffColor(data.difficulty as string);
  const isCurrent = data.isCurrent as boolean;

  return (
    <div
      onClick={() => typeof data.onSelect === "function" && data.onSelect()}
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        background: isCurrent ? "rgba(99,102,241,.18)" : "#0d1117",
        border: `1.5px solid ${isCurrent ? "#6366f1" : c.border}`,
        boxShadow: isCurrent
          ? "0 0 0 3px rgba(99,102,241,.25), 0 4px 16px rgba(0,0,0,.5)"
          : "0 2px 8px rgba(0,0,0,.4)",
        cursor: "pointer",
        minWidth: 140,
        maxWidth: 180,
        transition: "box-shadow .15s",
        userSelect: "none",
      }}
    >
      <Handle type="target" position={Position.Left}  style={{ background: c.border, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: c.border, width: 8, height: 8 }} />

      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4, lineHeight: 1.3 }}>
        {data.name as string}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: ".06em",
        padding: "1px 6px", borderRadius: 99,
        background: c.bg, color: c.text, border: `1px solid ${c.border}44`,
      }}>
        {(data.difficulty as string) || "—"}
      </span>
    </div>
  );
}

const nodeTypes = { topic: TopicNode };

// ── Layout algorithm ──────────────────────────────────────────────────────────

function computeLayout(
  rawNodes: Array<{ id: string; name: string; difficulty: string; category: string }>,
  rawEdges: GraphEdge[],
): Node[] {
  // BFS levels from PREREQUISITE edges
  const outgoing = new Map<string, string[]>();
  const inDegree  = new Map<string, number>();
  for (const n of rawNodes) { outgoing.set(n.id, []); inDegree.set(n.id, 0); }
  for (const e of rawEdges) {
    if (e.rel_type === "PREREQUISITE") {
      outgoing.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }
  }

  const level = new Map<string, number>();
  const queue: string[] = [];
  for (const n of rawNodes) {
    if ((inDegree.get(n.id) ?? 0) === 0) { level.set(n.id, 0); queue.push(n.id); }
  }
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nxt of outgoing.get(cur) ?? []) {
      const nxtLevel = Math.max(level.get(nxt) ?? 0, (level.get(cur) ?? 0) + 1);
      level.set(nxt, nxtLevel);
      queue.push(nxt);
    }
  }

  // Nodes with no edges: fall back to difficulty-based column
  const diffLevel: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  for (const n of rawNodes) {
    if (!level.has(n.id)) level.set(n.id, diffLevel[n.difficulty?.toLowerCase()] ?? 1);
  }

  // Group by level, sort within each level by name
  const byLevel = new Map<number, typeof rawNodes>();
  for (const n of rawNodes) {
    const l = level.get(n.id) ?? 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(n);
  }
  byLevel.forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));

  const X_GAP = 280, Y_GAP = 110;
  const nodes: Node[] = [];
  byLevel.forEach((arr, col) => {
    const totalH = (arr.length - 1) * Y_GAP;
    arr.forEach((n, row) => {
      nodes.push({
        id: n.id,
        type: "topic",
        position: { x: col * X_GAP + 40, y: row * Y_GAP - totalH / 2 + 250 },
        data: { ...n },
      });
    });
  });
  return nodes;
}

// ── Ego-graph layout (neighbourhood view) ────────────────────────────────────

function computeNeighborhoodLayout(
  center: { id: string; name: string; difficulty: string; category: string },
  prereqs: typeof center[],
  next: typeof center[],
  related: typeof center[],
): Node[] {
  const nodes: Node[] = [];
  const cx = 400, cy = 260, xGap = 280, yGap = 110;

  // Center
  nodes.push({ id: center.id, type: "topic", position: { x: cx, y: cy }, data: { ...center, isCurrent: true } });

  // Prerequisites — left column
  prereqs.forEach((n, i) => {
    const y = cy + (i - (prereqs.length - 1) / 2) * yGap;
    nodes.push({ id: n.id, type: "topic", position: { x: cx - xGap, y }, data: { ...n } });
  });

  // Next topics — right column
  next.forEach((n, i) => {
    const y = cy + (i - (next.length - 1) / 2) * yGap;
    nodes.push({ id: n.id, type: "topic", position: { x: cx + xGap, y }, data: { ...n } });
  });

  // Related — bottom row
  related.forEach((n, i) => {
    const x = cx + (i - (related.length - 1) / 2) * (xGap * 0.8);
    nodes.push({ id: n.id, type: "topic", position: { x, y: cy + yGap * 1.8 }, data: { ...n } });
  });

  return nodes;
}

// ── Edge factory ──────────────────────────────────────────────────────────────

function makeEdges(rawEdges: GraphEdge[], nodeIds: Set<string>): Edge[] {
  return rawEdges
    .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
    .map(e => ({
      id: `${e.source}-${e.rel_type}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: false,
      style: {
        stroke: e.rel_type === "PREREQUISITE" ? "#6366f1" : "#22d3ee",
        strokeWidth: 2,
        strokeDasharray: e.rel_type === "RELATED" ? "5,4" : undefined,
      },
      markerEnd: e.rel_type === "PREREQUISITE" ? {
        type: MarkerType.ArrowClosed,
        color: "#6366f1",
        width: 16, height: 16,
      } : undefined,
      label: e.rel_type === "RELATED" ? "related" : undefined,
      labelStyle: { fill: "#22d3ee", fontSize: 9, fontWeight: 600 },
      labelBgStyle: { fill: "#0d1117" },
    }));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TopicGraph({
  topicId,
  category,
  currentTopicId,
  onTopicSelect,
  height = 480,
}: TopicGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const handleSelect = useCallback(
    (t: { id: string; name: string; difficulty: string; category: string; description?: string }) => {
      onTopicSelect?.({
        id: t.id, name: t.name,
        difficulty: t.difficulty as Topic["difficulty"],
        category: t.category,
        description: t.description ?? "",
      });
    },
    [onTopicSelect],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    async function load() {
      try {
        // ── Ego-graph (single topic) ──────────────────────────────────────
        if (topicId) {
          const [nbr, allEdgesRes] = await Promise.all([
            api.getTopicNeighborhood(topicId),
            api.getAllGraphEdges(),
          ]);
          if (cancelled) return;

          const center = { id: topicId, name: topicId, difficulty: "", category: "" };
          const rfNodes = computeNeighborhoodLayout(
            center,
            nbr.prerequisites as Array<{ id: string; name: string; difficulty: string; category: string }>,
            nbr.next as Array<{ id: string; name: string; difficulty: string; category: string }>,
            nbr.related as Array<{ id: string; name: string; difficulty: string; category: string }>,
          );

          // Attach select handler
          const withHandler = rfNodes.map(n => ({
            ...n,
            data: { ...n.data, onSelect: () => handleSelect(n.data as Parameters<typeof handleSelect>[0]) },
          }));

          const ids = new Set(withHandler.map(n => n.id));
          setNodes(withHandler);
          setEdges(makeEdges(allEdgesRes, ids));

        // ── Category subgraph ─────────────────────────────────────────────
        } else if (category) {
          const sub = await api.getCategorySubgraph(category);
          if (cancelled) return;

          const rawNodes = sub.nodes as Array<{ id: string; name: string; difficulty: string; category: string; description?: string }>;
          const rfNodes  = computeLayout(rawNodes, sub.edges);

          const withHandler = rfNodes.map(n => ({
            ...n,
            data: {
              ...n.data,
              isCurrent: n.id === currentTopicId,
              onSelect: () => handleSelect({
                ...(rawNodes.find(r => r.id === n.id) ?? { id: n.id, name: String(n.data.name), difficulty: String(n.data.difficulty), category: String(n.data.category) }),
              }),
            },
          }));

          const ids = new Set(withHandler.map(n => n.id));
          setNodes(withHandler);
          setEdges(makeEdges(sub.edges, ids));
        }
      } catch (e) {
        if (!cancelled) setError("Graph unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [topicId, category, currentTopicId, handleSelect]);

  if (loading) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
      Loading graph…
    </div>
  );

  if (error || nodes.length === 0) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: "#475569" }}>
      <span style={{ fontSize: 32 }}>🕸️</span>
      <span style={{ fontSize: 13 }}>No graph data available for this topic</span>
    </div>
  );

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid #1e2535", background: "#070911" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e2535" gap={20} />
        <Controls style={{ background: "#0d1117", border: "1px solid #1e2535" }} />
        <MiniMap
          style={{ background: "#070911", border: "1px solid #1e2535" }}
          nodeColor={n => diffColor((n.data as { difficulty?: string }).difficulty ?? "").border}
          maskColor="rgba(7,9,15,.6)"
        />
      </ReactFlow>

      {/* Legend */}
      <div style={{
        position: "absolute", bottom: 12, right: 12,
        display: "flex", flexDirection: "column", gap: 6,
        padding: "8px 12px",
        background: "rgba(7,9,15,.85)",
        border: "1px solid #1e2535",
        borderRadius: 8,
        pointerEvents: "none",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#334155", marginBottom: 2 }}>Legend</span>
        {[
          { color: "#6366f1", label: "prerequisite", dash: false },
          { color: "#22d3ee", label: "related",      dash: true  },
        ].map(({ color, label, dash }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width={24} height={12} style={{ flexShrink: 0 }}>
              <line x1={0} y1={6} x2={24} y2={6}
                stroke={color} strokeWidth={2}
                strokeDasharray={dash ? "5,4" : undefined} />
              {!dash && <polygon points="16,2 24,6 16,10" fill={color} />}
            </svg>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
        <div style={{ height: 1, background: "#1e2535", margin: "2px 0" }} />
        {[
          { color: "#10b981", label: "beginner" },
          { color: "#f59e0b", label: "intermediate" },
          { color: "#ef4444", label: "advanced" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
