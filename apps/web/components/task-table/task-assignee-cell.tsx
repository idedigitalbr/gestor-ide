"use client";

import React from "react";
import { User, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface TaskAssigneeCellProps {
  assignee?: string | null;
  assigneeAvatar?: string | null;
  onUpdateAssignee: (assignee?: string, assigneeAvatar?: string) => void;
  className?: string;
}

interface TeamMember {
  name: string;
  avatarUrl: string;
  initials: string;
  color: string;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: "Will",
    avatarUrl: "/avatars/will.png",
    initials: "W",
    color: "bg-blue-600",
  },
  {
    name: "Edmundo",
    avatarUrl: "/avatars/user-composer.png",
    initials: "E",
    color: "bg-purple-600",
  },
  {
    name: "Aline",
    avatarUrl: "/avatars/claudelle.png",
    initials: "A",
    color: "bg-pink-600",
  },
  {
    name: "Hesron",
    avatarUrl: "/avatars/rafael.png",
    initials: "H",
    color: "bg-amber-600",
  },
];

export function TaskAssigneeCell({
  assignee,
  assigneeAvatar,
  onUpdateAssignee,
  className,
}: TaskAssigneeCellProps) {
  const currentMember = TEAM_MEMBERS.find(
    (m) => m.name.toLowerCase() === (assignee ?? "").toLowerCase()
  );

  return (
    <div className={cn("inline-flex items-center select-none", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {assignee ? (
            <button
              type="button"
              className="h-[25px] rounded-full border border-[#252838] bg-[#12141f] pl-1 pr-2.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[#d6d9ea] hover:border-[#3b82f6] hover:text-white transition-colors cursor-pointer max-w-full"
              title={`Responsável: ${assignee}`}
            >
              <img
                src={assigneeAvatar || currentMember?.avatarUrl || "/avatars/will.png"}
                alt={assignee}
                className="w-4 h-4 rounded-full object-cover shrink-0"
                onError={(e) => {
                  // Fallback se a imagem não carregar
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <span className="truncate max-w-[85px]">{assignee}</span>
            </button>
          ) : (
            <button
              type="button"
              className="opacity-40 hover:opacity-100 h-[25px] rounded-full border border-dashed border-[#2b2e40] px-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-white hover:border-[#3b82f6] transition-opacity cursor-pointer"
              title="Atribuir responsável"
            >
              <User className="w-3 h-3 text-muted-foreground/60" />
              <span>+ Atribuir</span>
            </button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-44 bg-[#141624] border-[#252838] text-white p-1 z-50 shadow-xl"
        >
          <DropdownMenuLabel className="text-[11px] text-muted-foreground font-semibold px-2 py-1">
            Responsável
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#202334]" />

          {TEAM_MEMBERS.map((member) => {
            const isSelected =
              assignee?.toLowerCase() === member.name.toLowerCase();
            return (
              <DropdownMenuItem
                key={member.name}
                onClick={() =>
                  onUpdateAssignee(member.name, member.avatarUrl)
                }
                className={cn(
                  "flex items-center justify-between text-xs px-2 py-1.5 rounded-md cursor-pointer hover:bg-[#1f2238] transition-colors",
                  isSelected && "bg-[#1f2238] text-white font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                  <span>{member.name}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#3b82f6]" />}
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator className="bg-[#202334]" />
          <DropdownMenuItem
            onClick={() => onUpdateAssignee(undefined, undefined)}
            className="text-xs text-muted-foreground hover:text-destructive px-2 py-1.5 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 mr-2" />
            <span>Sem responsável</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
