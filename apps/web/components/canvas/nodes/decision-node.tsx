"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DecisionNodeData {
  title?: string;
  yesLabel?: string;
  noLabel?: string;
  notes?: string;
}

export const DecisionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as DecisionNodeData;
  const title = nodeData.title || "Preencheu formulário?";
  const yesLabel = nodeData.yesLabel || "Sim";
  const noLabel = nodeData.noLabel || "Não";

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center select-none transition-all",
        selected && "scale-[1.03]"
      )}
    >
      {/* Target Handles */}
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-background !bg-purple-500 transition-transform group-hover:scale-125 -translate-y-2"
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!size-2.5 !border-2 !border-background !bg-purple-500 transition-transform group-hover:scale-125"
      />

      {/* Decision Card Container */}
      <div
        className={cn(
          "flex w-48 flex-col items-center justify-center rounded-xl border bg-card p-3 shadow-md text-center transition-all",
          selected
            ? "border-purple-500 ring-2 ring-purple-500/40 shadow-xl"
            : "border-border/80 hover:border-purple-500/60"
        )}
      >
        <div className="mb-1.5 flex size-6 items-center justify-center rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
          <HelpCircle className="size-3.5" />
        </div>

        <span className="text-xs font-semibold text-foreground line-clamp-2 px-1">
          {title}
        </span>
      </div>

      {/* YES Output (Right side) - Funnelytics Green Pill */}
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 flex items-center">
        <span className="flex items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shadow-xs">
          {yesLabel}
        </span>
        <Handle
          id="yes"
          type="source"
          position={Position.Right}
          className="!relative !right-0 !translate-x-1 !size-2.5 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
        />
      </div>

      {/* NO Output (Bottom side) - Funnelytics Red Pill */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="flex items-center justify-center rounded-full border border-rose-500/50 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 shadow-xs">
          {noLabel}
        </span>
        <Handle
          id="no"
          type="source"
          position={Position.Bottom}
          className="!relative !bottom-0 !translate-y-1 !size-2.5 !border-2 !border-background !bg-rose-500 transition-transform group-hover:scale-125"
        />
      </div>
    </div>
  );
});

DecisionNode.displayName = "DecisionNode";
