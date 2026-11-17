"use client";

import React from "react";
import type { CrmProjectMember, Task } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
import {
  CheckCircle2,
  ChevronRight,
  Diamond,
  FileText,
  Folder,
  Layers,
  ListChecks,
  PanelTop,
  Square,
} from "lucide-react";
import { TaskSolidStatusBadge } from "@/components/task-table/task-solid-status-badge";
import { TaskTimelineDateCell } from "@/components/task-table/task-timeline-date-cell";
import { TaskAssigneeCell } from "@/components/task-table/task-assignee-cell";
import { cn } from "@/lib/utils";
import type { GanttRowItem } from "./task-gantt-types";
import { formatDateRange } from "./task-gantt-utils";

interface TaskGanttTreeProps {
  rows: GanttRowItem[];
  members: CrmProjectMember[];
  membersLoaded?: boolean;
  canWrite?: boolean;
  onOpenTask: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
  onToggleExpand: (taskId: string) => void;
  className?: string;
}

export function TaskGanttTree({
  rows,
  members,
  membersLoaded = true,
  canWrite = true,
  onOpenTask,
  onUpdateTask,
  onChangeAssignee,
  onToggleExpand,
  className,
}: TaskGanttTreeProps) {
  function renderTypeIcon(row: GanttRowItem) {
    const isCompleted = normalizeTaskStatus(row.task.status) === "CONCLUÍDO";

    switch (row.itemType) {
      case "STAGE":
        return <Layers className="size-4 shrink-0 text-purple-400" />;
      case "MODULE":
        return <Folder className="size-4 shrink-0 text-cyan-400" />;
      case "PAGE":
        return <FileText className="size-4 shrink-0 text-blue-400" />;
      case "SECTION":
        return <PanelTop className="size-3.5 shrink-0 text-amber-400" />;
      case "ITEM":
        return <ListChecks className="size-3.5 shrink-0 text-emerald-400" />;
      case "MILESTONE":
        return <Diamond className="size-3.5 shrink-0 text-pink-400" />;
      case "TASK":
      default:
        if (isCompleted) {
          return <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />;
        }
        return <Square className="size-3.5 shrink-0 text-muted-foreground/70" />;
    }
  }

  return (
    <div className={cn("flex flex-col min-w-full text-xs select-none", className)}>
      {/* Cabeçalho da Tabela */}
      <div className="sticky top-0 z-20 flex items-center h-10 border-b border-border/60 bg-muted/80 backdrop-blur-xs px-3 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
        <div className="flex-1 min-w-[180px] pl-2">Tarefa</div>
        <div className="w-32 shrink-0 px-2">Status</div>
        <div className="w-28 shrink-0 px-2">Data</div>
        <div className="w-20 shrink-0 px-2 text-center">Resp.</div>
        <div className="w-24 shrink-0 px-2 text-right">Progresso</div>
      </div>

      {/* Linhas da Árvore */}
      <div className="divide-y divide-border/40">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Nenhuma tarefa encontrada com os filtros atuais.
          </div>
        ) : (
          rows.map((row) => {
            const isStage = row.itemType === "STAGE";
            const isModule = row.itemType === "MODULE";
            const isPage = row.itemType === "PAGE";

            return (
              <div
                key={row.id}
                className={cn(
                  "flex items-center h-10 px-3 hover:bg-muted/40 transition-colors group",
                  isStage && "bg-purple-950/15 font-semibold text-foreground",
                  isModule && "bg-cyan-950/10 font-medium",
                  isPage && "bg-blue-950/5"
                )}
              >
                {/* Coluna Tarefa (Indentação + Chevron + Ícone + Título) */}
                <div
                  className="flex-1 min-w-[180px] flex items-center gap-1.5 overflow-hidden pr-2"
                  style={{ paddingLeft: `${row.depth * 18}px` }}
                >
                  {/* Botão de Expandir/Recolher */}
                  {row.hasChildren ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(row.id);
                      }}
                      className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 transition-transform duration-150",
                          row.isExpanded && "rotate-90"
                        )}
                      />
                    </button>
                  ) : (
                    <div className="w-5 shrink-0" />
                  )}

                  {/* Ícone de Tipo */}
                  <span className="shrink-0">{renderTypeIcon(row)}</span>

                  {/* Título da Tarefa */}
                  <button
                    type="button"
                    onClick={() => onOpenTask(row.task)}
                    title={row.task.title}
                    className="truncate text-left font-medium text-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xs"
                  >
                    {row.task.title}
                  </button>
                </div>

                {/* Coluna Status */}
                <div className="w-32 shrink-0 px-2 overflow-hidden">
                  <TaskSolidStatusBadge
                    status={row.task.status}
                    size="sm"
                    onChangeStatus={
                      canWrite && onUpdateTask
                        ? (nextStatus) => onUpdateTask({ ...row.task, status: nextStatus })
                        : undefined
                    }
                  />
                </div>

                {/* Coluna Data */}
                <div className="w-28 shrink-0 px-2 truncate font-mono text-[11px] text-muted-foreground">
                  {canWrite && onUpdateTask && !row.isDerivedDates ? (
                    <TaskTimelineDateCell
                      startDate={row.startDate}
                      dueDate={row.dueDate}
                      status={row.task.status}
                      priority={row.task.priority}
                      onUpdateDates={({ startDate, dueDate }) =>
                        onUpdateTask({ ...row.task, startDate, dueDate })
                      }
                    />
                  ) : (
                    <span
                      title={
                        row.isDerivedDates
                          ? "Período inferido a partir dos itens descendentes"
                          : undefined
                      }
                      className={cn(
                        row.isDerivedDates && "italic opacity-80"
                      )}
                    >
                      {formatDateRange(row.startDate, row.dueDate)}
                    </span>
                  )}
                </div>

                {/* Coluna Responsável */}
                <div className="w-20 shrink-0 px-2 flex justify-center">
                  <TaskAssigneeCell
                    assignee={row.task.assignee}
                    assigneeId={row.task.assigneeId}
                    assigneeAvatar={row.task.assigneeAvatar}
                    members={members}
                    membersLoaded={membersLoaded}
                    onUpdateAssignee={
                      canWrite && onChangeAssignee
                        ? (_name, _avatar, memberId) => {
                            const member = members.find((m) => m.userId === memberId) ?? null;
                            onChangeAssignee(row.id, member);
                          }
                        : () => {}
                    }
                  />
                </div>

                {/* Coluna Progresso */}
                <div className="w-24 shrink-0 px-2 flex items-center justify-end gap-1.5">
                  <div className="h-1.5 w-12 bg-muted/60 rounded-full overflow-hidden shrink-0">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        row.progressPercent === 100
                          ? "bg-emerald-500"
                          : row.progressPercent > 0
                          ? "bg-primary"
                          : "bg-transparent"
                      )}
                      style={{ width: `${row.progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground w-7 text-right">
                    {row.progressPercent}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
