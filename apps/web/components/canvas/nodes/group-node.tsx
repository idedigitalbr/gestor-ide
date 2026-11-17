"use client";

import React, { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export interface GroupNodeData {
  label?: string;
  color?: string;
}

export const GroupNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as GroupNodeData;
  const label = nodeData.label || "Raia / Grupo";

  return (
    <div
      className={cn(
        "relative size-full min-h-[200px] min-w-[320px] rounded-2xl border-2 border-dashed border-border/80 bg-muted/10 p-4 transition-all select-none",
        selected && "border-primary/80 ring-2 ring-primary/20 bg-muted/20"
      )}
    >
      <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
        <span className="size-2 rounded-full bg-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
});

GroupNode.displayName = "GroupNode";
