"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Monitor, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function emptySubscribe() {
  return () => {};
}

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
    () => (typeof window !== "undefined" && sessionStorage.getItem("ide_hide_desktop_cta") === "true"),
    () => false
  );

  const [dismissed, setDismissed] = useState(false);
  const [version, setVersion] = useState<string>("v0.1.6");
  const [downloadUrl, setDownloadUrl] = useState<string>(
    "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.6/instalador-ide-gestor-v0.1.6-oneclick.exe"
  );

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

  // Não renderizar durante SSR, se o usuário dispensou ou se já estiver no app desktop Tauri
  if (!isClient || dismissed || isDismissedInStorage) return null;

  const isDesktop =
    typeof window !== "undefined" &&
    Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);

  if (isDesktop) return null;

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ide_hide_desktop_cta", "true");
    }
  }

  return (
    <div
      className={`fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40 max-w-[calc(100vw-2rem)] sm:max-w-[360px] animate-float-cta ${className}`}
    >
      <div className="relative group">
        {/* Halo de destaque sutil no hover */}
        <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30 blur-xs opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="relative flex flex-col gap-2.5 rounded-2xl border border-primary/30 bg-card p-4 text-card-foreground shadow-2xl backdrop-blur-md transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-primary/10">
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

            <button
              type="button"
              onClick={handleDismiss}
              title="Dispensar aviso"
              aria-label="Dispensar aviso"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Link / Botão Principal de Download */}
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
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

          {/* Rodapé do Card com pílula de vantagens */}
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
  );
}
