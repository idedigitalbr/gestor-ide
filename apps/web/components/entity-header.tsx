"use client";

import React, { useMemo, useState } from "react";
import {
  Clock,
  CircleDot,
  Calendar,
  Users,
  Shield,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import type { TeamMemberItem } from "@/components/members-dialog";
import {
  MANAGEMENT_VISIBILITY_LABELS,
  PROJECT_STATUS_LABELS,
  stripManagementPrefix,
  stripProjectPrefix,
} from "@/lib/list-view-options";
import { cn } from "@/lib/utils";

export type EntityHeaderType = "project" | "management";

export interface HeaderKpiItem {
  key: string;
  label: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgColor?: string;
}

export interface HeaderOptionItem {
  value: string;
  label: string;
}

export interface EntityHeaderProps {
  type: EntityHeaderType;
  id: string;
  name: string;
  description?: string | null;
  code?: string | null;
  color?: string | null;
  createdAt?: string | null;
  dueDate?: string | null;
  status?: string | null;
  visibility?: string | null;

  // Breadcrumb / Parent
  parentBadge?: {
    icon?: React.ReactNode;
    label: string;
    onClick?: () => void;
  } | null;

  // Back button (ex: "Voltar para Gestões")
  onBack?: () => void;
  backLabel?: string;

  // KPIs (3 blocos de métricas)
  kpis: HeaderKpiItem[];

  // Membros
  members?: TeamMemberItem[];
  memberCount?: number;
  onOpenMembers?: () => void;

  // Permissões e Opções
  canWrite?: boolean;
  statusOptions?: HeaderOptionItem[];
  visibilityOptions?: HeaderOptionItem[];

  onUpdate?: (updates: {
    name?: string;
    description?: string;
    status?: string;
    dueDate?: string | null;
    visibility?: string;
  }) => Promise<void> | void;
  onRefresh?: () => void;

  className?: string;
}

/**
 * Formata data no formato brasileiro amigável (ex: "sex (20/nov)")
 */
function formatFriendlyDate(dateString?: string | null): string {
  if (!dateString) return "Sem prazo";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    const months = [
      "jan",
      "fev",
      "mar",
      "abr",
      "mai",
      "jun",
      "jul",
      "ago",
      "set",
      "out",
      "nov",
      "dez",
    ];
    const w = weekdays[d.getDay()];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    return `${w} (${day}/${month})`;
  } catch {
    return dateString;
  }
}

const DEFAULT_PROJECT_STATUS_OPTIONS: HeaderOptionItem[] = [
  { value: "active", label: "Ativo" },
  { value: "in_progress", label: "Fazendo agora" },
  { value: "paused", label: "Pausado" },
  { value: "completed", label: "Concluído" },
  { value: "planning", label: "Planejamento" },
];

const DEFAULT_MANAGEMENT_STATUS_OPTIONS: HeaderOptionItem[] = [
  { value: "active", label: "Ativa" },
  { value: "in_progress", label: "Fazendo agora" },
  { value: "paused", label: "Pausada" },
  { value: "completed", label: "Concluída" },
  { value: "archived", label: "Arquivada" },
];

const DEFAULT_VISIBILITY_OPTIONS: HeaderOptionItem[] = [
  { value: "team", label: "Equipe" },
  { value: "company", label: "Empresa" },
  { value: "unit", label: "Unidade" },
  { value: "private", label: "Privado" },
];

export function EntityHeader({
  type,
  id,
  name,
  description,
  code,
  color,
  createdAt,
  dueDate,
  status,
  visibility,
  parentBadge,
  onBack,
  backLabel,
  kpis,
  members,
  memberCount,
  onOpenMembers,
  canWrite = true,
  statusOptions,
  visibilityOptions,
  onUpdate,
  onRefresh,
  className,
}: EntityHeaderProps) {
  // Controle de expansão/recolhimento do cabeçalho com persistência em localStorage
  const storageKey = `gestor_header_expanded_${type}_${id}`;
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleHeaderExpanded = () => {
    setIsHeaderExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, String(next));
      } catch {}
      return next;
    });
  };

  // Edição rápida (nome, descrição e prazo se aplicável)
  const [isEditing, setIsEditing] = useState(false);
  const [editNameText, setEditNameText] = useState("");
  const [editDescriptionText, setEditDescriptionText] = useState("");
  const [editDueDateText, setEditDueDateText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Popover rápido de data de entrega
  const [isDuePopoverOpen, setIsDuePopoverOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState("");

  const handleOpenEdit = () => {
    if (!canWrite) return;
    setEditNameText(name || "");
    setEditDescriptionText(description || "");
    setEditDueDateText(dueDate ? dueDate.split("T")[0] : "");
    setIsEditing(true);
  };

  const handleOpenDuePopover = (open: boolean) => {
    if (open) {
      setDueDateInput(dueDate ? dueDate.split("T")[0] : "");
    }
    setIsDuePopoverOpen(open);
  };

  // Iniciais e cor
  const badgeColor = color || "var(--primary)";
  const initials = useMemo(() => {
    const defaultInit = type === "management" ? "GE" : "PR";
    const trimmed = (name || defaultInit).trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase() || defaultInit;
  }, [name, type]);

  // Título limpo sem redundâncias
  const displayTitle = useMemo(() => {
    return type === "project" ? stripProjectPrefix(name) : stripManagementPrefix(name);
  }, [type, name]);

  const badgeText = type === "project" ? "Projeto" : "Gestão";

  // Integrantes resolvidos
  const resolvedMembers = members ?? [];
  const resolvedMemberCount = memberCount ?? resolvedMembers.length ?? 1;

  // Data formatada de criação
  const formattedCreatedDate = useMemo(() => {
    if (!createdAt) return type === "management" ? "08/07/2026" : "09/11/2026";
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return type === "management" ? "08/07/2026" : "09/11/2026";
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return type === "management" ? "08/07/2026" : "09/11/2026";
    }
  }, [createdAt, type]);

  // Data amigável de entrega
  const formattedDueDate = useMemo(() => {
    return formatFriendlyDate(dueDate);
  }, [dueDate]);

  // Opções de Status
  const effectiveStatusOptions = useMemo(() => {
    if (statusOptions && statusOptions.length > 0) return statusOptions;
    return type === "project"
      ? DEFAULT_PROJECT_STATUS_OPTIONS
      : DEFAULT_MANAGEMENT_STATUS_OPTIONS;
  }, [statusOptions, type]);

  // Label do status atual
  const currentStatusLabel = useMemo(() => {
    const raw = (status || "active").toLowerCase();
    const found = effectiveStatusOptions.find(
      (s) => s.value.toLowerCase() === raw || s.label.toLowerCase() === raw
    );
    if (found) return found.label;
    if (PROJECT_STATUS_LABELS[raw]) return PROJECT_STATUS_LABELS[raw];
    if (raw === "concluida" || raw === "concluído") return type === "management" ? "Concluída" : "Concluído";
    if (raw === "fazendo") return "Fazendo agora";
    if (raw === "ativa" || raw === "ativo") return type === "management" ? "Ativa" : "Ativo";
    return status || (type === "management" ? "Ativa" : "Ativo");
  }, [status, effectiveStatusOptions, type]);

  // Opções de Visibilidade
  const effectiveVisibilityOptions = useMemo(() => {
    if (visibilityOptions && visibilityOptions.length > 0) return visibilityOptions;
    return DEFAULT_VISIBILITY_OPTIONS;
  }, [visibilityOptions]);

  // Label da visibilidade atual
  const currentVisibilityLabel = useMemo(() => {
    const raw = (visibility || (type === "management" ? "company" : "team")).toLowerCase();
    const found = effectiveVisibilityOptions.find((v) => v.value.toLowerCase() === raw);
    if (found) return found.label;
    if (MANAGEMENT_VISIBILITY_LABELS[raw]) return MANAGEMENT_VISIBILITY_LABELS[raw];
    return type === "management" ? "Empresa" : "Equipe";
  }, [visibility, effectiveVisibilityOptions, type]);

  async function handleSave() {
    setIsSaving(true);
    try {
      await onUpdate?.({
        name: editNameText.trim() || name,
        description: editDescriptionText.trim(),
        dueDate: type === "project" ? (editDueDateText ? editDueDateText : null) : undefined,
      });
      setIsEditing(false);
      onRefresh?.();
    } catch (err) {
      console.error(`Erro ao salvar dados do ${type}:`, err);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSelectStatus(statusValue: string) {
    try {
      await onUpdate?.({ status: statusValue });
      onRefresh?.();
    } catch (err) {
      console.error(`Erro ao alterar status do ${type}:`, err);
    }
  }

  async function handleSelectVisibility(visValue: string) {
    try {
      await onUpdate?.({ visibility: visValue });
      onRefresh?.();
    } catch (err) {
      console.error(`Erro ao alterar visibilidade do ${type}:`, err);
    }
  }

  async function handleUpdateDueDate(newDueDate: string | null) {
    try {
      await onUpdate?.({ dueDate: newDueDate });
      setIsDuePopoverOpen(false);
      onRefresh?.();
    } catch (err) {
      console.error("Erro ao alterar prazo de entrega:", err);
    }
  }

  const showDueDate = type === "project" || dueDate !== undefined;

  return (
    <div className={cn("w-full transition-all", className)}>
      {/* ========================================================================= */}
      {/* MODO RETRAÍDO OU EXPANDIDO                                                */}
      {/* ========================================================================= */}
      {!isHeaderExpanded ? (
        /* Cabeçalho Retraído Minimalista */
        <div className="rounded-2xl border border-border/80 bg-card p-2 sm:px-4 sm:py-2.5 shadow-xs flex items-center justify-between gap-3 transition-all mb-3.5">
          {/* Esquerda: Voltar / Parent + Iniciais + Badge + Nome */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {onBack && !parentBadge && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title={`Voltar para ${backLabel || "Gestões"}`}
                >
                  <ArrowLeft className="size-3.5" />
                  <span>{backLabel || "Gestões"}</span>
                </Button>
                <div className="h-4 w-px bg-border/60 shrink-0" />
              </>
            )}

            <div
              className="size-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0 select-none"
              style={{ backgroundColor: badgeColor }}
            >
              {initials}
            </div>

            {parentBadge && (
              <button
                type="button"
                onClick={parentBadge.onClick}
                className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-muted/40 hover:bg-muted/80 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                title={`Voltar para ${parentBadge.label}`}
              >
                {parentBadge.icon}
                <span className="truncate max-w-[120px]">{parentBadge.label}</span>
              </button>
            )}

            <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground select-none">
              {badgeText}
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate tracking-tight">
              {displayTitle}
            </span>
          </div>

          {/* Direita: Mini KPIs + Avatar + Integrantes + Botão Chevron Down */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 3 KPIs Compactos */}
            <div className="flex items-center gap-3 text-xs">
              {kpis.map((kpi) => (
                <span
                  key={kpi.key}
                  className="flex items-center gap-1 text-muted-foreground"
                  title={kpi.label}
                >
                  <span className="shrink-0">{kpi.icon}</span>
                  <span className="font-semibold text-foreground text-xs">{kpi.value}</span>
                </span>
              ))}
            </div>

            {/* Avatar do Membro */}
            {resolvedMembers.length > 0 && (
              <div
                onClick={onOpenMembers}
                className="flex -space-x-1.5 items-center cursor-pointer hover:opacity-80 transition-opacity"
                title="Ver e gerenciar integrantes"
              >
                {resolvedMembers.slice(0, 1).map((m, idx) => (
                  <div
                    key={m.userId || idx}
                    className="size-6 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[8px] font-bold text-foreground select-none"
                    title={m.name || "Membro"}
                  >
                    <MemberAvatarContent name={m.name} src={m.avatarUrl} />
                  </div>
                ))}
              </div>
            )}

            {/* Contagem de Integrantes */}
            <button
              type="button"
              onClick={onOpenMembers}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title={`Ver e gerenciar integrantes`}
            >
              <Users className="size-3.5 text-muted-foreground/80" />
              <span className="font-semibold text-foreground text-xs">{resolvedMemberCount}</span>
            </button>

            {/* Toggle Chevron Down para Expandir */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleHeaderExpanded}
              className="size-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 cursor-pointer shrink-0"
              title="Expandir cabeçalho"
              aria-label="Expandir cabeçalho"
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* Cabeçalho Expandido - Layout Fiel ao Design com Lápis no Hover */
        <div className="rounded-2xl border border-border/80 bg-card p-3 sm:px-4 sm:py-3 lg:px-5 lg:py-3.5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 sm:gap-4 transition-all mb-3.5">
          {/* Lado Esquerdo: Avatar + [Parent Badge / Voltar] + [Badge] Título + Descrição */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {onBack && !parentBadge && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title={`Voltar para ${backLabel || "Gestões"}`}
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">{backLabel || "Gestões"}</span>
                </Button>
                <div className="h-5 w-px bg-border/60 shrink-0" />
              </div>
            )}

            {/* Badge Quadrado com Iniciais */}
            <div
              className="size-11 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-xs shrink-0 select-none"
              style={{ backgroundColor: badgeColor }}
            >
              {initials}
            </div>

            {/* Bloco Central de Textos */}
            <div className="min-w-0 flex-1 space-y-1">
              {/* Linha 1: Parent Breadcrumb (quando aplicável) */}
              {parentBadge && (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={parentBadge.onClick}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/70 bg-muted/40 hover:bg-muted/80 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title={`Voltar para ${parentBadge.label}`}
                  >
                    {parentBadge.icon}
                    <span className="truncate max-w-[280px]">{parentBadge.label}</span>
                  </button>
                </div>
              )}

              {/* Linha 2: Badge [Projeto/Gestão] + Nome (com lápis discreto apenas no hover) */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground select-none">
                  {badgeText}
                </span>
                <div
                  onClick={handleOpenEdit}
                  className={cn(
                    "group/title inline-flex items-center gap-1.5 min-w-0",
                    canWrite && "cursor-pointer"
                  )}
                  title={canWrite ? `Clique para editar o ${badgeText.toLowerCase()}` : undefined}
                >
                  <h1 className="text-sm sm:text-base font-bold text-foreground truncate tracking-tight group-hover/title:text-primary transition-colors">
                    {displayTitle}
                  </h1>
                  {canWrite && (
                    <span className="opacity-0 group-hover/title:opacity-100 transition-opacity duration-150 text-muted-foreground/70 group-hover/title:text-foreground shrink-0">
                      <Pencil className="size-3" />
                    </span>
                  )}
                </div>
                {code && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/70 bg-muted/60 text-muted-foreground shrink-0 select-none">
                    {code}
                  </span>
                )}
              </div>

              {/* Linha 3: Descrição (com lápis discreto apenas no hover) */}
              <div
                onClick={handleOpenEdit}
                className={cn(
                  "group/desc inline-flex items-center gap-1.5 text-xs text-muted-foreground max-w-full min-w-0",
                  canWrite && "cursor-pointer"
                )}
                title={canWrite ? `Clique para editar a descrição do ${badgeText.toLowerCase()}` : undefined}
              >
                <span className="truncate group-hover/desc:text-foreground/90 transition-colors">
                  {description?.trim() || `Sem descrição definida para este ${badgeText.toLowerCase()}.`}
                </span>
                {canWrite && (
                  <span className="opacity-0 group-hover/desc:opacity-100 transition-opacity duration-150 text-muted-foreground/70 group-hover/desc:text-foreground shrink-0">
                    <Pencil className="size-2.5" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: KPIs no topo + Metadados alinhados na linha de baixo */}
          <div className="flex flex-col items-start xl:items-end justify-between gap-2.5 shrink-0 pt-2.5 xl:pt-0 border-t xl:border-t-0 border-border/50">
            {/* Linha Superior: 3 KPIs + Avatares + Membros + Botão Chevron Up */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* 3 KPIs Compactos em Linha Horizontal */}
              <div className="flex items-center gap-3 sm:gap-4">
                {kpis.map((kpi) => (
                  <div key={kpi.key} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-8 rounded-lg flex items-center justify-center shrink-0",
                        kpi.iconBgColor || "bg-secondary text-foreground"
                      )}
                    >
                      {kpi.icon}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground leading-tight">{kpi.label}</p>
                      <p className="text-sm font-bold text-foreground leading-tight">{kpi.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divisor */}
              <div className="h-6 w-px bg-border/60 shrink-0 hidden sm:block" />

              {/* Membros (Avatares Empilhados + Botão com Contagem) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {resolvedMembers.length > 0 && (
                  <div
                    onClick={onOpenMembers}
                    className="flex -space-x-2 items-center mr-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                    title="Ver e gerenciar integrantes"
                  >
                    {resolvedMembers.slice(0, 3).map((m, idx) => (
                      <div
                        key={m.userId || idx}
                        className="size-7 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[9px] font-bold text-foreground select-none"
                        title={m.name || "Membro"}
                      >
                        <MemberAvatarContent name={m.name} src={m.avatarUrl} />
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOpenMembers}
                  className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/60"
                  title="Ver e gerenciar integrantes"
                >
                  <Users className="size-3.5 text-muted-foreground/80" />
                  <span className="font-semibold text-foreground text-xs">{resolvedMemberCount}</span>
                </Button>
              </div>

              {/* Toggle Chevron Up para Recolher */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleHeaderExpanded}
                className="size-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 cursor-pointer shrink-0"
                title="Recolher cabeçalho"
                aria-label="Recolher cabeçalho"
              >
                <ChevronUp className="size-4" />
              </Button>
            </div>

            {/* Linha Inferior: Metadados (Criado em | Entrega | Status | Visibilidade) */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
              {/* Criado em / Criada em */}
              <span className="flex items-center gap-1.5 shrink-0 select-none">
                <Calendar className="size-3 text-muted-foreground/70" />
                <span>
                  {type === "management" ? "Criada" : "Criado"} em {formattedCreatedDate}
                </span>
              </span>

              {/* Prazo de Entrega (se aplicável) com Popover Rápido e Lápis no Hover */}
              {showDueDate && (
                canWrite ? (
                  <Popover open={isDuePopoverOpen} onOpenChange={handleOpenDuePopover}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="group/due flex items-center gap-1.5 shrink-0 cursor-pointer hover:text-foreground transition-colors"
                        title="Clique para alterar a data de entrega"
                      >
                        <Clock className="size-3 text-muted-foreground/70" />
                        <span>Entrega: {formattedDueDate}</span>
                        <span className="opacity-0 group-hover/due:opacity-100 transition-opacity duration-150 text-muted-foreground/70 group-hover/due:text-foreground">
                          <Pencil className="size-2.5" />
                        </span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 p-3 space-y-2.5">
                      <p className="text-xs font-semibold text-foreground">Prazo de entrega</p>
                      <Input
                        type="date"
                        value={dueDateInput}
                        onChange={(e) => setDueDateInput(e.target.value)}
                        className="text-xs h-8"
                      />
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleUpdateDueDate(null)}
                          className="text-xs h-7 px-2"
                        >
                          Sem prazo
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleUpdateDueDate(dueDateInput || null)}
                          className="text-xs h-7 px-3 font-medium"
                        >
                          Salvar
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Clock className="size-3 text-muted-foreground/70" />
                    <span>Entrega: {formattedDueDate}</span>
                  </span>
                )
              )}

              {/* Status com Menu Dropdown e Lápis no Hover */}
              {canWrite ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="group/status flex items-center gap-1.5 shrink-0 cursor-pointer hover:text-foreground transition-colors"
                      title={`Clique para alterar o status`}
                    >
                      <CircleDot className="size-3 text-muted-foreground/70" />
                      <span>Status: {currentStatusLabel}</span>
                      <span className="opacity-0 group-hover/status:opacity-100 transition-opacity duration-150 text-muted-foreground/70 group-hover/status:text-foreground">
                        <Pencil className="size-2.5" />
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                      Status
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {effectiveStatusOptions.map((st) => {
                      const isSelected =
                        (status || "active").toLowerCase() === st.value.toLowerCase() ||
                        (status || "active").toLowerCase() === st.label.toLowerCase();
                      return (
                        <DropdownMenuItem
                          key={st.value}
                          onClick={() => void handleSelectStatus(st.value)}
                          className={cn(
                            "text-xs cursor-pointer",
                            isSelected && "font-bold text-primary"
                          )}
                        >
                          {st.label}
                          {isSelected && <Check className="size-3 ml-auto text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="flex items-center gap-1.5 shrink-0">
                  <CircleDot className="size-3 text-muted-foreground/70" />
                  <span>Status: {currentStatusLabel}</span>
                </span>
              )}

              {/* Visibilidade com Menu Dropdown e Lápis no Hover */}
              {canWrite ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="group/vis flex items-center gap-1.5 shrink-0 cursor-pointer hover:text-foreground transition-colors"
                      title={`Clique para alterar a visibilidade`}
                    >
                      <Shield className="size-3 text-muted-foreground/70" />
                      <span>Visibilidade: {currentVisibilityLabel}</span>
                      <span className="opacity-0 group-hover/vis:opacity-100 transition-opacity duration-150 text-muted-foreground/70 group-hover/vis:text-foreground">
                        <Pencil className="size-2.5" />
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                      Visibilidade
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {effectiveVisibilityOptions.map((opt) => {
                      const currentVis = (visibility || (type === "management" ? "company" : "team")).toLowerCase();
                      const isSelected = currentVis === opt.value.toLowerCase();
                      return (
                        <DropdownMenuItem
                          key={opt.value}
                          onClick={() => void handleSelectVisibility(opt.value)}
                          className={cn(
                            "text-xs cursor-pointer",
                            isSelected && "font-bold text-primary"
                          )}
                        >
                          {opt.label}
                          {isSelected && <Check className="size-3 ml-auto text-primary" />}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="flex items-center gap-1.5 shrink-0">
                  <Shield className="size-3 text-muted-foreground/70" />
                  <span>Visibilidade: {currentVisibilityLabel}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Diálogo Completo para Editar (Nome, Descrição e Prazo) */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Editar {badgeText.toLowerCase()}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize as informações principais {type === "management" ? "desta gestão" : "deste projeto"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label htmlFor="edit-entity-name" className="text-xs font-semibold text-foreground">
                Nome {type === "management" ? "da gestão" : "do projeto"}
              </label>
              <Input
                id="edit-entity-name"
                value={editNameText}
                onChange={(e) => setEditNameText(e.target.value)}
                placeholder={type === "management" ? "Ex: Gestão Comercial" : "Ex: Redesign da Interface"}
                className="text-xs h-8"
              />
            </div>
            {showDueDate && (
              <div className="space-y-1">
                <label htmlFor="edit-entity-due" className="text-xs font-semibold text-foreground">
                  Prazo de entrega
                </label>
                <Input
                  id="edit-entity-due"
                  type="date"
                  value={editDueDateText}
                  onChange={(e) => setEditDueDateText(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            )}
            <div className="space-y-1">
              <label htmlFor="edit-entity-desc" className="text-xs font-semibold text-foreground">
                Descrição e objetivos
              </label>
              <Textarea
                id="edit-entity-desc"
                value={editDescriptionText}
                onChange={(e) => setEditDescriptionText(e.target.value)}
                placeholder={`Descreva as metas, escopo e entregas ${type === "management" ? "desta gestão" : "deste projeto"}...`}
                rows={4}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="text-xs font-semibold gap-1.5"
            >
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
