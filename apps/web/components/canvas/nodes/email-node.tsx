"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmailNodeData {
  title?: string;
  subject?: string;
  sequenceStep?: number;
  delayText?: string;
  notes?: string;
}

export const EmailNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as EmailNodeData;
  const title = nodeData.title || "E-mail";
  const subject = nodeData.subject;
  const step = nodeData.sequenceStep;
  const delayText = nodeData.delayText;

  return (
    <div
      className={cn(
        "group relative w-56 rounded-xl border bg-card text-card-foreground shadow-sm transition-all select-none",
        selected
          ? "border-sky-500 ring-2 ring-sky-500/30 shadow-md"
          : "border-border hover:border-border/80"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-background !bg-sky-500 transition-transform group-hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-background !bg-sky-500 transition-transform group-hover:scale-125"
      />

      <div className="flex items-center justify-between border-b border-border/60 bg-sky-500/10 px-3 py-1.5 rounded-t-xl text-sky-600 dark:text-sky-400">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Mail className="size-3.5" />
          <span>E-mail</span>
        </div>
        {step !== undefined && (
          <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-bold">
            #{step}
          </span>
        )}
      </div>

      <div className="p-3">
        <h4 className="text-xs font-semibold text-foreground truncate">
          {title}
        </h4>
        {subject && (
          <p className="mt-1 text-[11px] text-muted-foreground truncate italic">
            &ldquo;{subject}&rdquo;
          </p>
        )}
        {delayText && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground/80 font-medium">
            <Clock className="size-2.5" />
            <span>{delayText}</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-background !bg-sky-500 transition-transform group-hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-background !bg-sky-500 transition-transform group-hover:scale-125"
      />
    </div>
  );
});

EmailNode.displayName = "EmailNode";
