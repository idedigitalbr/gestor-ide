"use client";

import type { CrmProjectMember } from "@gestor-ide/core";
import { Check, User } from "lucide-react";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TaskAssigneeCellProps {
  assignee?: string | null;
  assigneeId?: string | null;
  assigneeAvatar?: string | null;
  members: CrmProjectMember[];
  membersLoaded: boolean;
  onUpdateAssignee: (assignee?: string, assigneeAvatar?: string, assigneeId?: string) => void;
  className?: string;
}

export function TaskAssigneeCell({ assignee, assigneeId, assigneeAvatar, members, membersLoaded, onUpdateAssignee, className }: TaskAssigneeCellProps) {
  const selectedMember = members.find((member) => assigneeId ? member.userId === assigneeId : (member.user.name || member.user.email) === assignee);
  const label = assignee || selectedMember?.user.name || selectedMember?.user.email;

  return (
    <div className={cn("inline-flex items-center select-none", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-xs font-medium text-foreground hover:scale-110 hover:ring-2 hover:ring-primary transition-all duration-200" title={label ? `Responsável: ${label}` : "Atribuir responsável"} aria-label={label ? `Responsável: ${label}` : "Atribuir responsável"}>
            {label ? <MemberAvatarContent name={label} src={assigneeAvatar || selectedMember?.user.avatarUrl} initialsLength={1} /> : <User className="h-4 w-4 text-muted-foreground" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" collisionPadding={8} className="w-48 max-w-[calc(100vw-1rem)] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto">
          <DropdownMenuLabel>Responsável</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {!membersLoaded ? <div className="px-2 py-2 text-xs text-muted-foreground">Carregando membros...</div> : members.length === 0 ? <div className="px-2 py-2 text-xs text-muted-foreground">Nenhum membro disponível</div> : members.map((member) => {
            const name = member.user.name || member.user.email;
            return (
              <DropdownMenuItem key={member.userId} onSelect={() => onUpdateAssignee(name, member.user.avatarUrl || undefined, member.userId)} className="gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px]"><MemberAvatarContent name={name} src={member.user.avatarUrl} initialsLength={1} /></span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                {selectedMember?.userId === member.userId && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onUpdateAssignee()}><User className="mr-2 h-4 w-4" />Sem responsável</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
