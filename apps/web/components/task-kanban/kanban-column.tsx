"use client";

import React, { useState } from "react";
import type { Task, TaskStatus } from "@/types/task";
import { KanbanCard } from "./kanban-card";
import { StatusIcon, getStatusDefinition } from "../task-status-icon";
import { Plus, ChevronsLeftRight, EyeOff, ChevronsRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  isCollapsed?: boolean;
  onToggleCollapse: () => void;
  onHideColumn: () => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
}

export function KanbanColumn({
  status,
  tasks,
  isCollapsed = false,
  onToggleCollapse,
  onHideColumn,
  onUpdateTask,
  onDeleteTask,
  onOpenDetails,
  onQuickAdd,
  onDropTask,
  onDragStart,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onDropTask(taskId, status);
    }
  }

  // Collapsed Vertical Rail (faithful to It's a Plan observed reference)
  if (isCollapsed) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleCollapse}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleCollapse();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={`Expandir coluna ${status} (${tasks.length})`}
        aria-label={`Coluna ${status} recolhida com ${tasks.length} tarefas. Clique para expandir.`}
        className={cn(
          "w-9 min-w-[36px] max-w-[36px] h-[calc(100vh-190px)] rounded-xl p-1.5 transition-all duration-150 select-none bg-muted/40 border border-border hover:border-ring/40 flex flex-col items-center justify-between cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          isDragOver && "border-ring/50 bg-muted/70"
        )}
      >
        <div className="flex flex-col items-center gap-1.5 w-full pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Expandir coluna"
            aria-label="Expandir coluna"
          >
            <ChevronsRightLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(status);
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title={`Adicionar tarefa em ${status}`}
            aria-label={`Adicionar tarefa em ${status}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <div className="mt-1">
            <StatusIcon status={status} />
          </div>
        </div>

        {/* Vertical text label */}
        <div className="flex-1 flex items-center justify-center py-4">
          <span className="[writing-mode:vertical-lr] rotate-180 text-xs font-medium text-muted-foreground group-hover:text-foreground tracking-wide whitespace-nowrap">
            {getStatusDefinition(status).label} · {tasks.length}
          </span>
        </div>

        <div className="w-1.5 h-1.5 rounded-full bg-border mb-2" />
      </div>
    );
  }

  // Expanded Standard Column
  return (
    <div
      data-column-status={status}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col flex-1 min-w-[240px] max-w-[300px] rounded-xl p-2 transition-all duration-150 select-none bg-muted/30 border border-border/80",
        isDragOver && "border-ring/50 bg-muted/60"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <h3 className="font-medium text-xs text-foreground tracking-tight">
            {getStatusDefinition(status).label}
          </h3>
          <span className="text-xs font-mono text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Recolher coluna em trilho vertical"
            aria-label="Recolher coluna em trilho vertical"
          >
            <ChevronsLeftRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onHideColumn}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title="Ocultar coluna"
            aria-label="Ocultar coluna"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onQuickAdd(status)}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            title={`Adicionar tarefa em ${status}`}
            aria-label={`Adicionar tarefa em ${status}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards list */}
      <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onOpenDetails={onOpenDetails}
            onDragStart={onDragStart}
          />
        ))}

        {tasks.length === 0 && (
          <div className="py-8 text-center text-[11px] text-text-icon/80">
            Nenhuma tarefa
          </div>
        )}
      </div>
    </div>
  );
}
