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
  Bell,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionNodeData {
  title?: string;
  actionType?: string;
  notes?: string;
}

const ACTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  click: MousePointerClick,
  buy: ShoppingCart,
  signup: UserCheck,
  download: Download,
  zap: Zap,
  complete: CheckCircle2,
  notify: Bell,
  play: Play,
  default: Zap,
};

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as ActionNodeData;
  const title = nodeData.title || "Ação do Usuário";
  const actionType = (nodeData.actionType || "default").toLowerCase();
  const IconComponent = ACTION_ICONS[actionType] || ACTION_ICONS.default;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg border bg-card px-3.5 py-2 shadow-sm transition-all select-none min-w-[150px]",
        selected
          ? "border-amber-500 ring-2 ring-amber-500/30 shadow-md"
          : "border-border hover:border-border/80"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-background !bg-amber-500 transition-transform group-hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-background !bg-amber-500 transition-transform group-hover:scale-125"
      />

      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
        <IconComponent className="size-4" />
      </div>

      <div className="flex flex-col truncate">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
          Ação / Conversão
        </span>
        <span className="text-xs font-semibold text-foreground truncate">
          {title}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border-2 !border-background !bg-amber-500 transition-transform group-hover:scale-125"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-3 !border-2 !border-background !bg-amber-500 transition-transform group-hover:scale-125"
      />
    </div>
  );
});

ActionNode.displayName = "ActionNode";
