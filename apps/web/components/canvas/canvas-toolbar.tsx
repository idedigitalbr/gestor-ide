"use client";

import React, { useState } from "react";
import {
  Plus,
  ChevronDown,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Pencil,
  Trash2,
  Download,
  Grid,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CANVAS_TEMPLATES } from "./templates";
import type { CanvasSummary } from "@gestor-ide/core";
import type { CanvasAutosaveStatus } from "./use-canvas-autosave";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  canvases: CanvasSummary[];
  activeCanvasId: string | null;
  onSelectCanvas: (id: string) => void;
  onCreateCanvas: (name: string, templateKey: string) => Promise<void>;
  onRenameCanvas: (id: string, newName: string) => Promise<void>;
  onDuplicateCanvas: (id: string) => Promise<void>;
  onArchiveCanvas: (id: string) => Promise<void>;
  canEdit: boolean;
  autosaveStatus: CanvasAutosaveStatus;
  currentRevision: number;
  autosaveError: string | null;
  onRetryAutosave: () => void;
  onReloadRemote: () => void;
  isLibraryOpen: boolean;
  onToggleLibrary: () => void;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  onExportJson: () => void;
}

export function CanvasToolbar({
  canvases = [],
  activeCanvasId,
  onSelectCanvas,
  onCreateCanvas,
  onRenameCanvas,
  onDuplicateCanvas,
  onArchiveCanvas,
  canEdit,
  autosaveStatus,
  currentRevision,
  autosaveError,
  onRetryAutosave,
  onReloadRemote,
  isLibraryOpen,
  onToggleLibrary,
  isInspectorOpen,
  onToggleInspector,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  showMinimap,
  onToggleMinimap,
  onExportJson,
}: CanvasToolbarProps) {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("funnel-basic");
  const [isCreating, setIsCreating] = useState(false);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);

  const handleOpenNewModal = () => {
    setNewBoardName("");
    setSelectedTemplateKey("funnel-basic");
    setIsNewModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newBoardName.trim() || "Novo Quadro";
    setIsCreating(true);
    try {
      await onCreateCanvas(finalName, selectedTemplateKey);
      setIsNewModalOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenRename = () => {
    if (!activeCanvas) return;
    setRenameValue(activeCanvas.name);
    setIsRenameModalOpen(true);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCanvasId || !renameValue.trim()) return;
    setIsRenaming(true);
    try {
      await onRenameCanvas(activeCanvasId, renameValue.trim());
      setIsRenameModalOpen(false);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-2 z-10 select-none">
        {/* Left: Library Toggle & Canvas Selector */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={isLibraryOpen ? "default" : "outline"}
            onClick={onToggleLibrary}
            className="h-8 gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Elementos</span>
          </Button>

          {/* Board Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-colors shadow-sm max-w-[220px]"
              >
                <Layers className="size-3.5 text-primary shrink-0" />
                <span className="truncate">
                  {activeCanvas ? activeCanvas.name : "Selecionar Quadro"}
                </span>
                <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 text-xs">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Quadros do Projeto
              </div>
              {canvases.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => onSelectCanvas(c.id)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer",
                    c.id === activeCanvasId && "font-bold text-primary"
                  )}
                >
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    r{c.revision}
                  </span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />

              {canEdit && (
                <>
                  <DropdownMenuItem
                    onClick={handleOpenNewModal}
                    className="gap-2 cursor-pointer text-primary font-semibold"
                  >
                    <Plus className="size-3.5" />
                    <span>Criar Novo Quadro</span>
                  </DropdownMenuItem>

                  {activeCanvas && (
                    <>
                      <DropdownMenuItem
                        onClick={handleOpenRename}
                        className="gap-2 cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                        <span>Renomear Quadro</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDuplicateCanvas(activeCanvas.id)}
                        className="gap-2 cursor-pointer"
                      >
                        <Copy className="size-3.5" />
                        <span>Duplicar Quadro</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onArchiveCanvas(activeCanvas.id)}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Arquivar Quadro</span>
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center: Autosave Status */}
        <div className="flex items-center gap-2">
          {autosaveStatus === "saving" && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Salvando no CRM...</span>
            </div>
          )}

          {autosaveStatus === "saved" && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="size-3.5" />
              <span>Salvo (r{currentRevision})</span>
            </div>
          )}

          {autosaveStatus === "dirty" && (
            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
              <span>Alterações pendentes...</span>
            </div>
          )}

          {autosaveStatus === "error" && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 px-2 py-1 text-xs text-destructive font-medium">
              <AlertTriangle className="size-3.5 shrink-0" />
              <span className="truncate max-w-[200px]">
                {autosaveError || "Falha ao salvar"}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onRetryAutosave}
                className="h-6 text-[10px] px-2"
              >
                Tentar
              </Button>
            </div>
          )}

          {autosaveStatus === "conflict" && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/15 border border-destructive/40 px-2 py-1 text-xs text-destructive font-bold">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>Conflito 409 detectado</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReloadRemote}
                className="h-6 text-[10px] px-2 text-foreground"
              >
                Recarregar Remoto
              </Button>
            </div>
          )}
        </div>

        {/* Right: History & Canvas Tools */}
        <div className="flex items-center gap-1">
          {canEdit && (
            <div className="flex items-center border-r border-border/60 pr-1.5 mr-1 gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canUndo}
                onClick={onUndo}
                className="size-8 p-0"
                title="Desfazer (Ctrl+Z)"
              >
                <Undo2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canRedo}
                onClick={onRedo}
                className="size-8 p-0"
                title="Refazer (Ctrl+Shift+Z)"
              >
                <Redo2 className="size-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center border-r border-border/60 pr-1.5 mr-1 gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onZoomOut}
              className="size-8 p-0"
              title="Diminuir Zoom"
            >
              <ZoomOut className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onZoomIn}
              className="size-8 p-0"
              title="Aumentar Zoom"
            >
              <ZoomIn className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onFitView}
              className="size-8 p-0"
              title="Ajustar Visualização (Fit)"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          </div>

          <Button
            type="button"
            variant={showMinimap ? "secondary" : "ghost"}
            size="sm"
            onClick={onToggleMinimap}
            className="size-8 p-0"
            title="Alternar Minimapa"
          >
            <Map className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExportJson}
            className="size-8 p-0"
            title="Exportar JSON do Quadro"
          >
            <Download className="size-3.5" />
          </Button>

          <Button
            type="button"
            variant={isInspectorOpen ? "default" : "outline"}
            size="sm"
            onClick={onToggleInspector}
            className="h-8 gap-1.5 text-xs font-semibold ml-1 shadow-sm"
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">Propriedades</span>
          </Button>
        </div>
      </div>

      {/* Modal: Novo Quadro com Templates */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Criar Novo Quadro Canvas
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Quadro</Label>
              <Input
                autoFocus
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Ex: Funil de Lançamento, Jornada do Usuário..."
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Escolha um Modelo Inicial</Label>
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {CANVAS_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.key}
                    onClick={() => setSelectedTemplateKey(tmpl.key)}
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border p-2.5 cursor-pointer text-left transition-all",
                      selectedTemplateKey === tmpl.key
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        {tmpl.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      {tmpl.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="gap-1.5"
              >
                {isCreating ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                <span>{isCreating ? "Criando..." : "Criar Quadro"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Renomear Quadro */}
      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Renomear Quadro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Novo Nome</Label>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="text-xs"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRenameModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isRenaming || !renameValue.trim()}
              >
                {isRenaming ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
