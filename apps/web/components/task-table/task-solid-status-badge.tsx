"use client";

import React from "react";
import type { TaskStatus, CanonicalTaskStatus } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { StatusDropdownContent, getStatusDefinition } from "../task-status-icon";
import { cn } from "@/lib/utils";

interface TaskSolidStatusBadgeProps {
  status: TaskStatus;
  onChangeStatus?: (nextStatus: TaskStatus) => void;
  className?: string;
  size?: "sm" | "md";
}

interface SolidStyle {
  label: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
}

const SOLID_STATUS_STYLES: Record<CanonicalTaskStatus, SolidStyle> = {
  CONCLUÍDO: {
    label: "CONCLUÍDO",
    bg: "bg-[#132a22]",
    border: "border-[#1e4a3b]",
    text: "text-[#6ee7b7]",
    dot: "bg-[#10b981]",
  },
  "FAZENDO AGORA": {
    label: "EM ANDAMENTO",
    bg: "bg-[#241b42]",
    border: "border-[#3e2e6e]",
    text: "text-[#d8b4fe]",
    dot: "bg-[#a855f7]",
  },
  PENDENTE: {
    label: "PENDENTE",
    bg: "bg-[#1c1e28]",
    border: "border-[#2b2e3e]",
    text: "text-[#9ca3af]",
    dot: "bg-[#6b7280]",
  },
  BLOQUEADO: {
    label: "BLOQUEADO",
    bg: "bg-[#2d1519]",
    border: "border-[#4d1f25]",
    text: "text-[#fca5a5]",
    dot: "bg-[#ef4444]",
  },
  "AGUARDANDO FEEDBACK": {
    label: "EM REVISÃO",
    bg: "bg-[#2d2012]",
    border: "border-[#4d371e]",
    text: "text-[#fcd34d]",
    dot: "bg-[#f59e0b]",
  },
};

export function TaskSolidStatusBadge({
  status,
  onChangeStatus,
  className,
  size = "md",
}: TaskSolidStatusBadgeProps) {
  const norm = normalizeTaskStatus(status);
  const def = getStatusDefinition(norm);
  const style = SOLID_STATUS_STYLES[norm] || {
    label: def.label,
    bg: "bg-[#1c1e28]",
    border: "border-[#2b2e3e]",
    text: "text-[#9ca3af]",
    dot: "bg-[#6b7280]",
  };

  const badgeContent = (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border transition-all select-none truncate font-semibold cursor-pointer hover:brightness-125",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
        style.bg,
        style.border,
        style.text,
        className
      )}
      title={`Status: ${def.label}`}
    >
      <span className={cn("rounded-full shrink-0", size === "sm" ? "w-1.5 h-1.5" : "w-1.5 h-1.5", style.dot)} />
      <span className="truncate tracking-wide">{style.label}</span>
    </div>
  );

  if (!onChangeStatus) {
    return badgeContent;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="focus:outline-none cursor-pointer">
          {badgeContent}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="p-0 bg-transparent border-none shadow-none z-50">
        <StatusDropdownContent
          currentStatus={status}
          onSelectStatus={(next) => onChangeStatus(next)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
