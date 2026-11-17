"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Mail,
  Search,
  Video,
  Globe,
  MessageCircle,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SourceNodeData {
  title?: string;
  iconKey?: string;
  category?: string;
  volume?: string;
  notes?: string;
}

interface BrandStyle {
  bg: string;
  text: string;
  border: string;
  ring: string;
  renderIcon: () => React.ReactNode;
}

const BRAND_STYLES: Record<string, BrandStyle> = {
  facebook: {
    bg: "bg-[#1877F2]",
    text: "text-white",
    border: "border-[#1877F2]",
    ring: "ring-[#1877F2]/30",
    renderIcon: () => (
      <svg className="size-5 fill-white" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  instagram: {
    bg: "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]",
    text: "text-white",
    border: "border-[#dc2743]",
    ring: "ring-[#dc2743]/30",
    renderIcon: () => (
      <svg className="size-5 fill-white" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  google: {
    bg: "bg-white dark:bg-slate-900",
    text: "text-slate-900 dark:text-white",
    border: "border-slate-300 dark:border-slate-700",
    ring: "ring-blue-500/30",
    renderIcon: () => (
      <svg className="size-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
    ),
  },
  email: {
    bg: "bg-[#0284c7]",
    text: "text-white",
    border: "border-[#0284c7]",
    ring: "ring-[#0284c7]/30",
    renderIcon: () => <Mail className="size-5 text-white" />,
  },
  youtube: {
    bg: "bg-[#FF0000]",
    text: "text-white",
    border: "border-[#FF0000]",
    ring: "ring-[#FF0000]/30",
    renderIcon: () => <Video className="size-5 text-white" />,
  },
  tiktok: {
    bg: "bg-black",
    text: "text-white",
    border: "border-slate-800",
    ring: "ring-cyan-500/30",
    renderIcon: () => (
      <svg className="size-5 fill-white" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  whatsapp: {
    bg: "bg-[#25D366]",
    text: "text-white",
    border: "border-[#25D366]",
    ring: "ring-[#25D366]/30",
    renderIcon: () => <MessageCircle className="size-5 text-white" />,
  },
  organic: {
    bg: "bg-emerald-600",
    text: "text-white",
    border: "border-emerald-600",
    ring: "ring-emerald-500/30",
    renderIcon: () => <Globe className="size-5 text-white" />,
  },
  default: {
    bg: "bg-primary/90",
    text: "text-primary-foreground",
    border: "border-primary",
    ring: "ring-primary/30",
    renderIcon: () => <Share2 className="size-5" />,
  },
};

export const SourceNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as SourceNodeData;
  const title = nodeData.title || "Origem";
  const iconKey = (nodeData.iconKey || "default").toLowerCase();
  const brand = BRAND_STYLES[iconKey] || BRAND_STYLES.default;
  const volume = nodeData.volume || "8.2K";

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center select-none transition-all",
        selected && "scale-[1.05]"
      )}
    >
      {/* Target Handles */}
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125 -translate-y-3"
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />

      {/* Funnelytics Circular Brand Badge */}
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full shadow-lg transition-all",
          brand.bg,
          brand.text,
          selected ? `ring-4 ${brand.ring} scale-105` : "hover:scale-105"
        )}
      >
        {brand.renderIcon()}
      </div>

      {/* Source Handles */}
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125 -translate-y-3"
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />

      {/* Title & Metric Below */}
      <div className="mt-1.5 flex flex-col items-center text-center">
        <span className="text-xs font-semibold text-foreground tracking-tight max-w-[130px] truncate">
          {title}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground/80">
          {volume}
        </span>
      </div>
    </div>
  );
});

SourceNode.displayName = "SourceNode";
