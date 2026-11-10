"use client";

import React, { useState } from "react";
import type { Task, TaskStatus } from "@/types/task";
import { KanbanColumn } from "./kanban-column";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye } from "lucide-react";

interface TaskKanbanProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
}

const KANBAN_COLUMNS: TaskStatus[] = ["A Fazer", "Em Andamento", "Em Revisão", "Concluído"];

export function TaskKanban({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onOpenDetails,
  onQuickAdd,
}: TaskKanbanProps) {
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});
  const [hiddenColumns, setHiddenColumns] = useState<TaskStatus[]>([]);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDropTask(taskId: string, targetStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
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
              const count = tasks.filter((t) => t.status === status).length;
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

      {/* Main Board Scroll Area */}
      <ScrollArea className="w-full pb-4">
        <div className="flex gap-3 items-start min-w-[1000px] xl:min-w-0">
          {visibleColumns.map((colStatus) => {
            const colTasks = tasks.filter((t) => t.status === colStatus);
            const isCollapsed = Boolean(collapsedColumns[colStatus]);

            return (
              <KanbanColumn
                key={colStatus}
                status={colStatus}
                tasks={colTasks}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => toggleCollapse(colStatus)}
                onHideColumn={() => hideColumn(colStatus)}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onOpenDetails={onOpenDetails}
                onQuickAdd={onQuickAdd}
                onDropTask={handleDropTask}
                onDragStart={handleDragStart}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
}
