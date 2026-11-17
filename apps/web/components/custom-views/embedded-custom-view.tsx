"use client";

import React, { useState } from "react";
import type { CustomProjectView } from "@gestor-ide/core";
import { renderCustomViewIcon } from "./icon-picker";
import {
  RotateCw,
  ExternalLink,
  Settings2,
  AlertCircle,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EmbeddedCustomViewProps {
  view: CustomProjectView;
  canWrite?: boolean;
  onEditView?: (view: CustomProjectView) => void;
  onClose?: () => void;
  className?: string;
}

export function EmbeddedCustomView({
  view,
  canWrite = true,
  onEditView,
  onClose,
  className,
}: EmbeddedCustomViewProps) {
  const [reloadKey, setReloadKey] = useState(0);

  const hasUrl = Boolean(view.url && view.url.trim());

  // Extrair hostname para exibição limpa
  const hostname = React.useMemo(() => {
    if (!hasUrl) return "";
    try {
      const u = new URL(view.url);
      return u.hostname;
    } catch {
      return view.url;
    }
  }, [view.url, hasUrl]);

  function handleReload() {
    setReloadKey((prev) => prev + 1);
  }

  function handleOpenExternal() {
    if (view.url) {
      window.open(view.url, "_blank", "noopener,noreferrer");
    }
  }

  // Estado minimalista quando a visualização ainda não possui URL configurada
  if (!hasUrl) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center flex-1 w-full h-[calc(100vh-210px)] min-h-[400px] bg-background border border-border/70 rounded-xl p-6 text-center animate-in fade-in duration-150 select-none",
          className
        )}
      >
        <div className="flex flex-col items-center gap-3 max-w-sm">
          <div className="size-10 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shadow-2xs">
            {renderCustomViewIcon(view.icon, "size-5")}
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-muted-foreground">
              Falta configurar sua visualização.
            </p>
            {canWrite && onEditView && (
              <button
                type="button"
                onClick={() => onEditView(view)}
                className="text-xs font-semibold text-primary hover:underline underline-offset-4 cursor-pointer transition-colors"
              >
                Clique aqui para configurar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Exibição quando configurada para nova guia
  if (view.openMode === "new_tab") {
    return (
      <div
        className={cn(
          "flex flex-col flex-1 w-full h-[calc(100vh-210px)] min-h-[540px] bg-background border border-border/80 rounded-xl overflow-hidden shadow-2xs animate-in fade-in duration-150",
          className
        )}
      >
        {/* Barra superior de controle */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-card/80 border-b border-border/80 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
              {renderCustomViewIcon(view.icon, "size-3.5")}
            </span>
            <span className="font-semibold text-xs text-foreground truncate max-w-[200px] sm:max-w-xs">
              {view.name}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/60 text-muted-foreground border border-border/60">
              <ShieldCheck className="size-2.5 text-primary" />
              <span className="truncate max-w-[150px]">{hostname}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {canWrite && onEditView && (
              <button
                type="button"
                onClick={() => onEditView(view)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
                title="Configurar visualização"
                aria-label="Configurar"
              >
                <Settings2 className="size-3" />
                <span className="hidden lg:inline">Configurar</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-1"
                title="Voltar às tarefas nativas"
                aria-label="Fechar visualização incorporada"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Área central com ação de abertura externa direta */}
        <div className="flex flex-col items-center justify-center flex-1 w-full h-full p-8 text-center bg-card/20 select-none">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-2xs">
            {renderCustomViewIcon(view.icon, "size-6")}
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {view.name}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mb-5">
            Esta visualização está configurada para abrir externamente em uma nova aba.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleOpenExternal}
              className="gap-2 text-xs h-8.5 px-4 cursor-pointer font-medium"
            >
              <ExternalLink className="size-3.5" />
              <span>Abrir {view.name}</span>
            </Button>
            {canWrite && onEditView && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onEditView(view)}
                className="gap-2 text-xs h-8.5 px-3 cursor-pointer"
              >
                <Settings2 className="size-3.5" />
                <span>Configurar</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col flex-1 w-full h-[calc(100vh-210px)] min-h-[540px] bg-background border border-border/80 rounded-xl overflow-hidden shadow-2xs animate-in fade-in duration-150",
        className
      )}
    >
      {/* Barra de Controles Discreta da Visualização Incorporada */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-card/80 border-b border-border/80 select-none">
        {/* Lado Esquerdo: Identificação da View */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded-md bg-primary/10 text-primary shrink-0">
            {renderCustomViewIcon(view.icon, "size-3.5")}
          </span>
          <span className="font-semibold text-xs text-foreground truncate max-w-[200px] sm:max-w-xs">
            {view.name}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted/60 text-muted-foreground border border-border/60">
            <ShieldCheck className="size-2.5 text-primary" />
            <span className="truncate max-w-[150px]">{hostname}</span>
          </span>
        </div>

        {/* Lado Direito: Ações (Atualizar, Abrir Externamente, Configurar, Fechar) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleReload}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Atualizar página incorporada"
            aria-label="Atualizar"
          >
            <RotateCw className="size-3" />
            <span className="hidden md:inline">Atualizar</span>
          </button>

          <button
            type="button"
            onClick={handleOpenExternal}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            title="Abrir em nova guia do navegador"
            aria-label="Abrir em nova guia"
          >
            <ExternalLink className="size-3" />
            <span className="hidden md:inline">Abrir em nova guia</span>
          </button>

          {canWrite && onEditView && (
            <button
              type="button"
              onClick={() => onEditView(view)}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title="Configurar visualização"
              aria-label="Configurar"
            >
              <Settings2 className="size-3" />
              <span className="hidden lg:inline">Configurar</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ml-1"
              title="Voltar às tarefas nativas"
              aria-label="Fechar visualização incorporada"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Área Principal do Iframe */}
      <div className="relative flex-1 w-full h-full bg-background overflow-hidden">
        <iframe
          key={`${view.id}-${reloadKey}`}
          src={view.url}
          title={view.name}
          className="w-full h-full border-0 block"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Barra Flutuante Discreta de Fallback Seguro (Regra 8 do Requisito) */}
        <div className="absolute bottom-2.5 right-3 max-w-[calc(100%-24px)] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/95 border border-border text-xs text-muted-foreground shadow-md backdrop-blur-xs select-none">
          <AlertCircle className="size-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] truncate">
            Problemas ao exibir ou restrição de login?
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenExternal}
            className="h-6 px-2 text-[11px] font-semibold cursor-pointer shrink-0"
          >
            <ExternalLink className="size-3 mr-1" />
            Abrir em nova guia
          </Button>
        </div>
      </div>
    </div>
  );
}
