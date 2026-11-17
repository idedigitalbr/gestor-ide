"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconPicker,
  renderCustomViewIcon,
} from "./icon-picker";
import type {
  CustomProjectView,
  CustomViewOpenMode,
  FrameEmbedCheckResult,
} from "@gestor-ide/core";
import { sanitizeExternalUrl } from "@gestor-ide/core";
import {
  Globe,
  ExternalLink,
  Maximize2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CustomViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view?: CustomProjectView | null;
  projectId: string;
  onSave: (viewData: {
    id?: string;
    name: string;
    icon: string;
    url: string;
    openMode: CustomViewOpenMode;
  }) => Promise<void> | void;
}

const QUICK_PRESETS = [
  { name: "Figma", icon: "Layers", url: "https://www.figma.com" },
  { name: "Documentação", icon: "BookOpen", url: "https://notion.so" },
  { name: "Dashboard", icon: "BarChart2", url: "https://" },
  { name: "Protótipo", icon: "Layout", url: "https://" },
  { name: "Google Drive", icon: "Folder", url: "https://drive.google.com" },
  { name: "ChatGPT", icon: "Sparkles", url: "https://chatgpt.com" },
];

export function CustomViewModal({
  open,
  onOpenChange,
  view,
  onSave,
}: CustomViewModalProps) {
  const isEditing = Boolean(view && view.id);
  const isPredefined =
    view?.type === "predefined" ||
    Boolean(view?.id?.includes("predefined")) ||
    Boolean(view?.id?.includes("gdrive")) ||
    Boolean(view?.id?.includes("chatgpt"));

  const [name, setName] = useState(view?.name || "");
  const [icon, setIcon] = useState(view?.icon || "Globe");
  const [url, setUrl] = useState(view?.url || "");
  const [openMode, setOpenMode] = useState<CustomViewOpenMode>(
    view?.openMode || (isPredefined ? "new_tab" : "auto")
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de teste de incorporação
  const [isCheckingEmbed, setIsCheckingEmbed] = useState(false);
  const [embedCheckResult, setEmbedCheckResult] =
    useState<FrameEmbedCheckResult | null>(null);
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Sincronizar ao abrir com a view selecionada
  useEffect(() => {
    if (open) {
      // Sincroniza o formulário com a view recebida ao abrir o diálogo
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(view?.name || "");
      setIcon(
        view?.icon ||
          (view?.id?.includes("gdrive")
            ? "Folder"
            : view?.id?.includes("chatgpt")
            ? "Sparkles"
            : "Globe")
      );
      setUrl(view?.url || "");
      setOpenMode(view?.openMode || (view?.type === "predefined" ? "new_tab" : "auto"));
      setErrorMessage(null);
      setEmbedCheckResult(null);
      setShowLivePreview(false);
    }
  }, [open, view]);

  // Função para testar compatibilidade de iframe
  async function handleTestEmbed(targetUrl?: string) {
    const urlToTest = targetUrl || url;
    if (!urlToTest.trim()) return;

    const sanitized = sanitizeExternalUrl(urlToTest);
    if (!sanitized) {
      setErrorMessage("Por favor, insira uma URL válida iniciando com https://");
      return;
    }

    setIsCheckingEmbed(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/projects/check-frame?url=${encodeURIComponent(sanitized)}`
      );
      const data: FrameEmbedCheckResult = await res.json();
      setEmbedCheckResult(data);

      // Se for bloqueado e o modo estiver 'auto' ou 'embed', sugerir ou ajustar
      if (!data.canEmbed && openMode === "embed") {
        setOpenMode("new_tab");
      }
    } catch {
      setEmbedCheckResult({
        canEmbed: false,
        status: "unknown",
        reason: "Não foi possível testar a URL. Recomendado usar Nova guia.",
        suggestedMode: "new_tab",
      });
    } finally {
      setIsCheckingEmbed(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const finalName = isPredefined
      ? (view?.name || name || "Visualização")
      : name.trim();
    if (!finalName) {
      setErrorMessage("Informe o nome da visualização.");
      return;
    }

    const sanitizedUrl = sanitizeExternalUrl(url);
    if (!sanitizedUrl) {
      setErrorMessage(
        "Insira uma URL HTTPS válida (exemplo: https://figma.com/...)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: view?.id,
        name: finalName,
        icon: isPredefined ? (view?.icon || icon) : icon,
        url: sanitizedUrl,
        openMode,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : "Ocorreu um erro ao salvar a visualização."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-5 gap-4">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <span className="p-1 rounded-md bg-primary/10 text-primary">
              {renderCustomViewIcon(icon, "size-4")}
            </span>
            <span>
              {isEditing
                ? isPredefined
                  ? `Configurar ${view?.name}`
                  : "Editar visualização personalizada"
                : "Nova visualização personalizada"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isPredefined
              ? `Vincule o endereço externo deste projeto para acesso rápido.`
              : `Adicione um atalho externo por projeto, com suporte a visualização incorporada quando permitido.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Presets rápidos ao criar */}
          {!isEditing && !isPredefined && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Exemplos rápidos
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setName(p.name);
                      setIcon(p.icon);
                      if (p.url && !url) setUrl(p.url);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/50"
                  >
                    {renderCustomViewIcon(p.icon, "size-3")}
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nome da visualização (apenas para views criadas pelo usuário) */}
          {!isPredefined && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nome da visualização
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Figma, Documentação, Dashboard, Protótipo"
                required
                className="text-xs h-8.5"
              />
            </div>
          )}

          {/* Seletor de Ícone (apenas para views criadas pelo usuário) */}
          {!isPredefined && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Ícone</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  Selecionado: {icon}
                </span>
              </label>
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          )}

          {/* URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              URL (endereço externo HTTPS)
            </label>
            <div className="flex gap-2">
              <Input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setEmbedCheckResult(null);
                }}
                onBlur={() => {
                  if (url.trim() && !embedCheckResult) {
                    void handleTestEmbed();
                  }
                }}
                placeholder={
                  isPredefined
                    ? view?.id?.includes("gdrive")
                      ? "https://drive.google.com/drive/folders/..."
                      : "https://chatgpt.com/g/..."
                    : "https://..."
                }
                required
                className="text-xs h-8.5"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleTestEmbed()}
                disabled={isCheckingEmbed || !url.trim()}
                className="h-8.5 px-2.5 text-xs shrink-0 cursor-pointer"
                title="Verificar se o site permite ser incorporado via iframe"
              >
                {isCheckingEmbed ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span className="hidden sm:inline ml-1.5">Testar</span>
              </Button>
            </div>
          </div>

          {/* Resultado do Teste de Incorporação */}
          {embedCheckResult && (
            <div
              className={cn(
                "rounded-lg p-2.5 border text-xs space-y-2 animate-in fade-in duration-150",
                embedCheckResult.status === "compatible"
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : embedCheckResult.status === "blocked"
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-muted/50 border-border text-muted-foreground"
              )}
            >
              <div className="flex items-start gap-2">
                {embedCheckResult.status === "compatible" ? (
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-primary" />
                ) : embedCheckResult.status === "blocked" ? (
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-destructive" />
                ) : (
                  <Globe className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold leading-tight">
                    {embedCheckResult.status === "compatible"
                      ? "Compatível com exibição incorporada"
                      : embedCheckResult.status === "blocked"
                      ? "Bloqueado para iframe pelo site de destino"
                      : "Políticas HTTP não conclusivas"}
                  </p>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    {embedCheckResult.reason}
                  </p>
                </div>
              </div>

              {/* Botão de prévia opcional se for compatível ou para confirmação */}
              {embedCheckResult.status === "compatible" && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowLivePreview(!showLivePreview)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 hover:opacity-80 cursor-pointer"
                  >
                    {showLivePreview ? (
                      <>
                        <EyeOff className="size-3" />
                        <span>Ocultar prévia</span>
                      </>
                    ) : (
                      <>
                        <Eye className="size-3" />
                        <span>Visualizar prévia ao vivo</span>
                      </>
                    )}
                  </button>

                  {showLivePreview && (
                    <div className="mt-2 rounded-md overflow-hidden border border-border bg-background h-44 relative">
                      <iframe
                        src={sanitizeExternalUrl(url)}
                        title="Prévia de incorporação"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modo de Abertura */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Modo de abertura
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* 1. Automático */}
              <button
                type="button"
                onClick={() => setOpenMode("auto")}
                className={cn(
                  "flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  openMode === "auto"
                    ? "bg-card border-primary ring-1 ring-primary/40 text-foreground shadow-2xs"
                    : "bg-background border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Sparkles className="size-3 text-primary" />
                  <span>Automático</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  Incorpora se permitido; caso contrário, nova guia.
                </span>
              </button>

              {/* 2. Nova Guia */}
              <button
                type="button"
                onClick={() => setOpenMode("new_tab")}
                className={cn(
                  "flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  openMode === "new_tab"
                    ? "bg-card border-primary ring-1 ring-primary/40 text-foreground shadow-2xs"
                    : "bg-background border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <ExternalLink className="size-3 text-primary" />
                  <span>Nova guia</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  Abre sempre externamente em uma nova aba do navegador.
                </span>
              </button>

              {/* 3. Incorporado */}
              <button
                type="button"
                onClick={() => setOpenMode("embed")}
                disabled={embedCheckResult?.status === "blocked"}
                className={cn(
                  "flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  embedCheckResult?.status === "blocked" &&
                    "opacity-50 cursor-not-allowed",
                  openMode === "embed"
                    ? "bg-card border-primary ring-1 ring-primary/40 text-foreground shadow-2xs"
                    : "bg-background border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Maximize2 className="size-3 text-primary" />
                  <span>Incorporado</span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  Exibe diretamente na área de conteúdo do projeto.
                </span>
              </button>
            </div>
          </div>

          {/* Mensagem de Erro se houver */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <XCircle className="size-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !name.trim() || !url.trim()}
              className="cursor-pointer text-xs font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Salvando...
                </>
              ) : isEditing ? (
                "Salvar alterações"
              ) : (
                "Criar visualização"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
