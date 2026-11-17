"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NoteNodeData {
  text?: string;
  color?: "amber" | "blue" | "emerald" | "purple" | "rose";
}

const COLOR_STYLES = {
  amber: "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200",
  blue: "bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200",
  emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200",
  purple: "bg-purple-500/10 border-purple-500/30 text-purple-950 dark:text-purple-200",
  rose: "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200",
};

export const NoteNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as NoteNodeData;
  const text = nodeData.text || "Adicione uma nota...";
  const color = nodeData.color || "amber";
  const colorClass = COLOR_STYLES[color] || COLOR_STYLES.amber;

  return (
    <div
      className={cn(
        "group relative w-48 rounded-xl border p-3.5 shadow-sm transition-all select-none",
        colorClass,
        selected && "ring-2 ring-primary/40 shadow-md scale-[1.02]"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-background !bg-foreground/50 transition-transform group-hover:scale-125"
      />

      <div className="flex items-center gap-1.5 opacity-70 mb-1.5 text-[10px] font-semibold uppercase tracking-wider">
        <StickyNote className="size-3" />
        <span>Nota</span>
      </div>

      <p className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
        {text}
      </p>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-background !bg-foreground/50 transition-transform group-hover:scale-125"
      />
    </div>
  );
});

NoteNode.displayName = "NoteNode";
