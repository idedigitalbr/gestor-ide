"use client";

import React from "react";
import type { Task, Subtask } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";

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

    const direct = allTasks.filter((t) => t.parentTaskId === parentTaskId);
    const result: Task[] = [...direct];
    for (const child of direct) {
      result.push(...collectChildTasks(child.id));
    }
    return result;
  }

  const childTasks = collectChildTasks(task.id);

  // Coletar subtasks da própria tarefa e de todas as tarefas descendentes
  const directSubtasks: Subtask[] = task.subtasks ?? [];

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

  // Segmentos normalizados proporcionalmente
  const segments = [
    { key: "concluido", count: counts.concluido, color: "bg-[#10b981]" }, // Verde
    { key: "fazendo", count: counts.fazendo, color: "bg-[#8b5cf6]" }, // Roxo/Azul
    { key: "revisao", count: counts.revisao, color: "bg-[#f59e0b]" }, // Laranja
    { key: "bloqueado", count: counts.bloqueado, color: "bg-[#ef4444]" }, // Vermelho
    { key: "pendente", count: counts.pendente, color: "bg-[#374151]" }, // Grafite
  ].filter((s) => s.count > 0);

  return (
    <div
      className={`inline-flex items-center gap-1.5 shrink-0 select-none group/prog relative align-middle ${
        className ?? ""
      }`}
    >
      {/* Barra segmentada */}
      <div className="flex h-[7px] w-12 rounded-[2px] overflow-hidden bg-[#222533] gap-[1px]">
        {isAllDone ? (
          <div className="h-full w-full bg-[#10b981]" />
        ) : (
          segments.map((seg) => {
            const widthPct = Math.max(8, Math.round((seg.count / total) * 100));
            return (
              <div
                key={seg.key}
                className={`h-full ${seg.color}`}
                style={{ width: `${widthPct}%` }}
              />
            );
          })
        )}
      </div>

      {/* Contagem discreta ao lado */}
      <span className="text-[11px] font-mono font-medium text-muted-foreground/80">
        {completed}/{total}
      </span>

      {/* Tooltip flutuante no hover estilo Mockup Anexo 8 & 9 */}
      <div className="opacity-0 group-hover/prog:opacity-100 transition-opacity duration-150 pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-40 px-2.5 py-1 rounded-md bg-white text-black text-[11px] font-semibold shadow-xl whitespace-nowrap">
        Feito {completed}/{total} {percent}%
        {/* Setinha apontando para baixo */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white" />
      </div>
    </div>
  );
}
