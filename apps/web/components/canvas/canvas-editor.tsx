"use client";

import React, { useCallback, useId } from "react";
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
import type { CanvasNodeType } from "@gestor-ide/core";
import { cn } from "@/lib/utils";

interface CanvasEditorProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
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

export function CanvasEditor({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
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
  const defaultEdgeOptions = {
    type: "default",
    animated: false,
    style: {
      strokeWidth: 2,
      stroke: "var(--border-hover, #64748b)",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: "var(--border-hover, #64748b)",
    },
  };

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={canEdit ? onConnect : undefined}
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
            nodeStrokeWidth={3}
            className="!bottom-4 !right-4 !border !border-border !bg-card !shadow-lg !rounded-lg overflow-hidden"
            nodeColor={(n) => {
              if (n.type === "task") return "var(--primary, #0f172a)";
              if (n.type === "page") return "var(--chart-3, #10b981)";
              if (n.type === "source") return "var(--chart-5, #8b5cf6)";
              if (n.type === "action") return "var(--chart-4, #f59e0b)";
              if (n.type === "note") return "#eab308";
              return "var(--muted-foreground, #94a3b8)";
            }}
            maskColor="rgba(0, 0, 0, 0.15)"
          />
        )}
      </ReactFlow>
    </div>
  );
}
