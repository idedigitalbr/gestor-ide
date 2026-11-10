import React from "react";
import type { TaskStatus } from "@/types/task";
import { Circle, Clock, CheckCircle2, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIconProps {
  status: TaskStatus;
  className?: string;
}

export function StatusIcon({ status, className }: StatusIconProps) {
  switch (status) {
    case "A Fazer":
      return <Circle className={cn("w-3.5 h-3.5 text-muted-foreground stroke-[1.75]", className)} />;
    case "Em Andamento":
      return <Clock className={cn("w-3.5 h-3.5 text-amber-500 stroke-[2]", className)} />;
    case "Em Revisão":
      return <CircleDot className={cn("w-3.5 h-3.5 text-purple-500 stroke-[2]", className)} />;
    case "Concluído":
      return <CheckCircle2 className={cn("w-3.5 h-3.5 text-emerald-500 stroke-[2]", className)} />;
    default:
      return <Circle className={cn("w-3.5 h-3.5 text-muted-foreground stroke-[1.75]", className)} />;
  }
}
