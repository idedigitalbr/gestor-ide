"use client";

import React, { useMemo, useState } from "react";
import { Search, Shield, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MemberAvatarContent } from "@/components/member-avatar-content";

export interface TeamMemberItem {
  userId: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gestor",
  editor: "Editor",
  member: "Membro",
  viewer: "Leitor",
};

function formatMemberRole(role?: string | null): string {
  if (!role) return "Membro";
  const key = role.trim().toLowerCase();
  return ROLE_LABELS[key] || role;
}

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  members: TeamMemberItem[];
  loading?: boolean;
  error?: string | null;
  canManageMembers?: boolean;
}

export function MembersDialog({
  open,
  onOpenChange,
  title,
  description,
  members,
  loading = false,
  error = null,
  canManageMembers = false,
}: MembersDialogProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const name = (member.name ?? "").toLowerCase();
      const email = (member.email ?? "").toLowerCase();
      const role = formatMemberRole(member.role).toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [members, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-primary" />
            <span>{title}</span>
            <Badge variant="secondary" className="ml-1 text-[11px]">
              {members.length}
            </Badge>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por nome, email ou papel..."
              className="pl-8 h-8 text-xs"
            />
          </div>

          {error && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <ScrollArea className="max-h-72 pr-2">
            {loading ? (
              <p role="status" className="py-6 text-center text-xs text-muted-foreground">
                Carregando membros...
              </p>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                {members.length === 0
                  ? "Nenhum membro vinculado até o momento."
                  : "Nenhum membro corresponde ao filtro."}
              </div>
            ) : (
              <div className="divide-y divide-border rounded-lg border border-border bg-card">
                {filtered.map((member) => {
                  const displayName = member.name || member.email || member.userId;
                  return (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center text-[11px] font-semibold text-foreground shrink-0">
                          <MemberAvatarContent
                            name={displayName}
                            src={member.avatarUrl}
                            initialsLength={2}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {displayName}
                          </p>
                          {member.email && member.email !== displayName && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px] gap-1">
                        <Shield className="w-2.5 h-2.5 text-muted-foreground" />
                        <span>{formatMemberRole(member.role)}</span>
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <p className="text-[11px] text-muted-foreground">
            {canManageMembers
              ? "Os vínculos e papéis exibidos são sincronizados diretamente do IDE CRM."
              : "Visualização somente leitura conforme suas permissões no IDE CRM."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
