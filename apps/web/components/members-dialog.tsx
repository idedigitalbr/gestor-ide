"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  LogOut,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { cn } from "@/lib/utils";

export interface TeamMemberItem {
  userId: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

export type CanonicalMemberRole = "manager" | "editor" | "viewer";

export interface RoleDefinition {
  key: CanonicalMemberRole;
  label: string;
  description: string;
  pillClass: string;
  cardBorderClass: string;
  ringClass: string;
}

export const ROLE_DEFINITIONS: Record<CanonicalMemberRole, RoleDefinition> = {
  manager: {
    key: "manager",
    label: "RESPONSÁVEL",
    description: "Acesso total de edição e gestão de integrantes",
    pillClass:
      "border-amber-300/80 dark:border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300",
    cardBorderClass:
      "border-amber-300/50 dark:border-amber-500/40 hover:border-amber-400 dark:hover:border-amber-500",
    ringClass: "ring-2 ring-amber-400 dark:ring-amber-500",
  },
  editor: {
    key: "editor",
    label: "EDITOR",
    description: "Criação e edição de tarefas e visualizações",
    pillClass:
      "border-orange-300/80 dark:border-orange-500/60 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-300",
    cardBorderClass:
      "border-orange-300/50 dark:border-orange-500/40 hover:border-orange-400 dark:hover:border-orange-500",
    ringClass: "ring-2 ring-orange-400 dark:ring-orange-500",
  },
  viewer: {
    key: "viewer",
    label: "MEMBRO (LEITURA)",
    description: "Visualização das tarefas sem permissão de alteração",
    pillClass:
      "border-blue-300/80 dark:border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300",
    cardBorderClass:
      "border-blue-300/50 dark:border-blue-500/40 hover:border-blue-400 dark:hover:border-blue-500",
    ringClass: "ring-2 ring-blue-400 dark:ring-blue-500",
  },
};

export const AVAILABLE_ROLES: RoleDefinition[] = [
  ROLE_DEFINITIONS.viewer,
  ROLE_DEFINITIONS.editor,
  ROLE_DEFINITIONS.manager,
];

export function normalizeMemberRole(role?: string | null): CanonicalMemberRole {
  if (!role) return "editor";
  const r = role.trim().toLowerCase();
  if (
    r === "owner" ||
    r === "admin" ||
    r === "manager" ||
    r.includes("responsa")
  ) {
    return "manager";
  }
  if (
    r === "viewer" ||
    r === "reader" ||
    r.includes("leitur") ||
    r.includes("leitor")
  ) {
    return "viewer";
  }
  return "editor";
}

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  members: TeamMemberItem[];
  availableUsers?: TeamMemberItem[];
  loading?: boolean;
  error?: string | null;
  canManageMembers?: boolean;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  entityType?: "management" | "project";
  onChangeRole?: (
    member: TeamMemberItem,
    newRole: CanonicalMemberRole
  ) => Promise<boolean | void>;
  onRemoveMember?: (member: TeamMemberItem) => Promise<boolean | void>;
  onAddMember?: (data: {
    emailOrId: string;
    role: CanonicalMemberRole;
    user?: TeamMemberItem;
  }) => Promise<boolean | void>;
  onSelfLeave?: () => void;
}

export function MembersDialog({
  open,
  onOpenChange,
  title,
  description,
  members,
  availableUsers = [],
  loading = false,
  error = null,
  canManageMembers = false,
  currentUserId = null,
  currentUserEmail = null,
  entityType = "project",
  onChangeRole,
  onRemoveMember,
  onAddMember,
  onSelfLeave,
}: MembersDialogProps) {
  const [search, setSearch] = useState("");
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<TeamMemberItem | null>(null);
  const [newMemberRole, setNewMemberRole] =
    useState<CanonicalMemberRole>("editor");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [activeUpdatingUserId, setActiveUpdatingUserId] = useState<
    string | null
  >(null);
  const [activeRemovingUserId, setActiveRemovingUserId] = useState<
    string | null
  >(null);
  const [memberToConfirmRemove, setMemberToConfirmRemove] =
    useState<TeamMemberItem | null>(null);

  const entityLabel = entityType === "project" ? "o projeto" : "a gestão";
  const defaultSubtitle =
    entityType === "project"
      ? "Pessoas liberadas no funil operacional deste projeto."
      : "Pessoas liberadas no funil operacional desta gestão.";

  const enrichedMembers = useMemo(() => {
    return members.map((m) => {
      if (m.name && m.email && m.avatarUrl) return m;
      const found = availableUsers.find((u) => u.userId === m.userId);
      if (!found) return m;
      return {
        ...m,
        name: m.name || found.name,
        email: m.email || found.email,
        avatarUrl: m.avatarUrl || found.avatarUrl,
      };
    });
  }, [members, availableUsers]);

  const candidateUsers = useMemo(() => {
    const existingIds = new Set(enrichedMembers.map((m) => m.userId).filter(Boolean));
    const existingEmails = new Set(
      enrichedMembers
        .map((m) => m.email?.toLowerCase())
        .filter(Boolean) as string[]
    );
    return availableUsers.filter(
      (u) =>
        (!u.userId || !existingIds.has(u.userId)) &&
        (!u.email || !existingEmails.has(u.email.toLowerCase()))
    );
  }, [availableUsers, enrichedMembers]);

  const suggestions = useMemo(() => {
    const q = newMemberEmail.trim().toLowerCase();
    if (!q) {
      return candidateUsers.slice(0, 6);
    }
    return candidateUsers.filter((u) => {
      const name = (u.name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const id = (u.userId ?? "").toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q);
    });
  }, [candidateUsers, newMemberEmail]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrichedMembers;
    return enrichedMembers.filter((member) => {
      const name = (member.name ?? "").toLowerCase();
      const email = (member.email ?? "").toLowerCase();
      const roleDef = ROLE_DEFINITIONS[normalizeMemberRole(member.role)];
      const roleLabel = roleDef.label.toLowerCase();
      return name.includes(q) || email.includes(q) || roleLabel.includes(q);
    });
  }, [enrichedMembers, search]);

  async function handleAddMemberSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!onAddMember) return;

    let targetUser = selectedUser;
    const rawInput = newMemberEmail.trim();

    if (!targetUser && rawInput) {
      const q = rawInput.toLowerCase();
      targetUser =
        candidateUsers.find(
          (u) =>
            u.userId.toLowerCase() === q ||
            (u.email && u.email.toLowerCase() === q) ||
            (u.name && u.name.toLowerCase() === q)
        ) ||
        candidateUsers.find(
          (u) =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q))
        ) ||
        availableUsers.find(
          (u) =>
            (u.name && u.name.toLowerCase().includes(q)) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            u.userId.toLowerCase() === q
        ) ||
        null;
    }

    if (!targetUser && !rawInput) {
      setAddError("Selecione um integrante ou digite o e-mail.");
      return;
    }

    const emailOrId = targetUser?.email || targetUser?.userId || rawInput;
    const isEmail = emailOrId.includes("@");

    if (!targetUser && !isEmail) {
      setAddError(
        `Nenhum integrante encontrado com "${rawInput}". Digite o e-mail completo (ex: usuario@suporteide.digital) ou selecione um integrante sugerido.`
      );
      return;
    }

    setIsSubmittingAdd(true);
    setAddError(null);
    try {
      await onAddMember({
        emailOrId,
        role: newMemberRole,
        user: targetUser ?? undefined,
      });
      setNewMemberEmail("");
      setSelectedUser(null);
      setIsAddingMember(false);
    } catch (err) {
      setAddError(
        err instanceof Error
          ? err.message
          : "Não foi possível adicionar o integrante."
      );
    } finally {
      setIsSubmittingAdd(false);
    }
  }

  async function handleRoleChange(
    member: TeamMemberItem,
    newRole: CanonicalMemberRole
  ) {
    if (!onChangeRole) return;
    setActiveUpdatingUserId(member.userId);
    try {
      await onChangeRole(member, newRole);
    } finally {
      setActiveUpdatingUserId(null);
    }
  }

  async function handleConfirmRemove() {
    if (!memberToConfirmRemove || !onRemoveMember) return;
    const isSelf = memberToConfirmRemove.userId === currentUserId;
    setActiveRemovingUserId(memberToConfirmRemove.userId);
    try {
      await onRemoveMember(memberToConfirmRemove);
      setMemberToConfirmRemove(null);
      if (isSelf) {
        onOpenChange(false);
        onSelfLeave?.();
      }
    } finally {
      setActiveRemovingUserId(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[85vh] flex flex-col p-5 gap-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                <Users className="w-4 h-4 text-primary" />
                <span>{title}</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {description || defaultSubtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Barra de Ações: Contador de Integrantes + Botão Adicionar + Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {members.length}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                INTEGRANTES
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <div className="relative min-w-0 flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filtrar integrantes..."
                  className="pl-8 h-8 text-xs bg-muted/40 border-border"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>

              {canManageMembers && onAddMember && (
                <Button
                  type="button"
                  size="sm"
                  variant={isAddingMember ? "secondary" : "outline"}
                  onClick={() => {
                    setIsAddingMember((prev) => {
                      if (prev) {
                        setSelectedUser(null);
                        setNewMemberEmail("");
                      }
                      return !prev;
                    });
                    setAddError(null);
                  }}
                  className="h-8 text-xs font-semibold gap-1 px-3 border-border cursor-pointer shrink-0"
                >
                  <Plus className="size-3.5" />
                  <span>ADICIONAR</span>
                </Button>
              )}
            </div>
          </div>

          {/* Formulário Inline de Adicionar Integrante */}
          {isAddingMember && (
            <form
              onSubmit={handleAddMemberSubmit}
              className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Adicionar integrante {entityLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingMember(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                {selectedUser ? (
                  <div className="flex items-center gap-2 p-1.5 px-2.5 rounded-lg border border-primary/40 bg-primary/10 text-xs flex-1 h-8">
                    <div className="size-5 rounded-full overflow-hidden bg-muted flex items-center justify-center text-[8px] font-bold shrink-0">
                      <MemberAvatarContent name={selectedUser.name} src={selectedUser.avatarUrl} />
                    </div>
                    <span className="font-semibold text-foreground truncate">{selectedUser.name || "Usuário"}</span>
                    {selectedUser.email && (
                      <span className="text-muted-foreground text-[11px] truncate">({selectedUser.email})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setNewMemberEmail("");
                      }}
                      className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <Input
                    value={newMemberEmail}
                    onChange={(e) => {
                      setNewMemberEmail(e.target.value);
                      if (addError) setAddError(null);
                    }}
                    placeholder="Buscar por nome ou digitar e-mail..."
                    className="h-8 text-xs flex-1 bg-background"
                    autoFocus
                  />
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center justify-between gap-1.5 px-3 h-8 rounded-md text-xs font-semibold border cursor-pointer shrink-0",
                        ROLE_DEFINITIONS[newMemberRole].pillClass
                      )}
                    >
                      <span>{ROLE_DEFINITIONS[newMemberRole].label}</span>
                      <ChevronDown className="size-3 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                      Papel do novo integrante
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {AVAILABLE_ROLES.map((r) => (
                      <DropdownMenuItem
                        key={r.key}
                        onClick={() => setNewMemberRole(r.key)}
                        className="text-xs flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-semibold">{r.label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.description}
                          </div>
                        </div>
                        {newMemberRole === r.key && (
                          <Check className="size-3.5 text-primary ml-2 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingAdd || (!selectedUser && !newMemberEmail.trim())}
                  className="h-8 text-xs font-semibold shrink-0 cursor-pointer"
                >
                  {isSubmittingAdd ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </div>

              {/* Sugestões da equipe ao digitar ou vazias */}
              {!selectedUser && (
                <>
                  {newMemberEmail.trim() ? (
                    suggestions.length > 0 && (
                      <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-sm space-y-0.5">
                        <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          Integrantes sugeridos
                        </div>
                        {suggestions.map((u) => (
                          <div
                            key={u.userId}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedUser(u);
                              setNewMemberEmail(u.name || u.email || "");
                              setAddError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setSelectedUser(u);
                                setNewMemberEmail(u.name || u.email || "");
                                setAddError(null);
                              }
                            }}
                            className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-md hover:bg-accent cursor-pointer text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="size-6 rounded-full overflow-hidden bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">
                                <MemberAvatarContent name={u.name} src={u.avatarUrl} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground truncate">
                                  {u.name || "Sem nome"}
                                </div>
                                {u.email && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {u.email}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-primary hover:underline shrink-0">
                              Selecionar
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    suggestions.length > 0 && (
                      <div className="space-y-1.5 pt-0.5">
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                          Integrantes da empresa:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {suggestions.map((u) => (
                            <button
                              key={u.userId}
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setNewMemberEmail(u.name || u.email || "");
                                setAddError(null);
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-card hover:bg-accent border border-border text-[11px] text-foreground cursor-pointer transition-colors shadow-2xs"
                            >
                              <div className="size-4 rounded-full overflow-hidden bg-muted flex items-center justify-center text-[7px] font-bold shrink-0">
                                <MemberAvatarContent name={u.name} src={u.avatarUrl} />
                              </div>
                              <span className="font-medium">{u.name || u.email}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </>
              )}

              {addError && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <span>{addError}</span>
                </p>
              )}
            </form>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grade de Cards de Membros (Exatamente como na imagem de referência) */}
          <ScrollArea className="flex-1 pr-1.5 max-h-[50vh]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-xs">Carregando integrantes...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                {members.length === 0
                  ? `Nenhum integrante vinculado a est${entityType === "project" ? "e projeto" : "a gestão"}.`
                  : "Nenhum integrante corresponde ao filtro digitado."}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-0.5">
                {filtered.map((member) => {
                  const displayName =
                    member.name || member.email || member.userId;
                  const canonicalRole = normalizeMemberRole(member.role);
                  const roleDef = ROLE_DEFINITIONS[canonicalRole];
                  const isCurrentUser = Boolean(
                    (currentUserId && member.userId === currentUserId) ||
                    (currentUserEmail && member.email && member.email.toLowerCase() === currentUserEmail.toLowerCase())
                  );
                  const isUpdating = activeUpdatingUserId === member.userId;
                  const isRemoving = activeRemovingUserId === member.userId;

                  return (
                    <div
                      key={member.userId}
                      className={cn(
                        "relative flex items-center justify-between gap-2.5 p-3 rounded-xl border bg-card text-card-foreground shadow-2xs transition-all",
                        roleDef.cardBorderClass
                      )}
                    >
                      {/* Lado Esquerdo: Avatar em Anel Colorido + Nome e Email */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "size-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-foreground bg-muted shadow-2xs",
                            roleDef.ringClass
                          )}
                        >
                          <MemberAvatarContent
                            name={displayName}
                            src={member.avatarUrl}
                            initialsLength={2}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p
                              className="text-xs font-bold text-foreground truncate"
                              title={displayName}
                            >
                              {displayName}
                            </p>
                            {isCurrentUser && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] px-1 py-0 h-3.5 text-muted-foreground font-normal shrink-0"
                              >
                                Você
                              </Badge>
                            )}
                          </div>
                          {member.email && (
                            <p
                              className="text-[10px] text-muted-foreground truncate"
                              title={member.email}
                            >
                              {member.email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Lado Direito: Seletor de Papel Estilizado + Botão Remover/Sair */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {canManageMembers && onChangeRole ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                disabled={isUpdating}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-colors cursor-pointer select-none",
                                  roleDef.pillClass
                                )}
                                title="Alterar permissão"
                              >
                                {isUpdating ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <>
                                    <span>{roleDef.label}</span>
                                    <ChevronDown className="size-3 opacity-70" />
                                  </>
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground">
                                Papel do integrante
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {AVAILABLE_ROLES.map((r) => (
                                <DropdownMenuItem
                                  key={r.key}
                                  onClick={() => handleRoleChange(member, r.key)}
                                  className={cn(
                                    "text-xs flex items-center justify-between cursor-pointer",
                                    canonicalRole === r.key &&
                                      "font-bold text-primary"
                                  )}
                                >
                                  <div>
                                    <div className="font-semibold">
                                      {r.label}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {r.description}
                                    </div>
                                  </div>
                                  {canonicalRole === r.key && (
                                    <Check className="size-3.5 text-primary ml-2 shrink-0" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border select-none",
                              roleDef.pillClass
                            )}
                          >
                            {roleDef.label}
                          </span>
                        )}

                        {/* Botão de Remover integrante OU Sair se for o usuário atual */}
                        {(canManageMembers || isCurrentUser) &&
                          onRemoveMember && (
                            <button
                              type="button"
                              disabled={isRemoving}
                              onClick={() => setMemberToConfirmRemove(member)}
                              className={cn(
                                "size-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer shrink-0",
                                isCurrentUser &&
                                  "text-amber-500/80 hover:text-amber-600 hover:bg-amber-500/10"
                              )}
                              title={
                                isCurrentUser
                                  ? `Sair d${entityLabel}`
                                  : `Remover d${entityLabel}`
                              }
                              aria-label={
                                isCurrentUser
                                  ? `Sair d${entityLabel}`
                                  : `Remover d${entityLabel}`
                              }
                            >
                              {isRemoving ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="sm:justify-between items-center pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              {canManageMembers
                ? `Você pode alterar permissões e gerenciar integrantes d${entityLabel}.`
                : "Visualização somente leitura conforme suas permissões no IDE CRM."}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Remover Integrante ou Sair */}
      {memberToConfirmRemove && (
        <Dialog
          open={Boolean(memberToConfirmRemove)}
          onOpenChange={(open) => {
            if (!open) setMemberToConfirmRemove(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                {memberToConfirmRemove.userId === currentUserId ? (
                  <>
                    <LogOut className="size-4 text-amber-500" />
                    <span>Deseja sair d{entityLabel}?</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4 text-destructive" />
                    <span>Remover integrante?</span>
                  </>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground pt-1.5">
                {memberToConfirmRemove.userId === currentUserId ? (
                  <>
                    Você perderá o acesso imediato a est
                    {entityType === "project" ? "e projeto" : "a gestão"} e
                    às suas tarefas até ser adicionado novamente por um
                    responsável.
                  </>
                ) : (
                  <>
                    Deseja realmente remover{" "}
                    <strong>
                      {memberToConfirmRemove.name ||
                        memberToConfirmRemove.email ||
                        "este integrante"}
                    </strong>{" "}
                    d{entityLabel}?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMemberToConfirmRemove(null)}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmRemove}
                disabled={Boolean(activeRemovingUserId)}
                className="text-xs h-8 font-semibold"
              >
                {activeRemovingUserId ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : memberToConfirmRemove.userId === currentUserId ? (
                  "Confirmar e Sair"
                ) : (
                  "Remover integrante"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
