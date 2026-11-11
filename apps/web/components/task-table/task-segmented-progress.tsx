"use client";

import React from "react";
import type { Task, Subtask } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskSegmentedProgressProps {
  task: Task;
  allTasks: Task[];
  className?: string;
}

interface DescendantSummary {
  completed: number;
  total: number;
  counts: {
    concluido: number;
    fazendo: number;
    revisao: number;
    bloqueado: number;
    pendente: number;
  };
}

export function computeTaskDescendantsSummary(
  task: Task,
  allTasks: Task[]
): DescendantSummary | null {
  // Coletar tarefas filhas recursivamente sem loops
  const visitedTaskIds = new Set<string>();

  function collectChildTasks(parentTaskId: string): Task[] {
    if (visitedTaskIds.has(parentTaskId)) return [];
    visitedTaskIds.add(parentTaskId);

    const direct = allTasks.filter((t) => t.parentTaskId === parentTaskId && !visitedTaskIds.has(t.id));
    const result: Task[] = [...direct];
    for (const child of direct) {
      result.push(...collectChildTasks(child.id));
    }
    return result;
  }

  const childTasks = collectChildTasks(task.id);

  // Coletar subtasks da própria tarefa e de todas as tarefas descendentes
  const directSubtasks: Subtask[] = [task, ...childTasks].flatMap((item) => item.subtasks ?? []);

  // Se não houver nem tarefas filhas nem subtarefas, não há descendentes
  if (childTasks.length === 0 && directSubtasks.length === 0) {
    return null;
  }

  const counts = {
    concluido: 0,
    fazendo: 0,
    revisao: 0,
    bloqueado: 0,
    pendente: 0,
  };

  let completed = 0;
  let total = 0;

  // Processar child tasks
  for (const t of childTasks) {
    total++;
    const s = normalizeTaskStatus(t.status);
    if (s === "CONCLUÍDO") {
      completed++;
      counts.concluido++;
    } else if (s === "FAZENDO AGORA") {
      counts.fazendo++;
    } else if (s === "AGUARDANDO FEEDBACK") {
      counts.revisao++;
    } else if (s === "BLOQUEADO") {
      counts.bloqueado++;
    } else {
      counts.pendente++;
    }
  }

  // Processar direct subtasks (se houver)
  for (const st of directSubtasks) {
    total++;
    if (st.completed) {
      completed++;
      counts.concluido++;
    } else if (st.inProgress) {
      counts.fazendo++;
    } else {
      counts.pendente++;
    }
  }

  if (total === 0) return null;

  return { completed, total, counts };
}

export function TaskSegmentedProgress({
  task,
  allTasks,
  className,
}: TaskSegmentedProgressProps) {
  const summary = computeTaskDescendantsSummary(task, allTasks);
  if (!summary) return null;

  const { completed, total, counts } = summary;
  const percent = Math.round((completed / total) * 100);
  const isAllDone = completed === total && total > 0;

  const segmentCount = Math.min(total, 6);
  const statuses = [
    ...Array(counts.concluido).fill("bg-primary"),
    ...Array(counts.fazendo).fill("bg-primary/75"),
    ...Array(counts.revisao).fill("bg-primary/50"),
    ...Array(counts.bloqueado).fill("bg-destructive"),
    ...Array(counts.pendente).fill("bg-muted-foreground/30"),
  ] as string[];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-2 shrink-0 select-none ${className ?? ""}`} tabIndex={0} aria-label={`Feito ${completed} de ${total}, ${percent}%`}>
            <span className="flex h-2.5 gap-0.5" aria-hidden="true">
              {Array.from({ length: segmentCount }, (_, index) => (
                <span key={index} className={`h-full w-2 rounded-[2px] ${isAllDone ? "bg-primary" : statuses[Math.floor((index * total) / segmentCount)]}`} />
              ))}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{completed}/{total}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent>Feito {completed}/{total} {percent}%</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
