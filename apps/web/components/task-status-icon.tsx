"use client";

import React from "react";
import type { TaskStatus, CanonicalTaskStatus } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";
import { Check, Play, Hourglass, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export type StatusCategory = "Não iniciado" | "Ativo" | "Fechado";

export interface StatusDefinition {
  id: CanonicalTaskStatus;
  label: string;
  category: StatusCategory;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const STATUS_DEFINITIONS: Record<CanonicalTaskStatus, StatusDefinition> = {
  PENDENTE: {
    id: "PENDENTE",
    label: "PENDENTE",
    category: "Não iniciado",
    emoji: "🔘",
    color: "#94a3b8",
    bgColor: "bg-slate-500/15",
    borderColor: "border-slate-500/30",
    textColor: "text-slate-600 dark:text-slate-300",
  },
  "FAZENDO AGORA": {
    id: "FAZENDO AGORA",
    label: "FAZENDO AGORA",
    category: "Ativo",
    emoji: "▶️",
    color: "#3b82f6",
    bgColor: "bg-blue-500/15",
    borderColor: "border-blue-500/35",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  "AGUARDANDO FEEDBACK": {
    id: "AGUARDANDO FEEDBACK",
    label: "AGUARDANDO FEEDBACK",
    category: "Ativo",
    emoji: "⏳",
    color: "#f97316",
    bgColor: "bg-orange-500/15",
    borderColor: "border-orange-500/35",
    textColor: "text-orange-600 dark:text-orange-400",
  },
  BLOQUEADO: {
    id: "BLOQUEADO",
    label: "BLOQUEADO",
    category: "Ativo",
    emoji: "🚫",
    color: "#ef4444",
    bgColor: "bg-red-500/15",
    borderColor: "border-red-500/35",
    textColor: "text-red-600 dark:text-red-400",
  },
  CONCLUÍDO: {
    id: "CONCLUÍDO",
    label: "CONCLUÍDO",
    category: "Fechado",
    emoji: "✅",
    color: "#10b981",
    bgColor: "bg-emerald-500/15",
    borderColor: "border-emerald-500/35",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
};

export const STATUS_CATEGORIES: {
  category: StatusCategory;
  statuses: CanonicalTaskStatus[];
}[] = [
  {
    category: "Não iniciado",
    statuses: ["PENDENTE"],
  },
  {
    category: "Ativo",
    statuses: ["FAZENDO AGORA", "AGUARDANDO FEEDBACK", "BLOQUEADO"],
  },
  {
    category: "Fechado",
    statuses: ["CONCLUÍDO"],
  },
];

export const ALL_CANONICAL_STATUSES: CanonicalTaskStatus[] = [
  "PENDENTE",
  "FAZENDO AGORA",
  "AGUARDANDO FEEDBACK",
  "BLOQUEADO",
  "CONCLUÍDO",
];

export function getStatusDefinition(status?: string | null): StatusDefinition {
  const norm = normalizeTaskStatus(status);
  return STATUS_DEFINITIONS[norm] ?? STATUS_DEFINITIONS.PENDENTE;
}

interface StatusIconProps {
  status: TaskStatus | string;
  className?: string;
  variant?: "circle" | "emoji";
}

/**
 * Ícone único e integrado de Status:
 * O símbolo fica centralizado DENTRO do círculo colorido correspondente,
 * eliminando a duplicidade de dois ícones lado a lado.
 */
export function StatusIcon({
  status,
  className,
  variant = "circle",
}: StatusIconProps) {
  const norm = normalizeTaskStatus(status);
  const def = STATUS_DEFINITIONS[norm] ?? STATUS_DEFINITIONS.PENDENTE;

  if (variant === "emoji") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center shrink-0 leading-none select-none text-[13px]",
          className
        )}
        aria-hidden="true"
      >
        {def.emoji}
      </span>
    );
  }

  // Círculo único com o símbolo/ícone integrado por dentro
  switch (norm) {
    case "PENDENTE":
      return (
        <span
          className={cn(
            "w-[18px] h-[18px] shrink-0 rounded-full border border-dashed border-slate-400/80 bg-slate-500/10 flex items-center justify-center select-none",
            className
          )}
          title="PENDENTE"
          aria-hidden="true"
        >
          <span className="w-1 h-1 rounded-full bg-slate-400/70" />
        </span>
      );

    case "FAZENDO AGORA":
      return (
        <span
          className={cn(
            "w-[18px] h-[18px] shrink-0 rounded-full border-[1.5px] border-blue-500 bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 select-none shadow-[0_0_6px_rgba(59,130,246,0.3)]",
            className
          )}
          title="FAZENDO AGORA"
          aria-hidden="true"
        >
          <Play className="w-2 h-2 fill-current text-current translate-x-[0.5px]" />
        </span>
      );

    case "AGUARDANDO FEEDBACK":
      return (
        <span
          className={cn(
            "w-[18px] h-[18px] shrink-0 rounded-full border-[1.5px] border-orange-500 bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 select-none shadow-[0_0_6px_rgba(249,115,22,0.3)]",
            className
          )}
          title="AGUARDANDO FEEDBACK"
          aria-hidden="true"
        >
          <Hourglass className="w-2.5 h-2.5 stroke-[2.2]" />
        </span>
      );

    case "BLOQUEADO":
      return (
        <span
          className={cn(
            "w-[18px] h-[18px] shrink-0 rounded-full border-[1.5px] border-red-500 bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 select-none shadow-[0_0_6px_rgba(239,68,68,0.3)]",
            className
          )}
          title="BLOQUEADO"
          aria-hidden="true"
        >
          <Ban className="w-2.5 h-2.5 stroke-[2.5]" />
        </span>
      );

    case "CONCLUÍDO":
      return (
        <span
          className={cn(
            "w-[18px] h-[18px] shrink-0 rounded-full border-[1.5px] border-emerald-500 bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 select-none shadow-[0_0_6px_rgba(16,185,129,0.3)]",
            className
          )}
          title="CONCLUÍDO"
          aria-hidden="true"
        >
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      );

    default:
      return (
        <span
          className={cn(
            "w-[18px] h-[18px] shrink-0 rounded-full border border-dashed border-slate-400/80 bg-slate-500/10 flex items-center justify-center select-none",
            className
          )}
          aria-hidden="true"
        >
          <span className="w-1 h-1 rounded-full bg-slate-400/70" />
        </span>
      );
  }
}

interface StatusBadgeProps {
  status: TaskStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const def = getStatusDefinition(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors",
        def.bgColor,
        def.borderColor,
        def.textColor,
        className
      )}
      style={{
        boxShadow: `0 0 8px ${def.color}15`,
      }}
    >
      <StatusIcon status={status} className="w-3.5 h-3.5" />
      <span className="tracking-wide">{def.label}</span>
    </span>
  );
}

interface StatusDropdownContentProps {
  currentStatus: TaskStatus | string;
  onSelectStatus: (status: CanonicalTaskStatus) => void;
  className?: string;
}

/**
 * Dropdown de Status idêntico ao Anexo 2 com ícone circular integrado único por item:
 * - Não iniciado (PENDENTE)
 * - Ativo (FAZENDO AGORA, AGUARDANDO FEEDBACK, BLOQUEADO)
 * - Fechado (CONCLUÍDO)
 */
export function StatusDropdownContent({
  currentStatus,
  onSelectStatus,
  className,
}: StatusDropdownContentProps) {
  const activeNormalized = normalizeTaskStatus(currentStatus);

  return (
    <div
      className={cn(
        "py-1 text-popover-foreground bg-popover border border-border rounded-xl shadow-xl min-w-[210px]",
        className
      )}
    >
      {STATUS_CATEGORIES.map((cat, idx) => (
        <div key={cat.category}>
          {idx > 0 && <DropdownMenuSeparator className="my-1" />}
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {cat.category}
          </div>
          <div className="space-y-0.5 px-1 pb-1">
            {cat.statuses.map((st) => {
              const def = STATUS_DEFINITIONS[st];
              const isSelected = activeNormalized === st;

              return (
                <DropdownMenuItem
                  key={st}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStatus(st);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors outline-none",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "text-popover-foreground/80 hover:bg-accent/60 hover:text-accent-foreground"
                  )}
                >
                  <span className="flex items-center gap-2 truncate">
                    <StatusIcon status={st} className="w-4 h-4 shrink-0" />
                    <span className="truncate tracking-wide">{def.label}</span>
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
