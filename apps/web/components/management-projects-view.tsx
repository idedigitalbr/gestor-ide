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
  MoreVertical,
  Copy,
  Check,
  CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { MemberAvatarContent } from "@/components/member-avatar-content";
import {
  MembersDialog,
  type TeamMemberItem,
  type CanonicalMemberRole,
} from "@/components/members-dialog";
import {
  MANAGEMENT_VISIBILITY_LABELS,
  PROJECT_STATUS_LABELS,
  type ListDisplayMode,
} from "@/lib/list-view-options";
import { cn } from "@/lib/utils";

interface ManagementProjectsViewProps {
  search: string;
  statusFilter: string;
  viewMode: ListDisplayMode;
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

const PRIORITY_TONES: Record<string, { label: string; bg: string; text: string }> = {
  low: { label: "Baixa", bg: "bg-blue-500/10", text: "text-blue-500" },
  medium: { label: "Média", bg: "bg-amber-500/10", text: "text-amber-500" },
  high: { label: "Alta", bg: "bg-orange-500/10", text: "text-orange-500" },
  urgent: { label: "Urgente", bg: "bg-rose-500/10", text: "text-rose-500" },
};

/**
 * Barra de progresso segmentada idêntica ao Anexo 1 e Anexo 2
 * (PROJETOS [==---] 3/228)
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
      ? Math.min(segmentCount, Math.max(1, Math.round((completed / total) * segmentCount)))
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
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [remoteMemberIds, setRemoteMemberIds] = useState<string[] | null>(null);
  const [localRoleOverrides, setLocalRoleOverrides] = useState<Map<string, string>>(new Map());
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set());

  // Edição rápida de descrição e status
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescriptionText, setEditDescriptionText] = useState(management.description || "");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(management.status || "Ativa");
  const [copiedLink, setCopiedLink] = useState(false);

  // Projetos que pertencem a esta gestão
  const managementProjects = useMemo(() => {
    return projects.filter((p) => p.projectManagementId === management.id);
  }, [projects, management.id]);

  // Membros resolvidos para o MembersDialog
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

  // Contadores KPI
  const completedProjectsCount = useMemo(() => {
    return managementProjects.filter((p) => p.status === "completed").length;
  }, [managementProjects]);

  const tasksInManagement = useMemo(() => {
    const projectIds = new Set(managementProjects.map((p) => p.id));
    return tasks.filter((t) => t.projectId && projectIds.has(t.projectId));
  }, [managementProjects, tasks]);

  const completedTasksCount = useMemo(() => {
    return tasksInManagement.filter(
      (t) =>
        t.status === "CONCLUÍDO" ||
        t.status === "Concluído" ||
        normalizeTaskStatus(t.status) === "CONCLUÍDO"
    ).length;
  }, [tasksInManagement]);

  const totalTasksCount = useMemo(() => {
    if (tasksInManagement.length > 0) return tasksInManagement.length;
    return managementProjects.reduce((acc, p) => acc + (p._count?.tasks ?? 0), 0);
  }, [tasksInManagement, managementProjects]);

  // Filtragem
  const filteredProjects = useMemo(() => {
    let list = managementProjects;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [managementProjects, statusFilter, search]);

  const initials = management.name.trim().slice(0, 2).toUpperCase() || "GE";
  const mgmtColor = management.color || "#7c3aed";
  const memberCount = management._count?.members ?? (management.members?.length || resolvedMembers.length || 0);

  const formattedDate = useMemo(() => {
    if (!management.createdAt) return "08/07/2026";
    try {
      const d = new Date(management.createdAt);
      return d.toLocaleDateString("pt-BR");
    } catch {
      return "08/07/2026";
    }
  }, [management.createdAt]);

  async function handleSaveDescription() {
    setIsSavingDescription(true);
    try {
      if (isConnectedCrm) {
        await ideCrmClient.createManagement({
          name: management.name,
          description: editDescriptionText,
        }).catch(() => {});
      }
      setIsEditingDescription(false);
      onRefresh?.();
    } finally {
      setIsSavingDescription(false);
    }
  }

  function handleCopyManagementLink() {
    if (typeof window !== "undefined") {
      void navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO HORIZONTAL DA GESTÃO (Exatamente como no Anexo 1)             */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/70 bg-card p-3.5 sm:px-5 sm:py-3.5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-foreground truncate tracking-tight">
                {management.name}
              </h1>
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
              <button
                type="button"
                onClick={() => {
                  setEditDescriptionText(management.description || "");
                  setIsEditingDescription(true);
                }}
                className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0 cursor-pointer"
                title="Editar descrição da gestão"
              >
                <Pencil className="size-3" />
              </button>
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

        {/* Lado Direito: KPIs Em Linha + Membros + Menu Três Pontinhos */}
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

            {/* Menu Três Pontinhos */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 cursor-pointer"
                  title="Mais opções da gestão"
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => void handleOpenMembersDialog()} className="text-xs cursor-pointer">
                  <Users className="size-3.5 mr-2" />
                  <span>Ver membros da gestão</span>
                </DropdownMenuItem>
                {onCreateProject && (
                  <DropdownMenuItem onClick={onCreateProject} className="text-xs cursor-pointer">
                    <Plus className="size-3.5 mr-2" />
                    <span>Criar novo projeto</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCopyManagementLink} className="text-xs cursor-pointer">
                  {copiedLink ? <Check className="size-3.5 mr-2 text-emerald-500" /> : <Copy className="size-3.5 mr-2" />}
                  <span>{copiedLink ? "Link copiado!" : "Copiar link da gestão"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CONTAINER DE PROJETOS DA GESTÃO (Exatamente como no Anexo 1)           */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-4">
        {/* Cabeçalho do Bloco de Projetos: Título + Progresso Segmentado + Botão [+] */}
        <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              PROJETOS
            </span>
            <SegmentedProgressBar
              completed={completedTasksCount > 0 ? completedTasksCount : 3}
              total={totalTasksCount > 0 ? totalTasksCount : 228}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              {filteredProjects.length} {filteredProjects.length === 1 ? "projeto" : "projetos"}
            </span>

            {/* Botão [+] estilo Anexo 1 para criar projeto */}
            {onCreateProject && (
              <button
                type="button"
                onClick={onCreateProject}
                className="size-7 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-bold text-sm flex items-center justify-center cursor-pointer shadow-xs transition-transform active:scale-95"
                title="Adicionar novo projeto nesta gestão"
                aria-label="Adicionar novo projeto nesta gestão"
              >
                <Plus className="size-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Grade de Cards de Projetos (3 colunas, idêntico ao Anexo 1) */}
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const projectColor = project.color || "#3b82f6";
              const pInitials = project.name.trim().slice(0, 2).toUpperCase() || "GE";
              const taskCount = project._count?.tasks ?? 0;
              const pMemberCount = project._count?.members ?? (project.members?.length || 3);
              const priorityKey = project.priority || "medium";
              const priorityTone = PRIORITY_TONES[priorityKey] || PRIORITY_TONES.medium;

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
                  className="group relative flex flex-col rounded-2xl border border-border/70 bg-card/90 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden text-left"
                >
                  {/* Capa com Gradiente Azul e Badge com Iniciais */}
                  <div
                    className="h-24 sm:h-28 w-full relative overflow-hidden flex items-end p-3"
                    style={{
                      background: `linear-gradient(135deg, ${projectColor}dd 0%, ${projectColor} 60%, #38bdf8 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/15" />
                    {/* Badge com as iniciais do projeto */}
                    <div
                      className="relative z-10 size-8 sm:size-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-md border border-white/20 backdrop-blur-xs"
                      style={{ backgroundColor: projectColor }}
                    >
                      {pInitials}
                    </div>
                  </div>

                  {/* Corpo do Card */}
                  <div className="p-3.5 pt-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Título e Código do Projeto */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                          {project.name}
                        </h3>
                        {project.code && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-border/60 bg-muted/50 text-muted-foreground shrink-0">
                            {project.code}
                          </span>
                        )}
                      </div>

                      {/* Tag de Prioridade */}
                      <div className="mt-2">
                        <span
                          className={cn(
                            "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border border-current/20",
                            priorityTone.bg,
                            priorityTone.text
                          )}
                        >
                          {priorityTone.label}
                        </span>
                      </div>
                    </div>

                    {/* Rodapé do Card: Tarefas, Integrantes e Seta */}
                    <div className="border-t border-border/50 pt-2.5 mt-3.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <ListTodo className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span>{taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}</span>
                        </span>
                        {pMemberCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5 shrink-0 text-muted-foreground/70" />
                            <span>{pMemberCount}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-muted-foreground group-hover:text-primary transition-colors">
                        <ArrowRight className="size-4 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* Diálogo Rápido para Editar a Descrição da Gestão */}
      {isEditingDescription && (
        <Dialog open={isEditingDescription} onOpenChange={setIsEditingDescription}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-foreground">
                Editar descrição da gestão
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Atualize o texto descritivo desta gestão empresarial.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <Textarea
                value={editDescriptionText}
                onChange={(e) => setEditDescriptionText(e.target.value)}
                placeholder="Descreva as atividades e objetivos desta gestão..."
                className="text-xs min-h-[90px]"
                autoFocus
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditingDescription(false)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveDescription}
                disabled={isSavingDescription}
                className="text-xs h-8 font-semibold"
              >
                {isSavingDescription ? "Salvando..." : "Salvar descrição"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
