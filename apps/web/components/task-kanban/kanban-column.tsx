"use client";

import React, { useState, useRef } from "react";
import type { CrmProjectMember } from "@gestor-ide/core";
import type { Task, TaskStatus } from "@/types/task";
import { KanbanCard } from "./kanban-card";
import { StatusIcon, getStatusDefinition } from "../task-status-icon";
import { Plus, ChevronsLeftRight, EyeOff, ChevronsRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanGhostCard, useKanbanEdgeHover } from "@/components/kanban-ghost-card";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  members?: CrmProjectMember[];
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
  isCollapsed?: boolean;
  onToggleCollapse: () => void;
  onHideColumn: () => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isFirstColumn?: boolean;
  isLastColumn?: boolean;
  isDragging?: boolean;
  forceShowGhost?: boolean;
  ghostDirection?: "left" | "right";
}

export function KanbanColumn({
  status,
  tasks,
  members = [],
  onChangeAssignee,
  isCollapsed = false,
  onToggleCollapse,
  onHideColumn,
  onUpdateTask,
  onDeleteTask,
  onOpenDetails,
  onQuickAdd,
  onDropTask,
  onDragStart,
  onDragEnd,
  isFirstColumn = false,
  isLastColumn = false,
  isDragging = false,
  forceShowGhost = false,
  ghostDirection,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  const {
    isGhostVisible,
    slideDirection,
    showGhost,
    hideGhost,
    keepGhost,
  } = useKanbanEdgeHover({ leaveDelay: 220 });

  const effectiveSlideDirection =
    ghostDirection ||
    slideDirection ||
    (isFirstColumn ? "left" : "right");

  const isGhostActive = (isGhostVisible || forceShowGhost) && !isDragging;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isDragging || isCollapsed) return;
    if (!columnRef.current) return;

    const rect = columnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Se estiver na primeira coluna e próximo à borda esquerda (até 36px)
    if (isFirstColumn && x <= 36) {
      showGhost("left");
    } else if (isLastColumn && rect.width - x <= 36) {
      // Se estiver na última coluna e próximo à borda direita (até 36px)
      showGhost("right");
    }
  }

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
      ref={columnRef}
      data-column-status={status}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseMove={handleMouseMove}
      onMouseLeave={hideGhost}
      className={cn(
        "relative flex flex-col flex-1 min-w-[240px] max-w-[300px] rounded-xl p-2 transition-all duration-150 select-none bg-muted/30 border border-border/80",
        isDragOver && "border-ring/50 bg-muted/60"
      )}
    >
      {/* Trigger invisível de hover na lateral externa da primeira coluna */}
      {isFirstColumn && (
        <div
          className="absolute -left-3 top-0 bottom-0 w-7 z-20 cursor-pointer"
          onMouseEnter={() => showGhost("left")}
          onMouseLeave={hideGhost}
          aria-hidden="true"
        />
      )}

      {/* Trigger invisível de hover na lateral externa da última coluna */}
      {isLastColumn && (
        <div
          className="absolute -right-3 top-0 bottom-0 w-7 z-20 cursor-pointer"
          onMouseEnter={() => showGhost("right")}
          onMouseLeave={hideGhost}
          aria-hidden="true"
        />
      )}

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
        {/* Card Fantasma (Skeleton / Placeholder) suave com transição e microinteração */}
        <div
          onMouseEnter={keepGhost}
          onMouseLeave={hideGhost}
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            isGhostActive
              ? "max-h-24 opacity-100 mb-1 translate-x-0"
              : cn(
                  "max-h-0 opacity-0 mb-0 pointer-events-none",
                  effectiveSlideDirection === "left" ? "-translate-x-5" : "translate-x-5"
                )
          )}
        >
          <KanbanGhostCard
            label="Novo"
            sublabel={`em ${getStatusDefinition(status).label}`}
            onClick={() => onQuickAdd(status)}
            slideDirection={effectiveSlideDirection}
            variant="task"
            isVisible={isGhostActive}
          />
        </div>

        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            members={members}
            onChangeAssignee={onChangeAssignee}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onOpenDetails={onOpenDetails}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}

        {tasks.length === 0 && !isGhostActive && (
          <div className="py-8 text-center text-[11px] text-text-icon/80">
            Nenhuma tarefa
          </div>
        )}
      </div>
    </div>
  );
}
