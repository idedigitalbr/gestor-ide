"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Monitor, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function emptySubscribe() {
  return () => {};
}

type ConversationStep = "greeting" | "teaser" | "callout" | "minimized";

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

  const [step, setStep] = useState<ConversationStep>("greeting");
  const [version, setVersion] = useState<string>("v0.1.7");
  const [downloadUrl, setDownloadUrl] = useState<string>(
    "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.7/instalador-ide-gestor-v0.1.7-oneclick.exe"
  );

  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar última versão da API local / GitHub
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

  // Sequência de conversa cronometrada de 5 segundos:
  // 0s a 2s: "Oi.... eiii espia aqui... 👀"
  // 2s a 4.5s: "Quer saber uma novidade?... ✨"
  // 4.5s em diante: Revelação completa do convite e botão de download!
  useEffect(() => {
    if (isDismissedInStorage) return;

    timer1Ref.current = setTimeout(() => {
      setStep((prev) => (prev === "greeting" ? "teaser" : prev));
    }, 2000);

    timer2Ref.current = setTimeout(() => {
      setStep((prev) =>
        prev === "greeting" || prev === "teaser" ? "callout" : prev
      );
    }, 4500);

    return () => {
      if (timer1Ref.current) clearTimeout(timer1Ref.current);
      if (timer2Ref.current) clearTimeout(timer2Ref.current);
    };
  }, [isDismissedInStorage]);

  // Se o usuário passar o mouse ou clicar em qualquer momento, revela o convite na hora!
  function handleImmediateReveal() {
    if (timer1Ref.current) clearTimeout(timer1Ref.current);
    if (timer2Ref.current) clearTimeout(timer2Ref.current);
    if (step !== "callout") {
      setStep("callout");
    }
  }

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setStep("minimized");
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ide_hide_desktop_cta", "true");
    }
  }

  // Não renderizar durante SSR ou se o usuário já estiver dentro do app nativo Desktop Tauri
  if (!isClient) return null;

  const isDesktop =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);

  if (isDesktop) return null;

  const currentStep: ConversationStep =
    isDismissedInStorage && step !== "callout" ? "minimized" : step;

  const isCallout = currentStep === "callout";
  const isMinimized = currentStep === "minimized";

  return (
    <div
      onMouseEnter={handleImmediateReveal}
      className={cn(
        "fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40 flex items-end justify-end gap-2.5 select-none",
        className
      )}
    >
      {/* 1. BALÃO DE CONVERSA (Posicionado imediatamente colado à esquerda do ícone) */}
      {!isMinimized && (
        <div
          onClick={handleImmediateReveal}
          className="relative max-w-[calc(100vw-5rem)] cursor-pointer"
        >
          {/* Passo 1: "Oi.... eiii espia aqui... 👀" */}
          {currentStep === "greeting" && (
            <div className="relative flex items-center gap-2 rounded-2xl border border-primary/40 bg-card/95 px-3.5 py-2 shadow-2xl backdrop-blur-md text-xs font-semibold text-foreground animate-spring-in">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="whitespace-nowrap">Oi.... eiii espia aqui... 👀</span>

              {/* Bico do balão apontando diretamente para o ícone à direita */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-l-[8px] border-l-card" />
            </div>
          )}

          {/* Passo 2: "Quer saber uma novidade?... ✨" */}
          {currentStep === "teaser" && (
            <div className="relative flex items-center gap-2 rounded-2xl border border-primary/60 bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-bold text-primary animate-spring-in">
              <Sparkles className="size-4 text-primary animate-pulse shrink-0" />
              <span className="whitespace-nowrap">Quer saber uma novidade?... ✨</span>

              {/* Bico do balão apontando diretamente para o ícone à direita */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-l-[8px] border-l-card" />
            </div>
          )}

          {/* Passo 3: Revelação completa do convite e download */}
          {isCallout && (
            <div className="relative w-[320px] sm:w-[360px] rounded-2xl border border-primary/40 bg-card/98 p-4 shadow-2xl backdrop-blur-md text-card-foreground animate-spring-in flex flex-col gap-3">
              {/* Topo do card com versão e fechar */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    IDE Gestor Desktop
                  </span>
                  <Badge
                    variant="outline"
                    className="h-4 border-primary/30 bg-primary/10 px-1.5 text-[9px] font-bold text-primary"
                  >
                    {version}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={handleDismiss}
                  title="Fechar janelinha"
                  aria-label="Fechar janelinha"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {/* Texto conversacional fiel solicitado */}
              <p className="text-xs leading-relaxed text-foreground font-medium">
                Olha aqui do lado! Clica e baixa o nosso mais novo app desktop. Com ele você tem{" "}
                <strong className="text-primary font-bold">3x mais desempenho</strong> do que
                usar pelo seu navegador, baixa aí... 🚀
              </p>

              {/* Botão de Download Oficial */}
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group/btn flex items-center justify-between gap-3 rounded-xl bg-primary px-3.5 py-2.5 text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-95"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground">
                    <Download className="size-4 animate-bounce" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-tight">
                      Baixar para Windows (OneClick)
                    </span>
                    <span className="text-[10px] opacity-80">
                      Instalação em 1 clique • ~45MB
                    </span>
                  </div>
                </div>
                <span className="rounded-md bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                  Grátis
                </span>
              </a>

              {/* Rodapé de vantagens */}
              <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Monitor className="size-3 text-primary" />
                  Windows 10/11 x64
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Sparkles className="size-3" />
                  3x Mais Desempenho
                </span>
              </div>

              {/* Bico do balão apontando para o botão da direita */}
              <div className="absolute -right-2 bottom-5 border-y-[6px] border-y-transparent border-l-[8px] border-l-card" />
            </div>
          )}
        </div>
      )}

      {/* 2. ÍCONE FLUTUANTE DA DIREITA (Fixo, chamativo, colado na borda) */}
      <div
        onClick={handleImmediateReveal}
        className="relative group shrink-0 cursor-pointer"
        title="Baixar IDE Gestor para Windows"
      >
        {/* Halo de pulso e brilho ao redor do ícone */}
        <div
          className={cn(
            "absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 blur-xs transition-opacity duration-300 pointer-events-none",
            isCallout ? "opacity-40 group-hover:opacity-100" : "opacity-90 animate-pulse"
          )}
        />

        <div
          className={cn(
            "relative flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-2xl transition-all duration-300 group-hover:scale-110 active:scale-95",
            !isCallout && "animate-wiggle",
            isCallout && "animate-float-cta"
          )}
        >
          <Download className="size-6 text-primary-foreground drop-shadow-sm" />

          {/* Ponto indicador de novidade sobre o ícone */}
          <span className="absolute -top-1 -right-1 flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-emerald-500 border-2 border-background" />
          </span>
        </div>
      </div>
    </div>
  );
}
