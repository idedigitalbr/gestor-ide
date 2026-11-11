import React from "react";
import type { TaskPriority, CanonicalTaskPriority } from "@/types/task";
import { normalizeTaskPriority } from "@/types/task";
import { cn } from "@/lib/utils";

interface PriorityIconProps {
  priority: TaskPriority | string;
  className?: string;
  showLabel?: boolean;
}

export const ALL_CANONICAL_PRIORITIES: CanonicalTaskPriority[] = [
  "Baixa",
  "Normal",
  "Alta",
  "Urgente",
];

export function getPriorityPillStyle(priority?: string | null): string {
  const norm = normalizeTaskPriority(priority);
  switch (norm) {
    case "Urgente":
      return "border-orange-500/40 bg-orange-950/30 text-orange-400";
    case "Alta":
      return "border-red-500/30 bg-red-950/30 text-red-400";
    case "Normal":
      return "border-blue-500/30 bg-blue-950/30 text-blue-400";
    case "Baixa":
    default:
      return "border-[#292c42] bg-[#161826] text-slate-300";
  }
}

export function PriorityIcon({
  priority,
  className,
  showLabel = false,
}: PriorityIconProps) {
  const norm = normalizeTaskPriority(priority);

  if (norm === "Urgente") {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5", className)}
        title="Prioridade Urgente"
      >
        <span className="w-3.5 h-3.5 rounded-xs bg-orange-500/20 border border-orange-500/40 text-orange-500 font-bold text-[10px] flex items-center justify-center leading-none">
          !
        </span>
        {showLabel && (
          <span className="text-xs font-semibold text-orange-400">Urgente</span>
        )}
      </span>
    );
  }

  const activeBars = norm === "Alta" ? 3 : norm === "Normal" ? 2 : 1;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`Prioridade ${norm}`}
    >
      <span className="inline-flex items-end gap-[1.5px] h-3.5 w-3.5">
        <span
          className={cn(
            "w-[2.5px] h-[4px] rounded-xs transition-colors",
            activeBars >= 1 ? "bg-foreground/80" : "bg-muted-foreground/30"
          )}
        />
        <span
          className={cn(
            "w-[2.5px] h-[7px] rounded-xs transition-colors",
            activeBars >= 2 ? "bg-foreground/80" : "bg-muted-foreground/30"
          )}
        />
        <span
          className={cn(
            "w-[2.5px] h-[10px] rounded-xs transition-colors",
            activeBars >= 3 ? "bg-foreground" : "bg-muted-foreground/30"
          )}
        />
      </span>
      {showLabel && (
        <span className="text-xs text-muted-foreground font-medium">
          {norm}
        </span>
      )}
    </span>
  );
}
