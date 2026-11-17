"use client";

import React, { useCallback, useMemo } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CANVAS_NODE_TYPES } from "./nodes";
import { FunnelEdge } from "./custom-edge";
import type { CanvasNodeType } from "@gestor-ide/core";
import { cn } from "@/lib/utils";

interface CanvasEditorProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onReconnect?: (oldEdge: Edge, newConnection: Connection) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (node: Node | null) => void;
  onSelectEdge: (edge: Edge | null) => void;
  onDropNode: (
    type: CanvasNodeType,
    data: Record<string, unknown>,
    position: { x: number; y: number }
  ) => void;
  showMinimap: boolean;
  canEdit: boolean;
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
}

const EDGE_TYPES = {
  default: FunnelEdge,
  bezier: FunnelEdge,
  funnel: FunnelEdge,
};

export function CanvasEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onReconnect,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onDropNode,
  showMinimap,
  canEdit,
  screenToFlowPosition,
}: CanvasEditorProps) {
  // Configuração padrão de arestas (Bézier suave e seta indicadora)
  const defaultEdgeOptions = useMemo(
    () => ({
      type: "default",
      animated: false,
      style: {
        strokeWidth: 2,
        stroke: "var(--border-hover, #64748b)",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: "var(--border-hover, #64748b)",
      },
    }),
    []
  );

  // Drag over para aceitar elementos da biblioteca
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Drop de novo elemento
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!canEdit) return;

      const rawData = event.dataTransfer.getData("application/gestor-canvas-node");
      if (!rawData) return;

      try {
        const parsed = JSON.parse(rawData) as {
          type: CanvasNodeType;
          data: Record<string, unknown>;
        };

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        onDropNode(parsed.type, parsed.data || {}, position);
      } catch (err) {
        console.error("Falha ao processar drop no canvas:", err);
      }
    },
    [canEdit, onDropNode, screenToFlowPosition]
  );

  // Clique em nós
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectEdge(null);
      onSelectNode(node);
    },
    [onSelectEdge, onSelectNode]
  );

  // Clique em arestas
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      onSelectNode(null);
      onSelectEdge(edge);
    },
    [onSelectNode, onSelectEdge]
  );

  // Clique no fundo limpa seleções
  const handlePaneClick = useCallback(() => {
    onSelectNode(null);
    onSelectEdge(null);
  }, [onSelectNode, onSelectEdge]);

  // Aplica classe de destaque para nó e aresta selecionados
  const formattedNodes = React.useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      selected: n.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId]);

  const formattedEdges = React.useMemo(() => {
    return edges.map((e) => ({
      ...e,
      selected: e.id === selectedEdgeId,
    }));
  }, [edges, selectedEdgeId]);

  return (
    <div
      className="relative h-full w-full flex-1 select-none overflow-hidden bg-background"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={formattedNodes}
        edges={formattedEdges}
        nodeTypes={CANVAS_NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={canEdit ? onConnect : undefined}
        onReconnect={canEdit ? onReconnect : undefined}
        edgesReconnectable={canEdit}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        elementsSelectable={true}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2.5}
        className="touch-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color="var(--border-subtle, #cbd5e1)"
          className="opacity-70 dark:opacity-40"
        />

        <Controls
          showInteractive={false}
          className="!bottom-4 !left-4 !border-border !bg-card !text-foreground !shadow-md !rounded-lg overflow-hidden [&>button]:!border-border [&>button]:!bg-card [&>button]:!text-foreground hover:[&>button]:!bg-muted"
        />

        {showMinimap && (
          <MiniMap
            zoomable
            pannable
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            position="bottom-right"
            style={{
              width: 190,
              height: 110,
              backgroundColor: "hsl(var(--card) / 0.95)",
            }}
            className="!bottom-4 !right-4 !m-0 !rounded-xl !border !border-border !shadow-2xl !backdrop-blur-md overflow-hidden z-10"
            nodeColor={(n) => {
              if (n.type === "task") return "#3b82f6";
              if (n.type === "page") return "#10b981";
              if (n.type === "source") return "#8b5cf6";
              if (n.type === "action") return "#f59e0b";
              if (n.type === "email") return "#06b6d4";
              if (n.type === "decision") return "#a855f7";
              if (n.type === "note") return "#eab308";
              if (n.type === "database") return "#6366f1";
              return "#94a3b8";
            }}
            maskColor="rgba(15, 23, 42, 0.45)"
            maskStrokeColor="hsl(var(--primary))"
            maskStrokeWidth={1.5}
          />
        )}
      </ReactFlow>
    </div>
  );
}
