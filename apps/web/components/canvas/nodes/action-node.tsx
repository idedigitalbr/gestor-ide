"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  MousePointerClick,
  ShoppingCart,
  UserCheck,
  Download,
  Zap,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionNodeData {
  title?: string;
  actionType?: string;
  metric?: string;
  revenue?: string;
  notes?: string;
}

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as ActionNodeData;
  const title = nodeData.title || "Compra Concluída";
  const actionType = (nodeData.actionType || "buy").toLowerCase();
  const metric = nodeData.metric || nodeData.revenue || (actionType === "buy" ? "$186K receita" : "4.7K ações");
  const isRevenue = actionType === "buy" || actionType === "revenue";

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
        className={cn(
          "!size-2.5 !border-2 !border-background transition-transform group-hover:scale-125 -translate-y-3",
          isRevenue ? "!bg-emerald-500" : "!bg-amber-500"
        )}
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className={cn(
          "!size-2.5 !border-2 !border-background transition-transform group-hover:scale-125",
          isRevenue ? "!bg-emerald-500" : "!bg-amber-500"
        )}
      />

      {/* Main Pill / Diamond Action Badge */}
      {isRevenue ? (
        <div className="flex flex-col items-center">
          {/* Funnelytics Diamond Metric */}
          <div
            className={cn(
              "flex size-11 rotate-45 items-center justify-center rounded-lg bg-emerald-500 shadow-lg transition-transform",
              selected ? "ring-4 ring-emerald-500/40 scale-105" : "hover:scale-105"
            )}
          >
            <DollarSign className="size-6 -rotate-45 text-white stroke-[2.5]" />
          </div>
          <div className="mt-2.5 flex flex-col items-center text-center">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {metric}
            </span>
            <span className="text-[10px] font-semibold text-foreground/80 max-w-[120px] truncate">
              {title}
            </span>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-card px-3.5 py-2 shadow-md transition-all",
            selected
              ? "border-amber-500 ring-2 ring-amber-500/40 shadow-xl"
              : "border-border/80 hover:border-amber-500/60"
          )}
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            {actionType === "signup" ? (
              <UserCheck className="size-4" />
            ) : actionType === "download" ? (
              <Download className="size-4" />
            ) : actionType === "click" ? (
              <MousePointerClick className="size-4" />
            ) : (
              <Zap className="size-4" />
            )}
          </div>
          <div className="flex flex-col truncate">
            <span className="text-xs font-semibold text-foreground truncate max-w-[120px]">
              {title}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              {metric}
            </span>
          </div>
        </div>
      )}

      {/* Source Handles */}
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className={cn(
          "!size-2.5 !border-2 !border-background transition-transform group-hover:scale-125 -translate-y-3",
          isRevenue ? "!bg-emerald-500" : "!bg-amber-500"
        )}
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className={cn(
          "!size-2.5 !border-2 !border-background transition-transform group-hover:scale-125",
          isRevenue ? "!bg-emerald-500" : "!bg-amber-500"
        )}
      />
    </div>
  );
});

ActionNode.displayName = "ActionNode";
