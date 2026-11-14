"use client";

import React, { useState } from "react";
import type { CrmProjectMember } from "@gestor-ide/core";
import type { Task, TaskStatus, CanonicalTaskStatus } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";
import { ALL_CANONICAL_STATUSES } from "../task-status-icon";
import { KanbanColumn } from "./kanban-column";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanGhostCard, useKanbanEdgeHover } from "@/components/kanban-ghost-card";

interface TaskKanbanProps {
  tasks: Task[];
  members?: CrmProjectMember[];
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
}

const KANBAN_COLUMNS: CanonicalTaskStatus[] = ALL_CANONICAL_STATUSES;

export function TaskKanban({
  tasks,
  members = [],
  onChangeAssignee,
  onUpdateTask,
  onDeleteTask,
  onOpenDetails,
  onQuickAdd,
}: TaskKanbanProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [hiddenColumns, setHiddenColumns] = useState<TaskStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Hooks de hover para as extremidades laterais do Kanban
  const {
    isGhostVisible: isLeftGhost,
    showGhost: showLeftGhost,
    hideGhost: hideLeftGhost,
  } = useKanbanEdgeHover({ leaveDelay: 220 });

  const {
    isGhostVisible: isRightGhost,
    showGhost: showRightGhost,
    hideGhost: hideRightGhost,
    keepGhost: keepRightGhost,
  } = useKanbanEdgeHover({ leaveDelay: 220 });

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setIsDragging(true);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  function handleDropTask(taskId: string, targetStatus: TaskStatus) {
    setIsDragging(false);
    const task = tasks.find((t) => t.id === taskId);
    if (task && normalizeTaskStatus(task.status) !== normalizeTaskStatus(targetStatus)) {
      onUpdateTask({ ...task, status: targetStatus });
    }
  }

  function toggleCollapse(status: TaskStatus) {
    setCollapsedColumns((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  }

  function hideColumn(status: TaskStatus) {
    if (!hiddenColumns.includes(status)) {
      setHiddenColumns((prev) => [...prev, status]);
    }
  }

  function unhideColumn(status: TaskStatus) {
    setHiddenColumns((prev) => prev.filter((s) => s !== status));
  }

  const visibleColumns = KANBAN_COLUMNS.filter((col) => !hiddenColumns.includes(col));

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Hidden columns pill widget (faithful to It's a Plan observed reference) */}
      {hiddenColumns.length > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-card border border-border text-xs w-fit">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Colunas Ocultas:
          </span>
          <div className="flex items-center gap-1.5">
            {hiddenColumns.map((status) => {
              const count = tasks.filter(
                (t) => normalizeTaskStatus(t.status) === status
              ).length;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => unhideColumn(status)}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[11px] border border-border/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title={`Restaurar coluna ${status}`}
                  aria-label={`Restaurar coluna ${status}`}
                >
                  <Eye className="w-3 h-3 text-muted-foreground" />
                  <span>
                    {status} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Board Scroll Area com detecção de hover nas bordas */}
      <div className="relative w-full">
        {/* Trigger de hover na borda lateral esquerda do Kanban */}
        <div
          className="absolute left-0 top-0 bottom-4 w-6 z-20 cursor-pointer"
          onMouseEnter={() => showLeftGhost("left")}
          onMouseLeave={hideLeftGhost}
          aria-hidden="true"
        />

        {/* Trigger de hover na borda lateral direita do Kanban */}
        <div
          className="absolute right-0 top-0 bottom-4 w-6 z-20 cursor-pointer"
          onMouseEnter={() => showRightGhost("right")}
          onMouseLeave={hideRightGhost}
          aria-hidden="true"
        />

        <ScrollArea className="w-full pb-4">
          <div className="flex gap-3 items-start min-w-[1200px] xl:min-w-0 pr-2">
            {visibleColumns.map((colStatus, index) => {
              const colTasks = tasks.filter(
                (t) => normalizeTaskStatus(t.status) === colStatus
              );
              const isCollapsed = Boolean(collapsedColumns[colStatus]);
              const isFirstColumn = index === 0;
              const isLastColumn = index === visibleColumns.length - 1;

              return (
                <KanbanColumn
                  key={colStatus}
                  status={colStatus}
                  tasks={colTasks}
                  members={members}
                  onChangeAssignee={onChangeAssignee}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleCollapse(colStatus)}
                  onHideColumn={() => hideColumn(colStatus)}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onOpenDetails={onOpenDetails}
                  onQuickAdd={onQuickAdd}
                  onDropTask={handleDropTask}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isFirstColumn={isFirstColumn}
                  isLastColumn={isLastColumn}
                  isDragging={isDragging}
                  forceShowGhost={isFirstColumn ? isLeftGhost : isLastColumn ? isRightGhost : false}
                  ghostDirection={isFirstColumn ? "left" : "right"}
                />
              );
            })}

            {/* Placeholder lateral expansível no final das colunas */}
            {visibleColumns.length > 0 && (
              <div
                onMouseEnter={keepRightGhost}
                onMouseLeave={hideRightGhost}
                className={cn(
                  "transition-all duration-300 ease-out shrink-0 overflow-hidden",
                  isRightGhost && !isDragging
                    ? "w-[240px] opacity-100 translate-x-0"
                    : "w-0 opacity-0 translate-x-4 pointer-events-none"
                )}
              >
                <KanbanGhostCard
                  label="Novo"
                  sublabel="Adicionar card"
                  variant="column"
                  slideDirection="right"
                  isVisible={isRightGhost && !isDragging}
                  onClick={() =>
                    onQuickAdd(visibleColumns[visibleColumns.length - 1] || "PENDENTE")
                  }
                />
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>
    </div>
  );
}
