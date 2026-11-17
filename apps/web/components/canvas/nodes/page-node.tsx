"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Globe, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { FunnelWireframe, type WireframePageType } from "./funnel-wireframe";

export interface PageNodeData {
  title?: string;
  url?: string;
  pageType?: WireframePageType | string;
  visitors?: string;
  conversionRate?: string;
  assetId?: string | null;
  thumbnailUrl?: string | null;
  notes?: string;
}

export const PageNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as PageNodeData;
  const title = nodeData.title || "Página de Vendas";
  const url = nodeData.url;
  const imageSrc = nodeData.thumbnailUrl;
  const pageType = (nodeData.pageType || "landing") as WireframePageType;
  const metricsLabel = nodeData.visitors || (nodeData.conversionRate ? `${nodeData.conversionRate} conversão` : undefined);

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center select-none transition-all",
        selected && "scale-[1.02]"
      )}
    >
      {/* Target Handles */}
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125 -translate-y-4"
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!size-2.5 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
      />

      {/* Mini Browser Sheet Container */}
      <div
        className={cn(
          "w-44 rounded-xl border bg-card text-card-foreground shadow-md overflow-hidden transition-all",
          selected
            ? "border-primary ring-2 ring-primary/40 shadow-xl"
            : "border-border/70 hover:border-border"
        )}
      >
        {/* Browser Top Bar with 3 Colored Dots */}
        <div className="flex items-center gap-1.5 border-b border-border/50 bg-muted/40 px-2.5 py-1.5">
          <div className="flex gap-1">
            <span className="size-1.5 rounded-full bg-red-500/80" />
            <span className="size-1.5 rounded-full bg-amber-500/80" />
            <span className="size-1.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="ml-1 flex flex-1 items-center gap-1 truncate rounded bg-background/80 px-1 py-0.5 text-[9px] text-muted-foreground font-mono">
            <Globe className="size-2 shrink-0 opacity-70" />
            <span className="truncate">{url ? url.replace(/^https?:\/\//, "") : "pagina.com"}</span>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
              title="Abrir URL"
            >
              <ExternalLink className="size-2.5" />
            </a>
          )}
        </div>

        {/* Screenshot OR Funnelytics Wireframe Illustration */}
        <div className="relative h-28 w-full overflow-hidden bg-background/50">
          {imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={title}
              className="size-full object-cover"
            />
          ) : (
            <FunnelWireframe pageType={pageType} className="size-full" />
          )}
        </div>
      </div>

      {/* Source Handles */}
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125 -translate-y-4"
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !border-2 !border-background !bg-emerald-500 transition-transform group-hover:scale-125"
      />

      {/* Funnelytics-Style Label & Metric Underneath */}
      <div className="mt-1.5 flex flex-col items-center text-center max-w-[190px]">
        <span className="text-xs font-semibold text-foreground tracking-tight truncate w-full">
          {title}
        </span>
        {metricsLabel && (
          <span className="text-[10px] font-medium text-muted-foreground/90">
            {metricsLabel}
          </span>
        )}
      </div>
    </div>
  );
});

PageNode.displayName = "PageNode";
