"use client";

import React, { useMemo, useState } from "react";
import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  CircleDot,
  Calendar,
  Users,
  Shield,
  ArrowLeft,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  Folder,
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import type { TeamMemberItem } from "@/components/members-dialog";
import {
  MANAGEMENT_VISIBILITY_LABELS,
  PROJECT_STATUS_LABELS,
  stripProjectPrefix,
} from "@/lib/list-view-options";
import { cn } from "@/lib/utils";

export interface ProjectHeaderProps {
  project: CrmProject;
  management?: CrmProjectManagement | null;
  tasks: Task[];
  members?: TeamMemberItem[];
  canWrite?: boolean;
  isConnectedCrm?: boolean;
  onOpenMembers?: () => void;
  onBack?: () => void;
  onUpdateProject?: (updates: {
    description?: string;
    status?: string;
    priority?: string;
    name?: string;
  }) => Promise<void> | void;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Formata data no formato brasileiro amigável (ex: "sex (20/nov)")
 */
function formatProjectFriendlyDate(dateString?: string | null): string {
  if (!dateString) return "Sem data";
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

const PROJECT_STATUS_OPTIONS = [
  { value: "active", label: "Ativo" },
  { value: "in_progress", label: "Fazendo agora" },
  { value: "paused", label: "Pausado" },
  { value: "completed", label: "Concluído" },
  { value: "planning", label: "Planejamento" },
];

export function ProjectHeader({
  project,
  management,
  tasks,
  members,
  canWrite = true,
  onOpenMembers,
  onBack,
  onUpdateProject,
  onRefresh,
  className,
}: ProjectHeaderProps) {
  // Controle de expansão/recolhimento do cabeçalho com persistência em localStorage (expandido por padrão)
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem(`gestor_project_header_expanded_${project.id}`);
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const toggleHeaderExpanded = () => {
    setIsHeaderExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`gestor_project_header_expanded_${project.id}`, String(next));
      } catch {}
      return next;
    });
  };

  // Edição rápida de projeto (nome e descrição)
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editNameText, setEditNameText] = useState(project.name || "");
  const [editDescriptionText, setEditDescriptionText] = useState(project.description || "");
  const [isSavingProject, setIsSavingProject] = useState(false);

  // Contagem de tarefas do projeto
  const projectTasks = useMemo(() => {
    const list = tasks.filter((t) => t.projectId === project.id);
    return list.length > 0 ? list : tasks;
  }, [tasks, project.id]);

  const totalTasksCount = projectTasks.length || (project._count?.tasks ?? 0);

  const completedTasksCount = useMemo(() => {
    return projectTasks.filter(
      (t) => normalizeTaskStatus(t.status) === "CONCLUÍDO"
    ).length;
  }, [projectTasks]);

  const pendingTasksCount = Math.max(0, totalTasksCount - completedTasksCount);

  // Iniciais e cor do projeto
  const projectColor = project.color || management?.color || "var(--primary)";
  const initials = useMemo(() => {
    const trimmed = (project.name || "PR").trim();
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase() || "PR";
  }, [project.name]);

  // Integrantes resolvidos
  const resolvedMembers = useMemo<TeamMemberItem[]>(() => {
    if (members && members.length > 0) return members;
    if (project.members && project.members.length > 0) {
      const list: TeamMemberItem[] = [];
      for (const m of project.members) {
        const uid = m.userId || m.user?.id;
        if (!uid) continue;
        list.push({
          userId: uid,
          name: m.user?.name,
          email: m.user?.email,
          avatarUrl: m.user?.avatarUrl,
          role: m.role,
        });
      }
      return list;
    }
    return [];
  }, [members, project.members]);

  const memberCount = resolvedMembers.length || project._count?.members || 1;

  // Data formatada de criação
  const formattedCreatedDate = useMemo(() => {
    if (!project.createdAt) return "08/07/2026";
    try {
      const d = new Date(project.createdAt);
      if (isNaN(d.getTime())) return "08/07/2026";
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return "08/07/2026";
    }
  }, [project.createdAt]);

  // Data amigável de entrega
  const formattedDueDate = useMemo(() => {
    return formatProjectFriendlyDate(project.dueDate);
  }, [project.dueDate]);

  // Label do status atual
  const currentStatusLabel = useMemo(() => {
    const raw = (project.status || "active").toLowerCase();
    const found = PROJECT_STATUS_OPTIONS.find((s) => s.value === raw);
    if (found) return found.label;
    if (PROJECT_STATUS_LABELS[raw]) return PROJECT_STATUS_LABELS[raw];
    if (raw === "concluida" || raw === "concluído") return "Concluído";
    if (raw === "fazendo") return "Fazendo agora";
    if (raw === "ativa" || raw === "ativo") return "Ativo";
    return project.status || "Ativo";
  }, [project.status]);

  async function handleSaveProject() {
    setIsSavingProject(true);
    try {
      await onUpdateProject?.({
        name: editNameText.trim() || project.name,
        description: editDescriptionText.trim(),
      });
      setIsEditingProject(false);
      onRefresh?.();
    } catch (err) {
      console.error("Erro ao salvar dados do projeto:", err);
    } finally {
      setIsSavingProject(false);
    }
  }

  async function handleSelectStatus(statusValue: string) {
    try {
      await onUpdateProject?.({ status: statusValue });
      onRefresh?.();
    } catch (err) {
      console.error("Erro ao alterar status do projeto:", err);
    }
  }

  const backLabel = management?.name ? management.name : "Projetos";

  return (
    <div className={cn("w-full transition-all", className)}>
      {/* ========================================================================= */}
      {/* CABEÇALHO DO PROJETO: MODO RETRAÍDO OU EXPANDIDO                          */}
      {/* ========================================================================= */}
      {!isHeaderExpanded ? (
        /* Cabeçalho Retraído Minimalista */
        <div className="rounded-2xl border border-border/80 bg-card p-2 sm:px-4 sm:py-2.5 shadow-xs flex items-center justify-between gap-3 transition-all mb-3.5">
          {/* Esquerda: Voltar + Iniciais + Nome */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {onBack && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title={`Voltar para ${backLabel}`}
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline truncate max-w-[140px]">{backLabel}</span>
                  <span className="sm:hidden">Voltar</span>
                </Button>
                <div className="h-4 w-px bg-border/60 shrink-0" />
              </>
            )}

            <div
              className="size-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: projectColor }}
            >
              {initials}
            </div>

            <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
              Projeto
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate tracking-tight">
              {stripProjectPrefix(project.name)}
            </span>
          </div>

          {/* Direita: Mini KPIs + Avatar + Integrantes + Botão Chevron Down */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 3 KPIs: Tarefas, Concluídas, Pendentes */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground" title="Total de tarefas">
                <ListTodo className="size-3.5 text-blue-400" />
                <span className="font-semibold text-foreground text-xs">{totalTasksCount}</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground" title="Tarefas concluídas">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span className="font-semibold text-foreground text-xs">{completedTasksCount}</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground" title="Tarefas pendentes">
                <Clock className="size-3.5 text-purple-400" />
                <span className="font-semibold text-foreground text-xs">{pendingTasksCount}</span>
              </span>
            </div>

            {/* Avatar do Membro */}
            {resolvedMembers.length > 0 && (
              <div className="flex -space-x-1.5 items-center">
                {resolvedMembers.slice(0, 1).map((m, idx) => (
                  <div
                    key={m.userId || idx}
                    className="size-6 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[8px] font-bold text-foreground"
                    title={m.name || "Membro"}
                  >
                    <MemberAvatarContent name={m.name} src={m.avatarUrl} />
                  </div>
                ))}
              </div>
            )}

            {/* Contagem de Integrantes com Ícone de Usuários */}
            <button
              type="button"
              onClick={onOpenMembers}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Ver e gerenciar integrantes do projeto"
            >
              <Users className="size-3.5 text-muted-foreground/80" />
              <span className="font-semibold text-foreground text-xs">{memberCount}</span>
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
        /* Cabeçalho Expandido (Pixel-Perfect Reutilizando o Layout da Gestão) */
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:px-5 sm:py-3.5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all mb-3.5">
          {/* Lado Esquerdo: Voltar + Avatar + Título, Descrição e Metadados */}
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            {onBack && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title={`Voltar para ${backLabel}`}
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline truncate max-w-[140px]">{backLabel}</span>
                  <span className="sm:hidden">Voltar</span>
                </Button>
                <div className="h-5 w-px bg-border/60 shrink-0" />
              </div>
            )}

            {/* Badge Quadrado com Iniciais do Projeto */}
            <div
              className="size-10 sm:size-11 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: projectColor }}
            >
              {initials}
            </div>

            {/* Bloco Central de Textos do Projeto */}
            <div className="min-w-0 flex-1 space-y-0.5">
              {/* Linha 1: Título + Código + Pílula de Tarefas + Pílula de Membros (+ Gestão) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                  Projeto
                </span>
                <h1 className="text-sm sm:text-base font-bold text-foreground truncate tracking-tight">
                  {stripProjectPrefix(project.name)}
                </h1>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameText(project.name || "");
                      setEditDescriptionText(project.description || "");
                      setIsEditingProject(true);
                    }}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    title="Editar nome e descrição do projeto"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
                {project.code && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/70 bg-muted/60 text-muted-foreground shrink-0">
                    {project.code}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-secondary/50 text-muted-foreground font-medium shrink-0">
                  {totalTasksCount} {totalTasksCount === 1 ? "tarefa" : "tarefas"}
                </span>
                <span
                  onClick={onOpenMembers}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-secondary/50 text-muted-foreground font-medium shrink-0 cursor-pointer hover:bg-secondary transition-colors"
                  title="Ver integrantes do projeto"
                >
                  {memberCount} {memberCount === 1 ? "membro" : "membros"}
                </span>
                {management?.name && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-secondary/30 text-muted-foreground font-medium shrink-0 hidden md:inline-flex items-center gap-1">
                    <Folder className="size-2.5 text-blue-400" />
                    <span>{management.name}</span>
                  </span>
                )}
              </div>

              {/* Linha 2: Descrição do Projeto com Ícone de Lápis para Edição */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <span className="truncate">
                  {project.description?.trim() || "Sem descrição definida para este projeto."}
                </span>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameText(project.name || "");
                      setEditDescriptionText(project.description || "");
                      setIsEditingProject(true);
                    }}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    title="Editar descrição do projeto"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
              </div>

              {/* Linha 3: Metadados (Data de Criação | Visibilidade | Status com Lápis | Entrega) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="size-3 text-muted-foreground/70" />
                  <span>Criado em {formattedCreatedDate}</span>
                </span>
                <span className="text-border shrink-0">|</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Shield className="size-3 text-muted-foreground/70" />
                  <span>
                    Visibilidade: {MANAGEMENT_VISIBILITY_LABELS[project.visibility || "company"] || project.visibility || "Empresa"}
                  </span>
                </span>
                <span className="text-border shrink-0">|</span>
                <span className="flex items-center gap-1 shrink-0">
                  <CircleDot className="size-3 text-muted-foreground/70" />
                  <span>Status: {currentStatusLabel}</span>
                  {canWrite && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground/60 hover:text-foreground transition-colors ml-0.5 cursor-pointer"
                          title="Alterar status do projeto"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                          Status do projeto
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {PROJECT_STATUS_OPTIONS.map((st) => {
                          const isSelected =
                            (project.status || "active").toLowerCase() === st.value;
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
                  )}
                </span>
                {project.dueDate && (
                  <>
                    <span className="text-border shrink-0">|</span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="size-3 text-muted-foreground/70" />
                      <span>Entrega: {formattedDueDate}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: KPIs Em Linha + Membros + Botão Toggle de Recolher */}
          <div className="flex items-center justify-between xl:justify-end gap-3 sm:gap-4 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-border/50">
            {/* 3 KPIs Compactos em Linha Horizontal */}
            <div className="flex items-center gap-4 sm:gap-5">
              {/* KPI 1: Tarefas */}
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <ListTodo className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Tarefas</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{totalTasksCount}</p>
                </div>
              </div>

              {/* KPI 2: Concluídas */}
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Concluídas</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{completedTasksCount}</p>
                </div>
              </div>

              {/* KPI 3: Pendentes */}
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <Clock className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Pendentes</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{pendingTasksCount}</p>
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-border/60 shrink-0 hidden sm:block" />

            {/* Membros do Projeto (Avatares Empilhados + Botão com Contagem) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {resolvedMembers.length > 0 && (
                <div className="flex -space-x-2 items-center mr-0.5">
                  {resolvedMembers.slice(0, 3).map((m, idx) => (
                    <div
                      key={m.userId || idx}
                      className="size-7 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[9px] font-bold text-foreground"
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
                title="Ver e gerenciar integrantes do projeto"
              >
                <Users className="size-3.5 text-muted-foreground/80" />
                <span className="font-semibold text-foreground text-xs">{memberCount}</span>
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
        </div>
      )}

      {/* Diálogo Rápido para Editar o Projeto (Nome e Descrição) */}
      <Dialog open={isEditingProject} onOpenChange={setIsEditingProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Editar projeto
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize o nome e o texto descritivo deste projeto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label htmlFor="edit-project-name" className="text-xs font-semibold text-foreground">
                Nome do projeto
              </label>
              <Input
                id="edit-project-name"
                value={editNameText}
                onChange={(e) => setEditNameText(e.target.value)}
                placeholder="Ex: Redesign da Interface"
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-project-desc" className="text-xs font-semibold text-foreground">
                Descrição e objetivos
              </label>
              <Textarea
                id="edit-project-desc"
                value={editDescriptionText}
                onChange={(e) => setEditDescriptionText(e.target.value)}
                placeholder="Descreva as metas, escopo e entregas deste projeto..."
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
              onClick={() => setIsEditingProject(false)}
              disabled={isSavingProject}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveProject()}
              disabled={isSavingProject}
              className="text-xs font-semibold gap-1.5"
            >
              {isSavingProject ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
