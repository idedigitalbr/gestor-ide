"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Monitor, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function emptySubscribe() {
  return () => {};
}

type TeaserStage = "peek-1" | "peek-2" | "expanded" | "minimized";

interface DesktopDownloadCtaProps {
  className?: string;
}

export function DesktopDownloadCta({ className = "" }: DesktopDownloadCtaProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const isDismissedInStorage = useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem("ide_hide_desktop_cta") === "true",
    () => false
  );

  const [stage, setStage] = useState<TeaserStage>("peek-1");
  const [version, setVersion] = useState<string>("v0.1.6");
  const [downloadUrl, setDownloadUrl] = useState<string>(
    "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.6/instalador-ide-gestor-v0.1.6-oneclick.exe"
  );

  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar última versão da API local/GitHub
  useEffect(() => {
    let isCancelled = false;
    fetch("/api/desktop/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && data) {
          if (data.version) setVersion(data.version);
          if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
        }
      })
      .catch(() => {
        // Fallback silencioso mantendo v0.1.6
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Sequência de 5 segundos de animação teaser automática:
  // 0s a 2s: peek-1 (apenas ícone suave espiando com balão "Oii, tô aqui... 👀")
  // 2s a 4.5s: peek-2 (espreitando mais com balão "Quer saber a novidade? ✨")
  // 4.5s em diante: expanded (se mostra todo no último segundo!)
  useEffect(() => {
    if (isDismissedInStorage) return;

    timer1Ref.current = setTimeout(() => {
      setStage((prev) => (prev === "peek-1" ? "peek-2" : prev));
    }, 2000);

    timer2Ref.current = setTimeout(() => {
      setStage((prev) =>
        prev === "peek-1" || prev === "peek-2" ? "expanded" : prev
      );
    }, 4500);

    return () => {
      if (timer1Ref.current) clearTimeout(timer1Ref.current);
      if (timer2Ref.current) clearTimeout(timer2Ref.current);
    };
  }, [isDismissedInStorage]);

  // Se o usuário passar o mouse ou clicar enquanto estiver espiando, revela imediatamente!
  function handleTriggerImmediateExpand() {
    if (timer1Ref.current) clearTimeout(timer1Ref.current);
    if (timer2Ref.current) clearTimeout(timer2Ref.current);
    if (stage !== "expanded") {
      setStage("expanded");
    }
  }

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setStage("minimized");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ide_hide_desktop_cta", "true");
    }
  }

  function handleCardClick(e: React.MouseEvent) {
    if (stage !== "expanded") {
      e.preventDefault();
      e.stopPropagation();
      handleTriggerImmediateExpand();
    }
  }

  // Não renderizar durante SSR ou se já estiver no app Desktop Tauri nativo
  if (!isClient) return null;

  const isDesktop =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);

  if (isDesktop) return null;

  const currentStage: TeaserStage =
    isDismissedInStorage && stage !== "expanded" ? "minimized" : stage;

  const isPeeking = currentStage === "peek-1" || currentStage === "peek-2";
  const isMinimized = currentStage === "minimized";
  const isFullyExpanded = currentStage === "expanded";

  return (
    <div
      onMouseEnter={handleTriggerImmediateExpand}
      className={cn(
        "fixed bottom-6 right-0 sm:bottom-8 z-40 flex items-center gap-2.5 select-none transition-all duration-700 ease-out",
        className
      )}
    >
      {/* 1. Balão Teaser provocativo à esquerda da janelinha durante os primeiros 5s */}
      {isPeeking && (
        <div
          onClick={handleTriggerImmediateExpand}
          className="cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          {currentStage === "peek-1" && (
            <div className="flex items-center gap-2 rounded-full border border-primary/40 bg-card/95 px-3 py-1.5 shadow-2xl backdrop-blur-md text-[11px] font-semibold text-foreground animate-in fade-in slide-in-from-right-3 duration-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>Oii, tô aqui... 👀</span>
            </div>
          )}

          {currentStage === "peek-2" && (
            <div className="flex items-center gap-2 rounded-full border border-primary/60 bg-card/95 px-3.5 py-1.5 shadow-2xl backdrop-blur-md text-[11px] font-bold text-primary animate-in fade-in zoom-in-95 duration-300">
              <Sparkles className="size-3.5 text-primary animate-pulse" />
              <span>Quer saber a novidade? ✨</span>
            </div>
          )}
        </div>
      )}

      {/* 2. Janelinha / Card Principal */}
      <div
        className={cn(
          "transition-all duration-700 ease-out",
          isFullyExpanded && "translate-x-0 mr-4 sm:mr-8 animate-float-cta",
          currentStage === "peek-1" && "translate-x-[calc(100%-58px)] cursor-pointer",
          currentStage === "peek-2" && "translate-x-[calc(100%-66px)] cursor-pointer",
          isMinimized &&
            "translate-x-[calc(100%-48px)] opacity-60 hover:opacity-100 hover:translate-x-[calc(100%-54px)] cursor-pointer"
        )}
      >
        <div className="relative group w-[340px] max-w-[calc(100vw-1.5rem)]">
          {/* Halo de destaque sutil */}
          <div
            className={cn(
              "absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 blur-xs transition-opacity duration-500 pointer-events-none",
              isFullyExpanded
                ? "opacity-40 group-hover:opacity-100"
                : "opacity-80 animate-pulse"
            )}
          />

          <div
            onClick={handleCardClick}
            className={cn(
              "relative flex flex-col gap-2.5 rounded-2xl border border-primary/40 bg-card p-3.5 sm:p-4 text-card-foreground shadow-2xl backdrop-blur-md transition-all duration-300",
              isFullyExpanded
                ? "group-hover:border-primary/70 group-hover:shadow-primary/10"
                : "hover:border-primary"
            )}
          >
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Versão Desktop Oficial
                </span>
                <Badge
                  variant="outline"
                  className="h-4 border-primary/30 bg-primary/10 px-1.5 text-[9px] font-bold text-primary"
                >
                  {version}
                </Badge>
              </div>

              {isFullyExpanded && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  title="Dispensar aviso"
                  aria-label="Dispensar aviso"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Link / Conteúdo Principal */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCardClick}
              className="flex items-center gap-3 rounded-xl p-1 transition-transform group-hover:scale-[1.01]"
            >
              <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                <Download className="size-5 animate-bounce" />
              </div>

              <div className="flex flex-col text-left">
                <span className="text-xs font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
                  Clique aqui e Baixe a versão desktop para Windows
                </span>
                <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                  Instalador OneClick • 1 Clique e pronto
                </span>
              </div>
            </a>

            {/* Rodapé com pílula de vantagens */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Monitor className="size-3 text-primary" />
                Windows 10/11 x64
              </span>
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                <Sparkles className="size-3" />
                ~45MB RAM • Rápido
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
