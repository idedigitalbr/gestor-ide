"use client";

import React, { useRef, useState } from "react";
import {
  Folder,
  ListTodo,
  Users,
  ArrowRight,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  LogOut,
  Check,
} from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import {
  EntityEditExpandedModal,
  type EntityEditData,
} from "@/components/entity-edit-expanded-modal";
import {
  stripManagementPrefix,
  stripProjectPrefix,
} from "@/lib/list-view-options";

export interface EntityCardProps {
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
  projectCount?: number;
  taskCount?: number;
  memberCount?: number;
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
  onSelect: () => void;
  canWrite?: boolean;
  canManageMembers?: boolean;
  currentUserId?: string | null;
  onUpdate?: (updates: {
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

export function EntityCard({
  type,
  id,
  name,
  description,
  code,
  color,
  coverPath,
  status,
  visibility,
  createdAt,
  dueDate,
  priority,
  projectCount = 0,
  taskCount = 0,
  memberCount = 0,
  members = [],
  onSelect,
  canWrite = true,
  canManageMembers = true,
  currentUserId,
  onUpdate,
  onDelete,
  onLeave,
  onManageMembers,
}: EntityCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const isProject = type === "project";
  const displayName = isProject ? stripProjectPrefix(name) : stripManagementPrefix(name);
  const initials = name.trim().slice(0, 2).toUpperCase() || (isProject ? "PR" : "GE");
  const bgColor = color || "var(--primary)";

  const effectiveMemberCount = memberCount || members.length || 0;

  function handleOpenEdit(e: React.MouseEvent) {
    e.stopPropagation();
    if (cardRef.current) {
      setOriginRect(cardRef.current.getBoundingClientRect());
    }
    setIsEditing(true);
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      if (isProject) {
        url.searchParams.set("projectId", id);
      } else {
        url.searchParams.set("managementId", id);
      }
      await navigator.clipboard.writeText(url.toString());
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // Fallback
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  }

  const editData: EntityEditData = {
    type,
    id,
    name,
    description,
    code,
    color,
    coverPath,
    status,
    visibility,
    createdAt,
    dueDate,
    priority,
    members,
  };

  return (
    <>
      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 hover:border-primary/40 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Banner Superior com Cor ou Imagem */}
        <div
          className="relative h-24 w-full p-2.5 sm:p-3 flex items-start justify-between"
          style={
            coverPath
              ? {
                  backgroundImage: `url("${encodeURI(coverPath)}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : {
                  background: `linear-gradient(135deg, ${bgColor}ee 0%, ${bgColor}99 100%)`,
                }
          }
        >
          {/* Overlay suave para legibilidade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

          {/* Monograma flutuante na base do banner */}
          <div className="absolute -bottom-3 left-3 z-10">
            <div
              className="w-8 h-8 rounded-lg border-2 border-card flex items-center justify-center text-xs font-bold text-white shadow-md transition-transform group-hover:scale-105"
              style={{ backgroundColor: bgColor }}
            >
              {initials}
            </div>
          </div>

          {/* Feedback de Link Copiado */}
          {copiedShare && (
            <div className="relative z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-semibold shadow-xs animate-in fade-in zoom-in-95 duration-150">
              <Check className="size-3" />
              <span>Copiado!</span>
            </div>
          )}

          {/* Menu de Ações (Três Pontinhos) no Canto Superior Direito */}
          <div
            className="ml-auto relative z-20"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-7 rounded-md bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-xs transition-colors flex items-center justify-center border border-white/10 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
                  title="Mais ações"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canWrite && (
                  <DropdownMenuItem onClick={handleOpenEdit} className="gap-2 cursor-pointer">
                    <Pencil className="size-3.5" />
                    <span>Editar</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={handleShare} className="gap-2 cursor-pointer">
                  <Share2 className="size-3.5" />
                  <span>Compartilhar</span>
                </DropdownMenuItem>

                {(onDelete || onLeave) && <DropdownMenuSeparator />}

                {onDelete && canWrite && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteOpen(true);
                    }}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Excluir {isProject ? "projeto" : "gestão"}</span>
                  </DropdownMenuItem>
                )}

                {onLeave && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmLeaveOpen(true);
                    }}
                    className="gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    <span>{isProject ? "Sair do projeto" : "Sair da gestão"}</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Conteúdo do Card */}
        <div className="p-3.5 pt-5 flex-1 flex flex-col justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                {isProject ? "Projeto" : "Gestão"}
              </span>
              <h3 className="font-semibold text-xs md:text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {displayName}
              </h3>
            </div>
            {description?.trim() && (
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                {description.trim()}
              </p>
            )}
          </div>

          {/* Rodapé do Card */}
          <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2.5">
              {isProject ? (
                <span className="flex items-center gap-1">
                  <ListTodo className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {taskCount} {taskCount === 1 ? "tarefa" : "tarefas"}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Folder className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {projectCount} {projectCount === 1 ? "projeto" : "projetos"}
                  </span>
                </span>
              )}

              {effectiveMemberCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>{effectiveMemberCount}</span>
                  {members && members.length > 0 && (
                    <div className="flex -space-x-1.5 items-center ml-1">
                      {members.slice(0, 3).map((m, idx) => (
                        <div
                          key={m.userId || idx}
                          className="w-5 h-5 rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center text-[8px] font-bold text-foreground"
                          title={m.user?.name || "Membro"}
                        >
                          <MemberAvatarContent name={m.user?.name} src={m.user?.avatarUrl} />
                        </div>
                      ))}
                      {effectiveMemberCount > 3 && (
                        <div className="w-5 h-5 rounded-full border-2 border-card bg-secondary text-secondary-foreground text-[8px] font-bold flex items-center justify-center shadow-2xs">
                          +{effectiveMemberCount - 3}
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

      {/* Modal de Edição Expandido a partir do Card */}
      {isEditing && (
        <EntityEditExpandedModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          entity={editData}
          originRect={originRect}
          canWrite={canWrite}
          canManageMembers={canManageMembers}
          currentUserId={currentUserId}
          onSave={async (updates) => {
            if (onUpdate) await onUpdate(updates);
          }}
          onDelete={onDelete}
          onLeave={onLeave}
          onManageMembers={onManageMembers}
        />
      )}

      {/* Diálogo de Confirmação para Excluir no Card */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir {isProject ? "projeto" : "gestão"}
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &ldquo;{name}&rdquo;? Esta ação removerá todos os dados vinculados e não poderá ser desfeita.
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
              }}
            >
              Sim, excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação para Sair no Card */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isProject ? "Sair do projeto" : "Sair da gestão"}
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deixar de participar de &ldquo;{name}&rdquo;? Você perderá o acesso direto a este painel.
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
              }}
            >
              Sim, sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
