"use client";

import React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FunnelEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  const isYes = typeof label === "string" && label.toLowerCase().includes("sim");
  const isNo = typeof label === "string" && (label.toLowerCase().includes("não") || label.toLowerCase().includes("nao"));

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 2,
          stroke: selected
            ? "hsl(var(--primary))"
            : (style.stroke as string) || "var(--border-hover, #64748b)",
          strokeDasharray: isNo ? "5 5" : undefined,
          transition: "stroke 0.2s, stroke-width 0.2s",
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex items-center gap-1 z-20 group"
        >
          {label && (
            <div
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-md transition-transform backdrop-blur-md select-none",
                isYes
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50"
                  : isNo
                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/50"
                  : "bg-card/90 text-foreground border border-border"
              )}
            >
              {label}
            </div>
          )}

          {/* Delete Button on Hover / Selection */}
          {selected && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md hover:scale-110 active:scale-95 transition-all"
              title="Excluir conexão"
            >
              <X className="size-3 stroke-[2.5]" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
