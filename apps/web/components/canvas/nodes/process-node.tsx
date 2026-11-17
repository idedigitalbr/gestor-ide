"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Cog } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProcessNodeData {
  title?: string;
  description?: string;
  color?: string;
}

export const ProcessNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as ProcessNodeData;
  const title = nodeData.title || "Etapa de Processo";
  const description = nodeData.description;

  return (
    <div
      className={cn(
        "group relative flex w-52 flex-col rounded-xl border bg-card p-3 shadow-sm transition-all select-none",
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-border hover:border-border/80"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />

      <div className="flex items-center gap-2">
        <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
          <Cog className="size-3.5" />
        </div>
        <h4 className="text-xs font-semibold text-foreground truncate">
          {title}
        </h4>
      </div>

      {description && (
        <p className="mt-1.5 text-[11px] text-muted-foreground line-clamp-2">
          {description}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />
    </div>
  );
});

ProcessNode.displayName = "ProcessNode";
