"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DecisionNodeData {
  title?: string;
  notes?: string;
}

export const DecisionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as DecisionNodeData;
  const title = nodeData.title || "Decisão?";

  return (
    <div
      className={cn(
        "group relative flex w-48 flex-col items-center justify-center rounded-xl border bg-card p-3 shadow-sm transition-all select-none text-center",
        selected
          ? "border-purple-500 ring-2 ring-purple-500/30 shadow-md"
          : "border-border hover:border-border/80"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-background !bg-purple-500 transition-transform group-hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-background !bg-purple-500 transition-transform group-hover:scale-125"
      />

      <div className="mb-1.5 flex size-6 items-center justify-center rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
        <HelpCircle className="size-3.5" />
      </div>

      <span className="text-xs font-semibold text-foreground line-clamp-2">
        {title}
      </span>

      {/* Right output for 'Sim' */}
      <div className="absolute -right-7 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <Handle
          id="yes"
          type="source"
          position={Position.Right}
          className="!size-3 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
        />
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          Sim
        </span>
      </div>

      {/* Bottom output for 'Não' */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <Handle
          id="no"
          type="source"
          position={Position.Bottom}
          className="!size-3 !border-2 !border-background !bg-destructive transition-transform group-hover:scale-125"
        />
        <span className="text-[10px] font-bold text-destructive mt-1">
          Não
        </span>
      </div>
    </div>
  );
});

DecisionNode.displayName = "DecisionNode";
