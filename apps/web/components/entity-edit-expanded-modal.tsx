"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  Users,
  Check,
  Loader2,
  Trash2,
  LogOut,
  Upload,
  Palette,
  Image as ImageIcon,
  Folder,
  CircleDot,
  Play,
  Clock,
  CheckCircle2,
  Lock,
  Globe,
  Building2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { cn } from "@/lib/utils";

export interface EntityEditData {
  type: "management" | "project";
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  color?: string | null;
  coverPath?: string | null;
  status?: string | null;
  visibility?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  priority?: string | null;
  members?: Array<{
    userId?: string;
    role?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      avatarUrl?: string | null;
    };
  }>;
}

export interface EntityEditExpandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: EntityEditData;
  originRect?: DOMRect | null;
  canWrite?: boolean;
  canManageMembers?: boolean;
  currentUserId?: string | null;
  onSave: (updates: {
    name?: string;
    description?: string;
    color?: string;
    coverPath?: string | null;
    status?: string;
    visibility?: string;
    priority?: string;
    dueDate?: string | null;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onLeave?: () => Promise<void>;
  onManageMembers?: () => void;
}

// Paleta de gradientes predefinidos para capas elegantes
const COVER_GRADIENT_PRESETS = [
  { name: "Roxo Noturno", value: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)", color: "#7c3aed" },
  { name: "Azul Oceano", value: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)", color: "#2563eb" },
  { name: "Verde Esmeralda", value: "linear-gradient(135deg, #059669 0%, #10b981 100%)", color: "#059669" },
  { name: "Âmbar Solar", value: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)", color: "#d97706" },
  { name: "Rosa Crepúsculo", value: "linear-gradient(135deg, #e11d48 0%, #db2777 100%)", color: "#e11d48" },
  { name: "Grafite Escuro", value: "linear-gradient(135deg, #334155 0%, #0f172a 100%)", color: "#334155" },
];

// Paleta de cores para o monograma / identificador
const MONOGRAM_COLOR_PRESETS = [
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#64748b", // Slate
];

const VISIBILITY_OPTIONS = [
  { value: "company", label: "Empresa", icon: Building2 },
  { value: "team", label: "Equipe", icon: Users },
  { value: "unit", label: "Unidade", icon: Globe },
  { value: "private", label: "Privado", icon: Lock },
];

const MANAGEMENT_STATUS_OPTIONS = [
  { value: "active", label: "Ativa", icon: Play },
  { value: "in_progress", label: "Fazendo agora", icon: Play },
  { value: "paused", label: "Pausada", icon: Clock },
  { value: "completed", label: "Concluída", icon: CheckCircle2 },
];

const PROJECT_STATUS_OPTIONS = [
  { value: "active", label: "Ativo", icon: Play },
  { value: "in_progress", label: "Fazendo agora", icon: Play },
  { value: "paused", label: "Aguardando feedback", icon: Clock },
  { value: "completed", label: "Concluído", icon: CheckCircle2 },
  { value: "pending", label: "Pendente", icon: CircleDot },
];

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgente", colorClass: "text-destructive" },
  { value: "high", label: "Alta", colorClass: "text-amber-500" },
  { value: "medium", label: "Média", colorClass: "text-blue-500" },
  { value: "low", label: "Baixa", colorClass: "text-muted-foreground" },
];

function formatDateDisplay(dateString?: string | null): string {
  if (!dateString) return "Não informada";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateString;
  }
}

export function EntityEditExpandedModal({
  isOpen,
  onClose,
  entity,
  originRect,
  canWrite = true,
  canManageMembers = true,
  onSave,
  onDelete,
  onLeave,
  onManageMembers,
}: EntityEditExpandedModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states initialized directly from entity
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description || "");
  const [color, setColor] = useState(entity.color || "var(--primary)");
  const [coverPath, setCoverPath] = useState<string | null>(entity.coverPath || null);
  const [status, setStatus] = useState(entity.status || "active");
  const [visibility, setVisibility] = useState(entity.visibility || "company");
  const [priority, setPriority] = useState(entity.priority || "medium");
  const [dueDate, setDueDate] = useState(
    entity.dueDate ? entity.dueDate.split("T")[0] : ""
  );

  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Handle expansion animation on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setIsExpanded(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleAnimatedClose = useCallback(() => {
    if (saving) return;
    setIsExpanded(false);
    setTimeout(() => {
      onClose();
    }, 280);
  }, [saving, onClose]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !confirmDeleteOpen && !confirmLeaveOpen) {
        handleAnimatedClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, confirmDeleteOpen, confirmLeaveOpen, handleAnimatedClose]);

  async function handleFormSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        color,
        coverPath,
        status,
        visibility,
        priority: entity.type === "project" ? priority : undefined,
        dueDate: entity.type === "project" ? (dueDate ? dueDate : null) : undefined,
      });
      handleAnimatedClose();
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem selecionada deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCoverPath(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  if (!isOpen) return null;

  const isProject = entity.type === "project";
  const initials = (name.trim().slice(0, 2).toUpperCase() || (isProject ? "PR" : "GE"));

  // Target window rect calculation
  const winWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const winHeight = typeof window !== "undefined" ? window.innerHeight : 768;
  const targetWidth = Math.min(winWidth * 0.94, 660);
  const targetHeight = Math.min(winHeight * 0.90, 720);
  const targetLeft = Math.max(12, (winWidth - targetWidth) / 2);
  const targetTop = Math.max(12, (winHeight - targetHeight) / 2);

  // Transition box style
  const modalStyle: React.CSSProperties = isExpanded
    ? {
        position: "fixed",
        top: `${targetTop}px`,
        left: `${targetLeft}px`,
        width: `${targetWidth}px`,
        height: `${targetHeight}px`,
        borderRadius: "1.25rem",
        transform: "none",
        opacity: 1,
        transition: "all 280ms cubic-bezier(0.16, 1, 0.3, 1)",
      }
    : originRect
    ? {
        position: "fixed",
        top: `${originRect.top}px`,
        left: `${originRect.left}px`,
        width: `${originRect.width}px`,
        height: `${originRect.height}px`,
        borderRadius: "0.75rem",
        transform: "none",
        opacity: 0.95,
        transition: "all 280ms cubic-bezier(0.16, 1, 0.3, 1)",
      }
    : {
        position: "fixed",
        top: `${targetTop}px`,
        left: `${targetLeft}px`,
        width: `${targetWidth}px`,
        height: `${targetHeight}px`,
        borderRadius: "1.25rem",
        transform: "scale(0.96)",
        opacity: 0,
        transition: "all 280ms cubic-bezier(0.16, 1, 0.3, 1)",
      };

  const statusOptions = isProject ? PROJECT_STATUS_OPTIONS : MANAGEMENT_STATUS_OPTIONS;
  const currentStatusObj = statusOptions.find((s) => s.value === status) || statusOptions[0];
  const currentVisObj = VISIBILITY_OPTIONS.find((v) => v.value === visibility) || VISIBILITY_OPTIONS[0];
  const currentPriorityObj = PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[2];

  const membersList = entity.members || [];
  const memberCount = membersList.length;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay escurecido suave */}
      <div
        className={cn(
          "fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-300",
          isExpanded ? "opacity-100" : "opacity-0"
        )}
        onClick={handleAnimatedClose}
      />

      {/* Input de upload oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Card expandido animado */}
      <div
        style={modalStyle}
        className="z-50 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-2xl focus:outline-none"
      >
        {/* Banner Superior com Capa e Controles */}
        <div
          className={cn(
            "relative w-full flex items-start justify-between p-3.5 transition-all duration-300 shrink-0",
            isExpanded ? "h-36 sm:h-44" : "h-24"
          )}
          style={
            coverPath
              ? {
                  backgroundImage: `url("${encodeURI(coverPath)}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, ${color}ee 0%, ${color}99 100%)`,
                }
          }
        >
          {/* Gradiente escuro para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

          {/* Botões do Topo da Capa */}
          <div className="relative z-20 flex items-center justify-between w-full">
            {/* Opções de Capa (Dropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white/90 hover:text-white text-xs font-medium backdrop-blur-xs transition-colors cursor-pointer border border-white/10"
                >
                  <ImageIcon className="size-3.5" />
                  <span>Alterar capa</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel>Imagem de Capa</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>Upload do computador</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Predefinições</DropdownMenuLabel>
                {COVER_GRADIENT_PRESETS.map((p) => (
                  <DropdownMenuItem
                    key={p.name}
                    onClick={() => {
                      setCoverPath(null);
                      setColor(p.color);
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <span
                      className="size-3.5 rounded-full shrink-0 border border-white/20"
                      style={{ background: p.value }}
                    />
                    <span>{p.name}</span>
                  </DropdownMenuItem>
                ))}

                {coverPath && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setCoverPath(null)}
                      className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Remover imagem</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botão Fechar X */}
            <button
              type="button"
              onClick={handleAnimatedClose}
              className="size-7 sm:size-8 rounded-full bg-black/50 hover:bg-black/80 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer border border-white/10"
              aria-label="Fechar modal"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Monograma / Avatar Integrado Sobrepondo o Banner */}
          <div className="absolute -bottom-5 left-5 z-20 flex items-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  className="relative group/avatar cursor-pointer"
                  title="Clique para alterar a cor do monograma"
                >
                  <div
                    className={cn(
                      "rounded-xl border-2 border-card flex items-center justify-center font-bold text-white shadow-lg transition-transform group-hover/avatar:scale-105",
                      isExpanded ? "size-14 sm:size-16 text-lg sm:text-xl" : "size-8 text-xs"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-background border border-border flex items-center justify-center text-foreground shadow-xs group-hover/avatar:bg-muted transition-colors">
                    <Palette className="size-2.5 text-muted-foreground" />
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="p-2 w-48">
                <DropdownMenuLabel className="text-xs mb-1.5">Cor do Monograma</DropdownMenuLabel>
                <div className="grid grid-cols-4 gap-1.5 p-1">
                  {MONOGRAM_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "size-7 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer",
                        color === c ? "border-primary ring-2 ring-ring" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="size-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tag da Entidade (Gestão ou Projeto) */}
            <div className="pb-1 hidden sm:block">
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border border-border bg-muted/80 text-muted-foreground uppercase tracking-wider">
                {isProject ? "Projeto" : "Gestão"}
              </span>
            </div>
          </div>
        </div>

        {/* Corpo do Modal - Conteúdo Totalmente Editável */}
        <form
          onSubmit={handleFormSubmit}
          className="flex-1 overflow-y-auto px-5 sm:px-6 pt-8 pb-5 space-y-4"
        >
          {/* Linha de Título com Edição Direta Minimalista */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="sm:hidden shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/80 text-muted-foreground">
                {isProject ? "Projeto" : "Gestão"}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isProject ? "Nome do projeto..." : "Nome da gestão..."}
                required
                maxLength={300}
                className="w-full text-base sm:text-lg font-bold text-foreground bg-transparent border border-transparent hover:border-border/60 focus:border-primary/50 focus:bg-muted/30 rounded-lg px-2 py-1 transition-all outline-none"
              />
            </div>

            {/* Descrição em Edição Inline Confortável */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma breve descrição sobre os objetivos ou escopo..."
              rows={2}
              maxLength={5000}
              className="w-full text-xs sm:text-sm text-muted-foreground bg-transparent border border-transparent hover:border-border/60 focus:border-primary/50 focus:bg-muted/30 rounded-lg px-2 py-1.5 transition-all outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Grid de Metadados e Controles Compactos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-y border-border/60 py-3.5">
            {/* 1. Status */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CircleDot className="size-3.5 text-muted-foreground" />
                Status
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                  >
                    <currentStatusObj.icon className="size-3 text-primary" />
                    <span>{currentStatusObj.label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {statusOptions.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      className="gap-2 cursor-pointer"
                    >
                      <opt.icon className="size-3.5" />
                      <span>{opt.label}</span>
                      {status === opt.value && <Check className="size-3.5 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 2. Visibilidade */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                Visibilidade
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                  >
                    <currentVisObj.icon className="size-3 text-primary" />
                    <span>{currentVisObj.label}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.value}
                      onClick={() => setVisibility(opt.value)}
                      className="gap-2 cursor-pointer"
                    >
                      <opt.icon className="size-3.5" />
                      <span>{opt.label}</span>
                      {visibility === opt.value && <Check className="size-3.5 ml-auto" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 3. Data de Início (Informativa, Não editável) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                Criado em
              </span>
              <span className="text-xs font-mono font-medium text-foreground px-2 py-0.5 rounded bg-muted/50 border border-border/40 select-none">
                {formatDateDisplay(entity.createdAt)}
              </span>
            </div>

            {/* 4. Prazo / Data Final (Editável para projetos ou informativa para gestão) */}
            {isProject ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  Prazo final
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-xs font-mono font-medium text-foreground bg-muted/50 hover:bg-muted border border-border/60 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  />
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate("")}
                      className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                      title="Remover prazo"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Prioridade ou Código para Gestão */
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <Folder className="size-3.5 text-muted-foreground" />
                  Identificador
                </span>
                <span className="text-xs font-mono text-muted-foreground truncate max-w-[140px]">
                  {entity.code || entity.id.slice(0, 10)}
                </span>
              </div>
            )}

            {/* 5. Prioridade (Somente Projeto) */}
            {isProject && (
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 sm:col-span-2">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-muted-foreground" />
                  Prioridade
                </span>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
                    >
                      <span className={cn("size-2 rounded-full", currentPriorityObj.value === "urgent" ? "bg-destructive" : currentPriorityObj.value === "high" ? "bg-amber-500" : currentPriorityObj.value === "medium" ? "bg-blue-500" : "bg-muted-foreground")} />
                      <span>{currentPriorityObj.label}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setPriority(opt.value)}
                        className="gap-2 cursor-pointer text-xs"
                      >
                        <span className={opt.colorClass}>{opt.label}</span>
                        {priority === opt.value && <Check className="size-3.5 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Seção de Membros */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-muted-foreground" />
                Membros da equipe ({memberCount})
              </span>

              {onManageMembers && canManageMembers && (
                <button
                  type="button"
                  onClick={onManageMembers}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Plus className="size-3" />
                  <span>Gerenciar membros</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20 min-h-[46px]">
              {membersList.length > 0 ? (
                <>
                  {membersList.map((m, idx) => (
                    <div
                      key={m.userId || idx}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border/60 text-xs shadow-2xs"
                      title={m.user?.name || "Membro"}
                    >
                      <div className="size-5 rounded-full bg-muted overflow-hidden flex items-center justify-center text-[8px] font-bold">
                        <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                      </div>
                      <span className="font-medium text-foreground text-[11px] truncate max-w-[110px]">
                        {m.user?.name || "Membro"}
                      </span>
                      {m.role && (
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">
                          ({m.role})
                        </span>
                      )}
                    </div>
                  ))}
                  {onManageMembers && canManageMembers && (
                    <button
                      type="button"
                      onClick={onManageMembers}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-border/80 bg-background hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                    >
                      <Plus className="size-3" />
                      <span>Adicionar</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 py-0.5">
                  <span className="text-xs text-muted-foreground">
                    Nenhum membro vinculado individualmente.
                  </span>
                  {onManageMembers && canManageMembers && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onManageMembers}
                      className="h-7 text-xs font-semibold gap-1.5 cursor-pointer shrink-0 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar integrantes</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé do Modal com Ações */}
          <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
            {/* Ações Destrutivas (Excluir / Sair) */}
            <div className="flex items-center gap-1">
              {onDelete && canWrite && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  <span>Excluir {isProject ? "projeto" : "gestão"}</span>
                </Button>
              )}

              {onLeave && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmLeaveOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer gap-1.5"
                >
                  <LogOut className="size-3.5" />
                  <span>Sair</span>
                </Button>
              )}
            </div>

            {/* Ações de Cancelar e Salvar */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAnimatedClose}
                disabled={saving}
                className="text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={saving || !name.trim()}
                className="text-xs font-semibold gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Salvar alterações</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Diálogo de Confirmação para Excluir */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir {isProject ? "projeto" : "gestão"}
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &ldquo;{entity.name}&rdquo;? Esta ação removerá todos os dados vinculados e não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                setConfirmDeleteOpen(false);
                if (onDelete) await onDelete();
                handleAnimatedClose();
              }}
            >
              Sim, excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Sair */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isProject ? "Sair do projeto" : "Sair da gestão"}
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deixar de participar de &ldquo;{entity.name}&rdquo;? Você perderá o acesso direto a este painel.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmLeaveOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                setConfirmLeaveOpen(false);
                if (onLeave) await onLeave();
                handleAnimatedClose();
              }}
            >
              Sim, sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>,
    document.body
  );
}
