"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatabaseNodeData {
  title?: string;
  systemName?: string;
  notes?: string;
}

export const DatabaseNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as DatabaseNodeData;
  const title = nodeData.title || "Banco de Dados";
  const systemName = nodeData.systemName || "MySQL / CRM";

  return (
    <div
      className={cn(
        "group relative flex w-48 items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all select-none",
        selected
          ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-md"
          : "border-border hover:border-border/80"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
      />

      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Database className="size-4" />
      </div>

      <div className="flex flex-col truncate">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
          {systemName}
        </span>
        <span className="text-xs font-semibold text-foreground truncate">
          {title}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
      />
    </div>
  );
});

DatabaseNode.displayName = "DatabaseNode";
