"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Globe,
  Mail,
  Search,
  Share2,
  Megaphone,
  Compass,
  Video,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SourceNodeData {
  title?: string;
  iconKey?: string;
  category?: string;
  notes?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Share2,
  facebook: Share2,
  google: Search,
  youtube: Video,
  tiktok: Smartphone,
  email: Mail,
  search: Search,
  ads: Megaphone,
  direct: Compass,
  sparkles: Sparkles,
  default: Globe,
};

export const SourceNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as SourceNodeData;
  const title = nodeData.title || "Origem de Tráfego";
  const iconKey = (nodeData.iconKey || "default").toLowerCase();
  const IconComponent = ICON_MAP[iconKey] || ICON_MAP.default;
  const category = nodeData.category || "Canal de Entrada";

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-full border bg-card px-4 py-2.5 shadow-sm transition-all select-none min-w-[180px]",
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-border hover:border-border/80"
      )}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <IconComponent className="size-4" />
      </div>

      <div className="flex flex-col truncate">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/80">
          {category}
        </span>
        <span className="text-xs font-semibold text-foreground truncate">
          {title}
        </span>
      </div>

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

SourceNode.displayName = "SourceNode";
