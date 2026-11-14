"use client";

import React from "react";
import { Users } from "lucide-react";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface MemberAvatarItem {
  userId?: string;
  name?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  email?: string | null;
}

export interface MemberAvatarProps {
  name?: string | null;
  src?: string | null;
  role?: string | null;
  email?: string | null;
  sizeClass?: string;
  className?: string;
  showTooltip?: boolean;
}

/**
 * Avatar individual com animação de zoom e Tooltip de nome completo ao passar o mouse.
 * Não navega e não abre modal ao ser clicado (cursor padrão).
 */
export function MemberAvatar({
  name,
  src,
  role,
  email,
  sizeClass = "size-7 text-[9px]",
  className,
  showTooltip = true,
}: MemberAvatarProps) {
  const avatarNode = (
    <div
      className={cn(
        "relative rounded-full border-2 border-card bg-muted overflow-hidden shadow-2xs flex items-center justify-center font-bold text-foreground select-none cursor-default transition-all duration-200 ease-out hover:scale-125 hover:z-30 hover:ring-2 hover:ring-primary/40",
        sizeClass,
        className
      )}
    >
      <MemberAvatarContent name={name} src={src} />
    </div>
  );

  if (!showTooltip) return avatarNode;

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{avatarNode}</TooltipTrigger>
      <TooltipContent side="top" className="text-xs py-1 px-2.5 shadow-md">
        <p className="font-semibold text-foreground">{name || "Membro da equipe"}</p>
        {role && <p className="text-[10px] text-muted-foreground capitalize">{role}</p>}
        {email && <p className="text-[10px] text-muted-foreground">{email}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export interface MemberAvatarGroupProps {
  members: MemberAvatarItem[];
  totalCount?: number;
  showCount?: boolean;
  isCompact?: boolean;
  className?: string;
}

/**
 * Grupo/stack de avatares com suporte a até 6 avatares (3 em cima e 3 em baixo se houver mais de 3).
 * Inclui animação ao passar o mouse, tooltip completo e contador opcional.
 */
export function MemberAvatarGroup({
  members,
  totalCount,
  showCount = true,
  isCompact = false,
  className,
}: MemberAvatarGroupProps) {
  const resolvedMembers = members ?? [];
  const resolvedCount = totalCount ?? resolvedMembers.length;
  const hasMoreThanThree = resolvedMembers.length > 3;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1.5 shrink-0", className)}>
        {resolvedMembers.length > 0 && (
          <div className="flex items-center">
            {hasMoreThanThree ? (
              /* Grid de 2 linhas: até 3 em cima e até 3 em baixo */
              <div className="flex flex-col gap-0.5">
                <div className="flex -space-x-1.5 items-center">
                  {resolvedMembers.slice(0, 3).map((m, idx) => (
                    <MemberAvatar
                      key={m.userId || `top-${idx}`}
                      name={m.name}
                      src={m.avatarUrl}
                      role={m.role}
                      email={m.email}
                      sizeClass="size-5 text-[8px]"
                    />
                  ))}
                </div>
                <div className="flex -space-x-1.5 items-center">
                  {resolvedMembers.slice(3, 6).map((m, idx) => (
                    <MemberAvatar
                      key={m.userId || `bot-${idx}`}
                      name={m.name}
                      src={m.avatarUrl}
                      role={m.role}
                      email={m.email}
                      sizeClass="size-5 text-[8px]"
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Linha única: até 3 integrantes */
              <div className="flex -space-x-2 items-center">
                {resolvedMembers.slice(0, 3).map((m, idx) => (
                  <MemberAvatar
                    key={m.userId || `single-${idx}`}
                    name={m.name}
                    src={m.avatarUrl}
                    role={m.role}
                    email={m.email}
                    sizeClass={isCompact ? "size-6 text-[8px]" : "size-7 text-[9px]"}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contagem de Integrantes (Não-clicável, puramente informativo) */}
        {showCount && (
          <div
            className="inline-flex items-center gap-1 text-xs text-muted-foreground px-1 py-0.5 rounded select-none shrink-0"
            title={`${resolvedCount} integrantes`}
          >
            <Users className="size-3.5 text-muted-foreground/80" />
            <span className="font-semibold text-foreground text-xs">{resolvedCount}</span>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
