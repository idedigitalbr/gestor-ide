"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe, Image as ImageIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageNodeData {
  title?: string;
  url?: string;
  assetId?: string | null;
  thumbnailUrl?: string | null;
  notes?: string;
}

export const PageNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as PageNodeData;
  const title = nodeData.title || "Página sem título";
  const url = nodeData.url;
  const imageSrc = nodeData.thumbnailUrl;

  return (
    <div
      className={cn(
        "group relative w-64 rounded-xl border bg-card text-card-foreground shadow-sm transition-all select-none",
        selected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : "border-border hover:border-border/80"
      )}
    >
      {/* Top handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!size-3 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />

      {/* Mini Browser Bar */}
      <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-1.5 rounded-t-xl">
        <div className="flex gap-1">
          <span className="size-2 rounded-full bg-destructive/60" />
          <span className="size-2 rounded-full bg-amber-500/60" />
          <span className="size-2 rounded-full bg-emerald-500/60" />
        </div>
        <div className="ml-1 flex flex-1 items-center gap-1 truncate rounded bg-background/80 px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
          <Globe className="size-2.5 shrink-0 opacity-70" />
          <span className="truncate">{url || "https://..."}</span>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            title="Abrir URL em nova aba"
          >
            <ExternalLink className="size-2.5" />
          </a>
        )}
      </div>

      {/* Screenshot / Wireframe Area */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted/20 flex items-center justify-center">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground/50 p-4 text-center">
            <ImageIcon className="size-6 stroke-[1.5]" />
            <span className="text-[10px] font-medium">Prévia da tela</span>
          </div>
        )}
      </div>

      {/* Bottom Title Bar */}
      <div className="p-2.5">
        <h4 className="text-xs font-semibold tracking-tight text-foreground truncate">
          {title}
        </h4>
        {nodeData.notes && (
          <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-2">
            {nodeData.notes}
          </p>
        )}
      </div>

      {/* Bottom and Right handles */}
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

PageNode.displayName = "PageNode";
