"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StartEndNodeData {
  title?: string;
  kind?: "start" | "end";
}

export const StartEndNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as StartEndNodeData;
  const kind = nodeData.kind || "start";
  const isStart = kind === "start";
  const defaultTitle = isStart ? "Início" : "Fim";
  const title = nodeData.title || defaultTitle;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-sm transition-all select-none min-w-[110px] justify-center",
        isStart
          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-400",
        selected && "ring-2 ring-primary/40 shadow-md"
      )}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-3 !border-2 !border-background !bg-rose-500 transition-transform group-hover:scale-125"
        />
      )}

      {isStart ? (
        <Play className="size-3 fill-current shrink-0" />
      ) : (
        <Square className="size-3 fill-current shrink-0" />
      )}

      <span className="text-xs font-bold tracking-wide">
        {title}
      </span>

      {isStart && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-3 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
        />
      )}
    </div>
  );
});

StartEndNode.displayName = "StartEndNode";
