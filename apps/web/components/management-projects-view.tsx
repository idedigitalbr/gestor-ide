"use client";

import React, { useMemo, useState } from "react";
import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import {
  Folder,
  CheckCircle2,
  ListTodo,
  Calendar,
  Users,
  Shield,
  ArrowLeft,
  ArrowRight,
  Plus,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FileText,
  Play,
  Clock,
  CircleDot,
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
import {
  MembersDialog,
  type TeamMemberItem,
  type CanonicalMemberRole,
} from "@/components/members-dialog";
import {
  MANAGEMENT_VISIBILITY_LABELS,
  stripManagementPrefix,
  stripProjectPrefix,
  type ListDisplayMode,
} from "@/lib/list-view-options";
import { cn } from "@/lib/utils";

interface ManagementProjectsViewProps {
  search: string;
  statusFilter: string;
  viewMode: ListDisplayMode;
  onViewModeChange?: (mode: ListDisplayMode) => void;
  cardColumns?: 4 | 5;
  onCardColumnsChange?: (cols: 4 | 5) => void;
  management: CrmProjectManagement;
  projects: CrmProject[];
  tasks: Task[];
  currentUserId?: string | null;
  isConnectedCrm?: boolean;
  canWrite?: boolean;
  canManageMembers?: boolean;
  onCreateProject?: () => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onSelectProject: (projectId: string) => void;
}

/**
 * Formata data no formato brasileiro idêntico ao Print 3 (ex: "sex (20/nov)")
 */
function formatProjectDate(dateString?: string | null): string {
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

/**
 * Badge de status idêntico ao Print 3 e à tabela de tarefas do projeto
 */
function ProjectStatusPill({ status }: { status?: string }) {
  const norm = (status || "").toLowerCase();
  if (norm === "completed" || norm === "concluida" || norm === "concluído") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold tracking-wide border border-emerald-500/20 select-none">
        <CheckCircle2 className="size-3.5" />
        <span>CONCLUÍDO</span>
      </div>
    );
  }
  if (norm === "active" || norm === "in_progress" || norm === "fazendo") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-[11px] font-semibold tracking-wide border border-blue-500/20 select-none">
        <Play className="size-3.5 fill-current" />
        <span>FAZENDO AGORA</span>
      </div>
    );
  }
  if (norm === "paused" || norm === "pausada" || norm === "feedback" || norm === "review") {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[11px] font-semibold tracking-wide border border-amber-500/20 select-none">
        <Clock className="size-3.5" />
        <span>AGUARDANDO FEEDBACK...</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-[11px] font-semibold tracking-wide border border-border/60 select-none">
      <CircleDot className="size-3.5" />
      <span>PENDENTE</span>
    </div>
  );
}

/**
 * Barra de progresso segmentada idêntica ao Print 3
 * ([==---] completed/total)
 */
function SegmentedProgressBar({
  completed,
  total,
  className,
}: {
  completed: number;
  total: number;
  className?: string;
}) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const isAllDone = completed === total && total > 0;
  const segmentCount = 6;
  const filledSegments =
    total > 0
      ? Math.min(segmentCount, Math.round((completed / total) * segmentCount))
      : 0;

  return (
    <div
      className={cn("inline-flex items-center gap-2 select-none", className)}
      title={`Concluído ${completed} de ${total} (${percent}%)`}
    >
      <div className="flex h-2.5 gap-0.5" aria-hidden="true">
        {Array.from({ length: segmentCount }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-full w-2.5 rounded-[2px] transition-colors",
              isAllDone
                ? "bg-primary"
                : index < filledSegments
                ? "bg-primary"
                : "bg-muted-foreground/25"
            )}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium text-muted-foreground font-mono">
        {completed}/{total}
      </span>
    </div>
  );
}

export function ManagementProjectsView({
  search,
  statusFilter,
  viewMode,
  cardColumns = 4,
  management,
  projects,
  tasks,
  currentUserId = null,
  isConnectedCrm = false,
  canWrite = true,
  canManageMembers = false,
  onCreateProject,
  onRefresh,
  onBack,
  onSelectProject,
}: ManagementProjectsViewProps) {
  // Controle de expansão/recolhimento do cabeçalho com persistência em localStorage
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem(`gestor_mgmt_header_expanded_${management.id}`);
      return saved !== null ? saved === "true" : false;
    } catch {
      return false;
    }
  });

  const toggleHeaderExpanded = () => {
    setIsHeaderExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`gestor_mgmt_header_expanded_${management.id}`, String(next));
      } catch {}
      return next;
    });
  };

  // Estados de membros
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [remoteMemberIds, setRemoteMemberIds] = useState<string[] | null>(null);
  const [localRoleOverrides, setLocalRoleOverrides] = useState<Map<string, string>>(new Map());
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set());

  // Edição rápida de gestão (nome e descrição) e status
  const [isEditingManagement, setIsEditingManagement] = useState(false);
  const [editNameText, setEditNameText] = useState(management.name || "");
  const [editDescriptionText, setEditDescriptionText] = useState(management.description || "");
  const [isSavingManagement, setIsSavingManagement] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>("Ativa");

  // Projetos que pertencem a esta gestão
  const managementProjects = useMemo(() => {
    return projects.filter((p) => p.projectManagementId === management.id);
  }, [projects, management.id]);

  // Contagem de tarefas e progresso específico por projeto (SEM DADOS FALSOS)
  const projectTaskStats = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const p of managementProjects) {
      const projTasks = tasks.filter((t) => t.projectId === p.id);
      let total = projTasks.length;
      let completed = projTasks.filter((t) => normalizeTaskStatus(t.status) === "CONCLUÍDO").length;

      // Fallback para contagem do CRM se tarefas ainda não foram carregadas individualmente
      if (total === 0 && (p._count?.tasks ?? 0) > 0) {
        total = p._count?.tasks ?? 0;
        completed = p.status === "completed" ? total : 0;
      }
      map.set(p.id, { total, completed });
    }
    return map;
  }, [managementProjects, tasks]);

  // Filtragem local conforme pesquisa e status
  const filteredProjects = useMemo(() => {
    return managementProjects.filter((project) => {
      const matchesSearch =
        search === "" ||
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        (project.description && project.description.toLowerCase().includes(search.toLowerCase())) ||
        (project.code && project.code.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ||
        project.status === statusFilter ||
        (statusFilter === "active" && (!project.status || project.status === "active"));

      return matchesSearch && matchesStatus;
    });
  }, [managementProjects, search, statusFilter]);

  // Resolução unificada de integrantes com mutações locais
  const resolvedMembers = useMemo<TeamMemberItem[]>(() => {
    const byId = new Map<string, TeamMemberItem>();
    for (const m of management.members ?? []) {
      const uid = m.userId || m.user?.id;
      if (!uid || removedUserIds.has(uid)) continue;
      byId.set(uid, {
        userId: uid,
        name: m.user?.name,
        email: m.user?.email,
        avatarUrl: m.user?.avatarUrl,
        role: localRoleOverrides.get(uid) ?? m.role,
      });
    }
    for (const proj of managementProjects) {
      for (const m of proj.members ?? []) {
        const uid = m.userId || m.user?.id;
        if (!uid || removedUserIds.has(uid)) continue;
        const existing = byId.get(uid);
        const assignedRole = localRoleOverrides.get(uid) ?? m.role;
        if (!existing) {
          byId.set(uid, {
            userId: uid,
            name: m.user?.name,
            email: m.user?.email,
            avatarUrl: m.user?.avatarUrl,
            role: assignedRole,
          });
        } else if (!existing.name && m.user?.name) {
          byId.set(uid, {
            ...existing,
            name: m.user.name,
            email: existing.email ?? m.user.email,
            avatarUrl: existing.avatarUrl ?? m.user.avatarUrl,
            role: assignedRole,
          });
        }
      }
    }
    for (const uid of remoteMemberIds ?? []) {
      if (removedUserIds.has(uid)) continue;
      if (!byId.has(uid)) {
        byId.set(uid, {
          userId: uid,
          role: localRoleOverrides.get(uid) ?? "editor",
        });
      }
    }
    return Array.from(byId.values());
  }, [management.members, managementProjects, remoteMemberIds, removedUserIds, localRoleOverrides]);

  async function handleOpenMembersDialog() {
    setMembersDialogOpen(true);
    setMembersError(null);
    if (!isConnectedCrm) return;
    setLoadingMembers(true);
    try {
      const res = await ideCrmClient.listManagementMembers(management.id);
      setRemoteMemberIds((res.members ?? []).map((m) => m.userId).filter(Boolean));
    } catch (err) {
      setMembersError(
        err instanceof Error ? err.message : "Não foi possível atualizar a lista de membros."
      );
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleChangeMemberRole(member: TeamMemberItem, newRole: CanonicalMemberRole) {
    if (!isConnectedCrm) {
      setLocalRoleOverrides((prev) => new Map(prev).set(member.userId, newRole));
      return;
    }
    try {
      await ideCrmClient.updateManagementMemberRole(management.id, member.userId, newRole);
      setLocalRoleOverrides((prev) => new Map(prev).set(member.userId, newRole));
      onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar papel do integrante.";
      setMembersError(msg);
      throw err;
    }
  }

  async function handleRemoveMember(member: TeamMemberItem) {
    if (!isConnectedCrm) {
      setRemovedUserIds((prev) => new Set([...prev, member.userId]));
      return;
    }
    try {
      await ideCrmClient.removeManagementMember(management.id, member.userId);
      setRemovedUserIds((prev) => new Set([...prev, member.userId]));
      onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao remover integrante.";
      setMembersError(msg);
      throw err;
    }
  }

  async function handleAddMember(data: { emailOrId: string; role: CanonicalMemberRole }) {
    if (!isConnectedCrm) {
      setRemoteMemberIds((prev) => [...(prev ?? []), data.emailOrId]);
      setLocalRoleOverrides((prev) => new Map(prev).set(data.emailOrId, data.role));
      return;
    }
    try {
      await ideCrmClient.addManagementMember(management.id, {
        email: data.emailOrId.includes("@") ? data.emailOrId : undefined,
        userId: !data.emailOrId.includes("@") ? data.emailOrId : undefined,
        role: data.role,
      });
      await handleOpenMembersDialog();
      onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao adicionar integrante.";
      setMembersError(msg);
      throw err;
    }
  }

  // Contadores KPI REAIS (sem mocks)
  const completedProjectsCount = useMemo(() => {
    return managementProjects.filter((p) => p.status === "completed").length;
  }, [managementProjects]);

  const totalTasksCount = useMemo(() => {
    const projectIds = new Set(managementProjects.map((p) => p.id));
    const tasksInMgmt = tasks.filter((t) => t.projectId && projectIds.has(t.projectId));
    if (tasksInMgmt.length > 0) return tasksInMgmt.length;
    return managementProjects.reduce((acc, p) => acc + (p._count?.tasks ?? 0), 0);
  }, [managementProjects, tasks]);

  const completedTasksCount = useMemo(() => {
    const projectIds = new Set(managementProjects.map((p) => p.id));
    return tasks.filter(
      (t) => t.projectId && projectIds.has(t.projectId) && normalizeTaskStatus(t.status) === "CONCLUÍDO"
    ).length;
  }, [managementProjects, tasks]);

  const initials = management.name.trim().slice(0, 2).toUpperCase() || "GE";
  const mgmtColor = management.color || "var(--primary)";
  const memberCount = resolvedMembers.length || management.members?.length || 1;

  const formattedDate = useMemo(() => {
    if (!management.createdAt) return "08/07/2026";
    try {
      const d = new Date(management.createdAt);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return "08/07/2026";
    }
  }, [management.createdAt]);

  async function handleSaveManagement() {
    setIsSavingManagement(true);
    try {
      if (isConnectedCrm) {
        await ideCrmClient.updateManagement(management.id, {
          name: editNameText.trim() || management.name,
          description: editDescriptionText.trim(),
        });
        onRefresh?.();
      }
      setIsEditingManagement(false);
    } catch (err) {
      console.error("Erro ao salvar gestão:", err);
    } finally {
      setIsSavingManagement(false);
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO DA GESTÃO: MODO RETRAÍDO (PRINT 3) OU EXPANDIDO (ANEXO 1)     */}
      {/* ========================================================================= */}
      {!isHeaderExpanded ? (
        /* Cabeçalho Retraído Minimalista - EXATAMENTE IGUAL AO PRINT 3 */
        <div className="rounded-2xl border border-border/80 bg-card p-2 sm:px-4 sm:py-2.5 shadow-xs flex items-center justify-between gap-3 transition-all">
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
                  title="Voltar para todas as gestões"
                >
                  <ArrowLeft className="size-3.5" />
                  <span>Gestões</span>
                </Button>
                <div className="h-4 w-px bg-border/60 shrink-0" />
              </>
            )}

            <div
              className="size-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: mgmtColor }}
            >
              {initials}
            </div>

            <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
              Gestão
            </span>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate tracking-tight">
              {stripManagementPrefix(management.name)}
            </span>
          </div>

          {/* Direita: Mini KPIs + Avatar + Integrantes + Botão Chevron Down */}
          <div className="flex items-center gap-3 shrink-0">
            {/* 3 KPIs: Projetos, Concluídos, Tarefas */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-muted-foreground" title="Projetos">
                <Folder className="size-3.5 text-blue-400" />
                <span className="font-semibold text-foreground text-xs">{managementProjects.length}</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground" title="Concluídos">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span className="font-semibold text-foreground text-xs">{completedProjectsCount}</span>
              </span>
              <span className="flex items-center gap-1 text-muted-foreground" title="Tarefas">
                <ListTodo className="size-3.5 text-purple-400" />
                <span className="font-semibold text-foreground text-xs">{totalTasksCount}</span>
              </span>
            </div>

            {/* Avatar do Membro */}
            {management.members && management.members.length > 0 && (
              <div className="flex -space-x-1.5 items-center">
                {management.members.slice(0, 1).map((m, idx) => (
                  <div
                    key={m.userId || idx}
                    className="size-6 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[8px] font-bold text-foreground"
                    title={m.user?.name || "Membro"}
                  >
                    <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                  </div>
                ))}
              </div>
            )}

            {/* Contagem de Integrantes com Ícone de Usuários */}
            <button
              type="button"
              onClick={() => void handleOpenMembersDialog()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Ver e gerenciar integrantes da gestão"
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
        /* Cabeçalho Expandido (Pixel-Perfect Anexo 1 com Toggle Chevron Up no canto direito) */
        <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:px-5 sm:py-3.5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition-all">
          {/* Lado Esquerdo: Voltar + Avatar GE + Título, Descrição e Metadados */}
          <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
            {onBack && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                  title="Voltar para todas as gestões"
                >
                  <ArrowLeft className="size-3.5" />
                  <span className="hidden sm:inline">Gestões</span>
                </Button>
                <div className="h-5 w-px bg-border/60 shrink-0" />
              </div>
            )}

            {/* Badge Quadrado com Iniciais da Gestão */}
            <div
              className="size-10 sm:size-11 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-xs shrink-0"
              style={{ backgroundColor: mgmtColor }}
            >
              {initials}
            </div>

            {/* Bloco Central de Textos da Gestão */}
            <div className="min-w-0 flex-1 space-y-0.5">
              {/* Linha 1: Título + Código + Pílula de Projetos + Pílula de Membros */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                  Gestão
                </span>
                <h1 className="text-sm sm:text-base font-bold text-foreground truncate tracking-tight">
                  {stripManagementPrefix(management.name)}
                </h1>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameText(management.name || "");
                      setEditDescriptionText(management.description || "");
                      setIsEditingManagement(true);
                    }}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    title="Editar nome e descrição da gestão"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
                {management.code && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border/70 bg-muted/60 text-muted-foreground shrink-0">
                    {management.code}
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-secondary/50 text-muted-foreground font-medium shrink-0">
                  {managementProjects.length} {managementProjects.length === 1 ? "projeto" : "projetos"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border/70 bg-secondary/50 text-muted-foreground font-medium shrink-0">
                  {memberCount} {memberCount === 1 ? "membro" : "membros"}
                </span>
              </div>

              {/* Linha 2: Descrição da Gestão com Ícone de Lápis para Edição */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <span className="truncate">
                  {management.description?.trim() || "Gestão das atividades relacionadas à plataforma StudUPlay."}
                </span>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditNameText(management.name || "");
                      setEditDescriptionText(management.description || "");
                      setIsEditingManagement(true);
                    }}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 cursor-pointer"
                    title="Editar descrição da gestão"
                  >
                    <Pencil className="size-3" />
                  </button>
                )}
              </div>

              {/* Linha 3: Metadados (Data de Criação | Visibilidade | Status com Lápis) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-0.5">
                <span className="flex items-center gap-1 shrink-0">
                  <Calendar className="size-3 text-muted-foreground/70" />
                  <span>Criada em {formattedDate}</span>
                </span>
                <span className="text-border shrink-0">|</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Shield className="size-3 text-muted-foreground/70" />
                  <span>
                    Visibilidade: {MANAGEMENT_VISIBILITY_LABELS[management.visibility || "company"] || management.visibility || "Empresa"}
                  </span>
                </span>
                <span className="text-border shrink-0">|</span>
                <span className="flex items-center gap-1 shrink-0">
                  <Folder className="size-3 text-muted-foreground/70" />
                  <span>Status: {currentStatus}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="text-muted-foreground/60 hover:text-foreground transition-colors ml-0.5 cursor-pointer"
                        title="Alterar status da gestão"
                      >
                        <Pencil className="size-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-36">
                      <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                        Status da gestão
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {["Ativa", "Pausada", "Concluída", "Arquivada"].map((st) => (
                        <DropdownMenuItem
                          key={st}
                          onClick={() => setCurrentStatus(st)}
                          className={cn("text-xs cursor-pointer", currentStatus === st && "font-bold text-primary")}
                        >
                          {st}
                          {currentStatus === st && <Check className="size-3 ml-auto text-primary" />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </span>
              </div>
            </div>
          </div>

          {/* Lado Direito: KPIs Em Linha + Membros + Botão Toggle de Recolher */}
          <div className="flex items-center justify-between xl:justify-end gap-3 sm:gap-4 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-border/50">
            {/* 3 KPIs Compactos em Linha Horizontal */}
            <div className="flex items-center gap-4 sm:gap-5">
              {/* KPI 1: Projetos */}
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <Folder className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Projetos</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{managementProjects.length}</p>
                </div>
              </div>

              {/* KPI 2: Concluídos */}
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Concluídos</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{completedProjectsCount}</p>
                </div>
              </div>

              {/* KPI 3: Tarefas */}
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <ListTodo className="size-4" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground leading-tight">Tarefas</p>
                  <p className="text-sm font-bold text-foreground leading-tight">{totalTasksCount}</p>
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-border/60 shrink-0 hidden sm:block" />

            {/* Membros da Gestão (Avatares Empilhados + Botão com Contagem) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {management.members && management.members.length > 0 && (
                <div className="flex -space-x-2 items-center mr-0.5">
                  {management.members.slice(0, 3).map((m, idx) => (
                    <div
                      key={m.userId || idx}
                      className="size-7 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[9px] font-bold text-foreground"
                      title={m.user?.name || "Membro"}
                    >
                      <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleOpenMembersDialog()}
                className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/60"
                title="Ver e gerenciar integrantes da gestão"
              >
                <Users className="size-3.5" />
                <span className="font-semibold">{memberCount}</span>
              </Button>

              {/* Botão Toggle Chevron Up para Recolher */}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONTAINER DE PROJETOS DA GESTÃO: EXATAMENTE IGUAL AO PRINT 3           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center bg-card/40">
            <Folder className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-60" />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Nenhum projeto encontrado nesta gestão
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Nenhum projeto corresponde aos filtros aplicados ou ainda não há projetos cadastrados.
            </p>
            {onCreateProject && (
              <Button onClick={onCreateProject} size="sm" className="gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" />
                Criar primeiro projeto
              </Button>
            )}
          </div>
        ) : viewMode === "list" ? (
          /* ========================================================================= */
          /* MODO LISTA: CABEÇALHO UNIFICADO COM COLUNAS + LINHAS (EXATO PRINT 3)      */
          /* ========================================================================= */
          <div className="space-y-2">
            {/* Linha Única de Cabeçalho das Colunas: PROJETOS [progresso] | STATUS | DATA | RESPONSÁVEL | [+] */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 select-none">
              {/* Coluna 1: PROJETOS + Progresso Real dos Projetos da Gestão */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PROJETOS
                </span>
                <SegmentedProgressBar
                  completed={completedProjectsCount}
                  total={managementProjects.length}
                />
              </div>

              {/* Colunas Direitas: STATUS | DATA | RESPONSÁVEL | [+] */}
              <div className="flex items-center shrink-0">
                <div className="w-36 sm:w-44 text-center px-2 border-l border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  STATUS
                </div>
                <div className="hidden sm:block w-32 text-center px-2 border-l border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  DATA
                </div>
                <div className="hidden sm:block w-28 text-center px-2 border-l border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  RESPONSÁVEL
                </div>
                <div className="w-10 flex justify-end pl-2">
                  {onCreateProject && (
                    <button
                      type="button"
                      onClick={onCreateProject}
                      className="size-7 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs transition-transform active:scale-95 shrink-0"
                      title="Adicionar novo projeto"
                      aria-label="Adicionar novo projeto"
                    >
                      <Plus className="size-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Linhas dos Projetos formatadas como na tabela de tarefas do Print 3 */}
            {filteredProjects.map((project) => {
              const projectColor = project.color || "var(--primary)";
              const stats = projectTaskStats.get(project.id) || { total: 0, completed: 0 };
              const projMembers = project.members ?? [];

              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectProject(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectProject(project.id);
                    }
                  }}
                  className="group relative flex items-center justify-between p-2.5 sm:px-4 sm:py-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-xs"
                >
                  {/* Faixa Fina Colorida na Lateral Esquerda do Bloco (3.5px) */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-2xl z-20 pointer-events-none"
                    style={{ backgroundColor: projectColor }}
                  />

                  {/* Lado Esquerdo: Chevron > + Ícone Documento + Nome do Projeto + Progresso Segmentado */}
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 pl-1 sm:pl-2">
                    <div className="size-6 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                      <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>

                    <FileText className="size-4 text-muted-foreground/80 shrink-0" />

                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                        Projeto
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {stripProjectPrefix(project.name)}
                      </span>
                    </div>

                    {/* Progresso Segmentado específico deste projeto */}
                    <SegmentedProgressBar
                      completed={stats.completed}
                      total={stats.total}
                      className="hidden md:inline-flex ml-2"
                    />
                  </div>

                  {/* Lado Direito: Status + Data + Responsável + Seta */}
                  <div className="flex items-center shrink-0">
                    <div className="w-36 sm:w-44 flex justify-center px-2">
                      <ProjectStatusPill status={project.status} />
                    </div>

                    <div className="hidden sm:flex w-32 items-center justify-center gap-1.5 text-xs text-muted-foreground px-2">
                      <Calendar className="size-3.5 text-muted-foreground/70 shrink-0" />
                      <span>{formatProjectDate(project.createdAt || project.updatedAt)}</span>
                    </div>

                    <div className="hidden sm:flex w-28 items-center justify-center px-2">
                      {projMembers.length > 0 ? (
                        <div className="flex -space-x-1.5 items-center">
                          {projMembers.slice(0, 2).map((m, idx) => (
                            <div
                              key={m.userId || idx}
                              className="size-7 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[9px] font-bold text-foreground ring-1 ring-border"
                              title={m.user?.name || "Membro"}
                            >
                              <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                            </div>
                          ))}
                          {projMembers.length > 2 && (
                            <span className="text-[10px] text-muted-foreground font-mono pl-1">
                              +{projMembers.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </div>

                    <div className="w-10 flex justify-end pl-2 text-muted-foreground group-hover:text-primary transition-colors pr-1">
                      <ArrowRight className="size-4 transform group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Botão + Novo item no rodapé da tabela (idêntico ao Print 3) */}
            {onCreateProject && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-muted/40 transition-colors font-medium"
                >
                  <Plus className="size-3.5" />
                  <span>Novo item</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* MODO CARDS: CABEÇALHO LIMPO + CARDS COMPACTOS EM 4 A 5 COLUNAS            */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* Cabeçalho Limpo: PROJETOS [progresso real] na esquerda e [+] na direita */}
            <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  PROJETOS
                </span>
                <SegmentedProgressBar
                  completed={completedProjectsCount}
                  total={managementProjects.length}
                />
              </div>

              {onCreateProject && (
                <button
                  type="button"
                  onClick={onCreateProject}
                  className="size-7 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs transition-transform active:scale-95 shrink-0"
                  title="Adicionar novo projeto"
                  aria-label="Adicionar novo projeto"
                >
                  <Plus className="size-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Grade de Cards Compactos */}
            <div
              className={cn(
                "grid gap-3.5",
                cardColumns === 5
                  ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {filteredProjects.map((project) => {
                const projectColor = project.color || "var(--primary)";
                const displayProjectName = stripProjectPrefix(project.name);
                const pInitials = project.name.trim().slice(0, 2).toUpperCase() || "PR";
                const stats = projectTaskStats.get(project.id) || { total: 0, completed: 0 };
                const taskCount = stats.total || project._count?.tasks || 0;
                const projMembers = project.members ?? [];
                const pMemberCount = project._count?.members ?? (projMembers.length || 0);
                const bgColor = projectColor;

                return (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectProject(project.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectProject(project.id);
                      }
                    }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xs transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {/* Banner Superior com Cor ou Imagem */}
                    <div
                      className="relative h-24 w-full p-3 flex items-start justify-between"
                      style={
                        project.coverPath
                          ? {
                              backgroundImage: `url("${encodeURI(project.coverPath)}")`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : {
                              background: `linear-gradient(135deg, ${bgColor}ee 0%, ${bgColor}99 100%)`,
                            }
                      }
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

                      {/* Monograma flutuante na base do banner */}
                      <div className="absolute -bottom-3 left-3 z-10">
                        <div
                          className="w-8 h-8 rounded-lg border-2 border-card flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform group-hover:scale-105"
                          style={{ backgroundColor: bgColor }}
                        >
                          {pInitials}
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo do Card */}
                    <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                            Projeto
                          </span>
                          <h3 className="font-semibold text-xs md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {displayProjectName}
                          </h3>
                        </div>
                        {project.description?.trim() && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                            {project.description.trim()}
                          </p>
                        )}
                      </div>

                      {/* Rodapé do Card */}
                      <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1">
                            <ListTodo className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                            </span>
                          </span>
                          {pMemberCount > 0 && (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>{pMemberCount}</span>
                              {projMembers && projMembers.length > 0 && (
                                <div className="flex -space-x-1.5 items-center ml-1">
                                  {projMembers.slice(0, 3).map((m, idx) => (
                                    <div
                                      key={m.userId || idx}
                                      className="w-5 h-5 rounded-full border-1.5 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[8px] font-bold text-foreground"
                                      title={m.user?.name || "Membro"}
                                    >
                                      <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                                    </div>
                                  ))}
                                  {pMemberCount > 3 && (
                                    <div className="w-5 h-5 rounded-full border-1.5 border-card bg-secondary text-secondary-foreground text-[8px] font-bold flex items-center justify-center shadow-2xs">
                                      +{pMemberCount - 3}
                                    </div>
                                  )}
                                </div>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="text-muted-foreground group-hover:text-primary transition-colors">
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de Membros Completo (com troca de papel, remoção e sair) */}
      <MembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        title={`Membros de ${management.name}`}
        description="Pessoas liberadas no funil operacional desta gestão."
        members={resolvedMembers}
        loading={loadingMembers}
        error={membersError}
        canManageMembers={canManageMembers}
        currentUserId={currentUserId}
        entityType="management"
        onChangeRole={handleChangeMemberRole}
        onRemoveMember={handleRemoveMember}
        onAddMember={handleAddMember}
        onSelfLeave={onBack}
      />

      {/* Diálogo Rápido para Editar a Gestão (Nome e Descrição) */}
      <Dialog open={isEditingManagement} onOpenChange={setIsEditingManagement}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Editar gestão
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize o nome e o texto descritivo desta gestão empresarial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label htmlFor="edit-mgmt-name" className="text-xs font-semibold text-foreground">
                Nome da gestão
              </label>
              <Input
                id="edit-mgmt-name"
                value={editNameText}
                onChange={(e) => setEditNameText(e.target.value)}
                placeholder="Ex: Gestão Operacional"
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-mgmt-desc" className="text-xs font-semibold text-foreground">
                Descrição e objetivos
              </label>
              <Textarea
                id="edit-mgmt-desc"
                value={editDescriptionText}
                onChange={(e) => setEditDescriptionText(e.target.value)}
                placeholder="Descreva as atividades e objetivos desta gestão..."
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
              onClick={() => setIsEditingManagement(false)}
              disabled={isSavingManagement}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveManagement()}
              disabled={isSavingManagement}
              className="text-xs font-semibold gap-1.5"
            >
              {isSavingManagement ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
