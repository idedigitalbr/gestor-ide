"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type WireframePageType =
  | "landing"
  | "checkout"
  | "thankyou"
  | "optin"
  | "vsl"
  | "generic";

interface FunnelWireframeProps {
  pageType?: WireframePageType | string;
  className?: string;
}

export function FunnelWireframe({ pageType = "landing", className }: FunnelWireframeProps) {
  const normalizedType = (pageType || "landing").toLowerCase();

  switch (normalizedType) {
    case "checkout":
      return (
        <div className={cn("relative flex h-full w-full flex-col p-2.5 bg-card/60 select-none", className)}>
          {/* Top subtle lock / secure header */}
          <div className="flex items-center justify-between border-b border-border/40 pb-1.5 mb-2">
            <div className="flex items-center gap-1">
              <div className="size-2 rounded-xs bg-emerald-500/70" />
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="h-1.5 w-8 rounded-full bg-muted-foreground/20" />
          </div>

          {/* 2-Column Checkout Layout */}
          <div className="flex flex-1 gap-2 min-h-0">
            {/* Left Column: Product Summary */}
            <div className="flex w-5/12 flex-col gap-1.5 rounded border border-border/40 bg-muted/20 p-1.5">
              <div className="h-7 w-full rounded bg-muted-foreground/15 flex items-center justify-center">
                <div className="size-3 rounded-xs border border-dashed border-muted-foreground/40" />
              </div>
              <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/30" />
              <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />
              <div className="mt-auto h-2 w-full rounded-xs bg-primary/20 flex items-center justify-center">
                <div className="h-1 w-8 rounded-full bg-primary/60" />
              </div>
            </div>

            {/* Right Column: Payment Form */}
            <div className="flex flex-1 flex-col gap-1.5">
              {/* Credit card miniature */}
              <div className="h-8 w-full rounded border border-blue-500/30 bg-blue-500/10 p-1 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="size-2 rounded-xs bg-amber-400/70" />
                  <div className="h-1 w-4 rounded-full bg-blue-400/40" />
                </div>
                <div className="h-1 w-12 rounded-full bg-muted-foreground/40" />
              </div>

              {/* Form Input placeholders */}
              <div className="h-3 w-full rounded-xs border border-border/50 bg-background/60 px-1 flex items-center">
                <div className="h-1 w-14 rounded-full bg-muted-foreground/25" />
              </div>
              <div className="flex gap-1">
                <div className="h-3 flex-1 rounded-xs border border-border/50 bg-background/60 px-1 flex items-center">
                  <div className="h-1 w-6 rounded-full bg-muted-foreground/25" />
                </div>
                <div className="h-3 w-8 rounded-xs border border-border/50 bg-background/60 px-1 flex items-center">
                  <div className="h-1 w-4 rounded-full bg-muted-foreground/25" />
                </div>
              </div>

              {/* BUY NOW Button */}
              <div className="mt-auto h-4 w-full rounded bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center shadow-xs">
                <span className="text-[7.5px] font-bold text-white tracking-wider uppercase">
                  Comprar Agora
                </span>
              </div>
            </div>
          </div>
        </div>
      );

    case "thankyou":
    case "confirm":
      return (
        <div className={cn("relative flex h-full w-full flex-col items-center justify-center p-3 bg-card/60 select-none text-center", className)}>
          {/* Centered Celebration Checkmark */}
          <div className="size-8 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-500 mb-2">
            <svg className="size-4 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Confirmation Headline */}
          <div className="h-2 w-24 rounded-full bg-muted-foreground/40 mb-1" />
          <div className="h-1.5 w-16 rounded-full bg-muted-foreground/25 mb-3" />

          {/* Receipt / Next steps card */}
          <div className="w-full rounded border border-border/40 bg-muted/20 p-1.5 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              <div className="h-1.5 w-6 rounded-full bg-emerald-500/60" />
            </div>
            <div className="h-1 w-full rounded-full bg-muted-foreground/20" />
          </div>

          <div className="mt-2 h-3.5 w-20 rounded bg-primary/80 flex items-center justify-center">
            <span className="text-[7px] font-bold text-primary-foreground uppercase">
              Acessar Produto
            </span>
          </div>
        </div>
      );

    case "optin":
    case "lead":
      return (
        <div className={cn("relative flex h-full w-full flex-col p-2.5 bg-card/60 select-none", className)}>
          {/* Mini Nav */}
          <div className="flex justify-between items-center mb-1.5">
            <div className="h-1.5 w-8 rounded-full bg-muted-foreground/30" />
            <div className="size-2 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Headline */}
          <div className="flex flex-col items-center gap-1 my-1">
            <div className="h-2 w-28 rounded-full bg-muted-foreground/45" />
            <div className="h-1.5 w-20 rounded-full bg-muted-foreground/25" />
          </div>

          {/* Lead Magnet E-book Mockup */}
          <div className="flex flex-1 items-center justify-center py-1">
            <div className="h-10 w-8 rounded-xs border border-purple-500/40 bg-purple-500/15 shadow-xs flex flex-col items-center justify-center p-1">
              <div className="h-1 w-5 rounded-full bg-purple-400/60 mb-1" />
              <div className="size-3 rounded-xs border border-dashed border-purple-400/40" />
            </div>
          </div>

          {/* Input + CTA */}
          <div className="flex flex-col gap-1 mt-auto">
            <div className="h-3.5 w-full rounded-xs border border-border/50 bg-background/60 px-1.5 flex items-center">
              <div className="h-1 w-16 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="h-3.5 w-full rounded bg-purple-600 flex items-center justify-center shadow-xs">
              <span className="text-[7.5px] font-bold text-white uppercase tracking-wider">
                Baixar Grátis
              </span>
            </div>
          </div>
        </div>
      );

    case "vsl":
    case "webinar":
      return (
        <div className={cn("relative flex h-full w-full flex-col p-2.5 bg-card/60 select-none", className)}>
          {/* Top Headline */}
          <div className="flex flex-col items-center gap-1 mb-1.5">
            <div className="h-2 w-24 rounded-full bg-muted-foreground/40" />
            <div className="h-1.5 w-16 rounded-full bg-muted-foreground/20" />
          </div>

          {/* 16:9 Video Mockup */}
          <div className="relative flex-1 rounded border border-border/60 bg-slate-950 flex flex-col items-center justify-center overflow-hidden shadow-inner">
            <div className="size-7 rounded-full bg-red-600/90 flex items-center justify-center shadow-md">
              <svg className="size-3.5 fill-white text-white translate-x-0.5" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            {/* Video progress line */}
            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
              <div className="h-full w-1/3 bg-red-600" />
            </div>
          </div>

          {/* Buy Button underneath */}
          <div className="mt-2 h-4 w-full rounded bg-amber-500 hover:bg-amber-400 flex items-center justify-center shadow-xs">
            <span className="text-[7.5px] font-bold text-slate-950 uppercase tracking-wider">
              Quero Minha Vaga
            </span>
          </div>
        </div>
      );

    case "landing":
    default:
      return (
        <div className={cn("relative flex h-full w-full flex-col p-2 bg-card/60 select-none", className)}>
          {/* Top mini header bar */}
          <div className="flex items-center justify-between border-b border-border/40 pb-1 mb-1.5">
            <div className="flex items-center gap-1">
              <div className="size-1.5 rounded-full bg-primary/70" />
              <div className="h-1.5 w-6 rounded-full bg-muted-foreground/40" />
            </div>
            <div className="flex gap-1">
              <div className="h-1 w-3 rounded-full bg-muted-foreground/20" />
              <div className="h-1 w-3 rounded-full bg-muted-foreground/20" />
              <div className="h-1 w-3 rounded-full bg-muted-foreground/20" />
            </div>
          </div>

          {/* Hero Section: Left Image, Right Text */}
          <div className="flex gap-1.5 items-center mb-1.5">
            <div className="size-9 shrink-0 rounded border border-border/40 bg-muted/30 flex items-center justify-center">
              <svg className="size-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="h-2 w-full rounded-full bg-muted-foreground/40" />
              <div className="h-1.5 w-4/5 rounded-full bg-muted-foreground/25" />
              <div className="h-1.5 w-3/5 rounded-full bg-muted-foreground/20" />
            </div>
          </div>

          {/* Call to Action Button */}
          <div className="h-3.5 w-full rounded bg-primary hover:bg-primary/90 flex items-center justify-center shadow-xs mb-1.5">
            <span className="text-[7.5px] font-bold text-primary-foreground tracking-wider uppercase">
              Call to Action
            </span>
          </div>

          {/* 3 Features columns */}
          <div className="grid grid-cols-3 gap-1 mt-auto">
            <div className="h-5 rounded border border-border/30 bg-muted/20 p-0.5 flex flex-col justify-center gap-0.5">
              <div className="h-1 w-full rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-2/3 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="h-5 rounded border border-border/30 bg-muted/20 p-0.5 flex flex-col justify-center gap-0.5">
              <div className="h-1 w-full rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-2/3 rounded-full bg-muted-foreground/20" />
            </div>
            <div className="h-5 rounded border border-border/30 bg-muted/20 p-0.5 flex flex-col justify-center gap-0.5">
              <div className="h-1 w-full rounded-full bg-muted-foreground/30" />
              <div className="h-0.5 w-2/3 rounded-full bg-muted-foreground/20" />
            </div>
          </div>
        </div>
      );
  }
}
