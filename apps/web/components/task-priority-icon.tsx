import React from "react";
import type { TaskPriority } from "@/types/task";
import { cn } from "@/lib/utils";

interface PriorityIconProps {
  priority: TaskPriority;
  className?: string;
  showLabel?: boolean;
}

export function PriorityIcon({ priority, className, showLabel = false }: PriorityIconProps) {
  if (priority === "Urgente") {
    return (
      <span
        className={cn("inline-flex items-center gap-1.5", className)}
        title="Prioridade Urgente"
      >
        <span className="w-3.5 h-3.5 rounded-xs bg-orange-500/20 border border-orange-500/40 text-orange-500 font-bold text-[10px] flex items-center justify-center leading-none">
          !
        </span>
        {showLabel && <span className="text-xs font-semibold text-orange-500">Urgente</span>}
      </span>
    );
  }

  const activeBars =
    priority === "Alta" ? 3 : priority === "Média" ? 2 : 1;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`Prioridade ${priority}`}
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
          {priority}
        </span>
      )}
    </span>
  );
}
