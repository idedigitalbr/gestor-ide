"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Download, Laptop, Monitor, Smartphone, Sparkles, Terminal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function emptySubscribe() {
  return () => {};
}

export type SupportedOS = "windows" | "mac" | "linux" | "android";
type ConversationStep = "greeting" | "teaser" | "callout" | "minimized";

interface PlatformInfo {
  os: SupportedOS;
  name: string;
  downloadUrl: string;
  version: string;
  available: boolean;
  label: string;
  badge: string;
  sublabel: string;
  highlight: string;
  speechText: string;
}

const DEFAULT_PLATFORMS: Record<SupportedOS, PlatformInfo> = {
  windows: {
    os: "windows",
    name: "instalador-ide-gestor-v0.1.7-oneclick.exe",
    downloadUrl:
      "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.7/instalador-ide-gestor-v0.1.7-oneclick.exe",
    version: "v0.1.7",
    available: true,
    label: "Baixar para Windows (OneClick)",
    badge: "Windows 10/11 x64",
    sublabel: "Instalação em 1 clique • ~45MB",
    highlight: "3x Mais Desempenho",
    speechText:
      "Olha aqui do lado! Clica e baixa o nosso mais novo app desktop para Windows. Com ele você tem 3x mais desempenho do que usar pelo seu navegador, baixa aí... 🚀",
  },
  mac: {
    os: "mac",
    name: "IDE.Gestor_0.1.6_universal.dmg",
    downloadUrl:
      "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.6/IDE.Gestor_0.1.6_universal.dmg",
    version: "v0.1.6",
    available: true,
    label: "Baixar para macOS (.dmg)",
    badge: "Apple Silicon & Intel",
    sublabel: "Instalador Universal .dmg",
    highlight: "Nativo & Fluido",
    speechText:
      "Olha aqui do lado! Clica e baixa o nosso mais novo app nativo para Mac. Com ele você tem 3x mais desempenho do que usar pelo seu navegador, baixa aí... 🚀",
  },
  linux: {
    os: "linux",
    name: "IDE.Gestor_0.1.7_amd64.AppImage",
    downloadUrl:
      "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.7/IDE.Gestor_0.1.7_amd64.AppImage",
    version: "v0.1.7",
    available: true,
    label: "Baixar para Linux (.AppImage)",
    badge: "Linux x64 • AppImage / Deb",
    sublabel: "Executável Portátil ou .deb",
    highlight: "Super Leve",
    speechText:
      "Olha aqui do lado! Clica e baixa o nosso mais novo app para Linux. Com ele você tem 3x mais desempenho do que usar pelo seu navegador, baixa aí... 🚀",
  },
  android: {
    os: "android",
    name: "ide-gestor-v0.1.7.apk",
    downloadUrl: "https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.7/ide-gestor-v0.1.7.apk",
    version: "v0.1.7",
    available: true,
    label: "Baixar para Android (.apk)",
    badge: "Android 8.0+ Mobile",
    sublabel: "Instalador Direto APK Oficial",
    highlight: "Acesso Móvel",
    speechText:
      "Olha aqui do lado! Baixa o nosso app oficial para Android e gerencie suas tarefas na palma da mão com alta performance... 📱",
  },
};

function isNativeAppEnvironment(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  // 1. Injeção direta do runtime Tauri (Desktop ou Mobile)
  if ("__TAURI_INTERNALS__" in window || "__TAURI__" in window) {
    try {
      localStorage.setItem("ide_is_native_app", "true");
    } catch {}
    return true;
  }

  // 2. Parâmetro de URL (?app=true ou ?platform=android)
  try {
    const search = window.location.search;
    if (
      search.includes("app=true") ||
      search.includes("source=app") ||
      search.includes("platform=android") ||
      search.includes("platform=desktop")
    ) {
      localStorage.setItem("ide_is_native_app", "true");
      return true;
    }
  } catch {}

  // 3. Persistência em localStorage de detecção prévia
  try {
    if (localStorage.getItem("ide_is_native_app") === "true") {
      return true;
    }
  } catch {}

  // 4. Detecção de Android WebView nativo (o APK instalado)
  // WebViews de apps Android contêm '; wv' ou 'Version/X.X Chrome' no User-Agent
  const ua = (navigator.userAgent || "").toLowerCase();
  const isAndroidWebView =
    ua.includes("android") &&
    (ua.includes("; wv") ||
      ua.includes("; wv;") ||
      ua.includes("version/") ||
      /version\/[0-9.]+\s+chrome/.test(ua));

  if (isAndroidWebView) {
    try {
      localStorage.setItem("ide_is_native_app", "true");
    } catch {}
    return true;
  }

  // 5. Identificadores customizados no User-Agent
  if (ua.includes("tauri") || ua.includes("idegestor") || ua.includes("ide-gestor")) {
    try {
      localStorage.setItem("ide_is_native_app", "true");
    } catch {}
    return true;
  }

  return false;
}

function getClientOS(): SupportedOS {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "windows";
  const ua = (navigator.userAgent || "").toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();

  if (/android/i.test(ua)) return "android";
  if (/macintosh|mac os x/i.test(ua) || platform.startsWith("mac")) return "mac";
  if (/linux/i.test(ua) || platform.startsWith("linux")) return "linux";
  return "windows";
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
    () =>
      typeof window !== "undefined" &&
      (sessionStorage.getItem("ide_hide_desktop_cta") === "true" ||
        localStorage.getItem("ide_hide_desktop_cta_permanent") === "true"),
    () => false
  );

  const detectedOS = useSyncExternalStore(
    emptySubscribe,
    getClientOS,
    () => "windows" as SupportedOS
  );

  const [manualOS, setManualOS] = useState<SupportedOS | null>(null);
  const activeOS = manualOS || detectedOS;

  const [step, setStep] = useState<ConversationStep>("greeting");
  const [platformsData, setPlatformsData] =
    useState<Record<SupportedOS, PlatformInfo>>(DEFAULT_PLATFORMS);

  const timer1Ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2Ref = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar dados dinâmicos da API do GitHub para todas as plataformas
  useEffect(() => {
    let isCancelled = false;
    fetch("/api/desktop/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && data?.platforms) {
          setPlatformsData((prev) => {
            const next = { ...prev };
            for (const key of ["windows", "mac", "linux", "android"] as SupportedOS[]) {
              if (data.platforms[key]) {
                const p = data.platforms[key];
                next[key] = {
                  ...prev[key],
                  ...p,
                  available: Boolean(p.available),
                  speechText:
                    key === "android" && p.available
                      ? "Olha aqui do lado! Baixa o nosso app oficial para Android e gerencie suas tarefas na palma da mão com alta performance... 📱"
                      : prev[key].speechText,
                };
              }
            }
            return next;
          });
        }
      })
      .catch(() => {
        // Silencioso, mantém defaults
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Sequência conversacional de 5 segundos
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
      localStorage.setItem("ide_hide_desktop_cta_permanent", "true");
    }
  }

  const isNativeApp = useSyncExternalStore(
    emptySubscribe,
    isNativeAppEnvironment,
    () => false
  );

  if (!isClient || isNativeApp) return null;

  const currentStep: ConversationStep =
    isDismissedInStorage && step !== "callout" ? "minimized" : step;

  const isCallout = currentStep === "callout";
  const isMinimized = currentStep === "minimized";

  const currentPlatform = platformsData[activeOS] || DEFAULT_PLATFORMS.windows;

  // Ícone representativo do sistema operacional
  const renderOsIcon = (os: SupportedOS, sizeClass = "size-3.5") => {
    switch (os) {
      case "windows":
        return <Monitor className={sizeClass} />;
      case "mac":
        return <Laptop className={sizeClass} />;
      case "linux":
        return <Terminal className={sizeClass} />;
      case "android":
        return <Smartphone className={sizeClass} />;
    }
  };

  return (
    <div
      onMouseEnter={handleImmediateReveal}
      className={cn(
        "fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40 flex items-end justify-end gap-2.5 select-none",
        className
      )}
    >
      {/* 1. BALÃO DE CONVERSA (Colado imediatamente à esquerda do ícone) */}
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
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-l-[8px] border-l-card" />
            </div>
          )}

          {/* Passo 2: "Quer saber uma novidade?... ✨" */}
          {currentStep === "teaser" && (
            <div className="relative flex items-center gap-2 rounded-2xl border border-primary/60 bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur-md text-xs font-bold text-primary animate-spring-in">
              <Sparkles className="size-4 text-primary animate-pulse shrink-0" />
              <span className="whitespace-nowrap">Quer saber uma novidade?... ✨</span>
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-l-[8px] border-l-card" />
            </div>
          )}

          {/* Passo 3: Card Completo com Seleção Inteligente de Plataforma */}
          {isCallout && (
            <div className="relative w-[330px] sm:w-[380px] rounded-2xl border border-primary/40 bg-card/98 p-4 shadow-2xl backdrop-blur-md text-card-foreground animate-spring-in flex flex-col gap-3">
              {/* Topo: Detecção do Sistema + Versão + Botão Fechar */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    IDE Gestor Oficial
                  </span>
                  <Badge
                    variant="outline"
                    className="h-4 border-primary/30 bg-primary/10 px-1.5 text-[9px] font-bold text-primary"
                  >
                    {currentPlatform.version}
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

              {/* Seletor de Plataforma em Abas (Windows • Mac • Linux • Android) */}
              <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/40">
                {(
                  [
                    { id: "windows", label: "Windows" },
                    { id: "mac", label: "macOS" },
                    { id: "linux", label: "Linux" },
                    { id: "android", label: "Android" },
                  ] as const
                ).map((item) => {
                  const isSelected = activeOS === item.id;
                  const isAutoDetected = detectedOS === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManualOS(item.id);
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      )}
                    >
                      {renderOsIcon(item.id, "size-3")}
                      <span>{item.label}</span>
                      {isAutoDetected && (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            isSelected ? "bg-emerald-300" : "bg-emerald-500"
                          )}
                          title="Seu sistema operacional detectado"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mensagem conversacional adaptada para a plataforma */}
              <p className="text-xs leading-relaxed text-foreground font-medium">
                {currentPlatform.speechText}
              </p>

              {/* Botão de Download da Plataforma Selecionada */}
              <a
                href={currentPlatform.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group/btn flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 shadow-md transition-all",
                  currentPlatform.available
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.02] active:scale-95 cursor-pointer"
                    : "bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      currentPlatform.available
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background/40 text-muted-foreground"
                    )}
                  >
                    {renderOsIcon(activeOS, "size-4")}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold leading-tight">
                      {currentPlatform.label}
                    </span>
                    <span className="text-[10px] opacity-80">
                      {currentPlatform.sublabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                      currentPlatform.available
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "bg-background/60 text-muted-foreground"
                    )}
                  >
                    {currentPlatform.available ? "Grátis" : "GitHub"}
                  </span>
                  <Download className="size-3.5 animate-bounce" />
                </div>
              </a>

              {/* Rodapé com detalhes de compatibilidade */}
              <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  {renderOsIcon(activeOS, "size-3 text-primary")}
                  {currentPlatform.badge}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  <Sparkles className="size-3" />
                  {currentPlatform.highlight}
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
        title={`Baixar IDE Gestor para ${activeOS}`}
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
          {renderOsIcon(activeOS, "size-6 text-primary-foreground drop-shadow-sm")}

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
