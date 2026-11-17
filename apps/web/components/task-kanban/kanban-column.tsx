"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { CrmProjectMember } from "@gestor-ide/core";
import type { Task, TaskStatus } from "@/types/task";
import { KanbanCard } from "./kanban-card";
import { StatusIcon, getStatusDefinition } from "../task-status-icon";
import { Plus, ChevronsLeftRight, EyeOff, ChevronsRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { KanbanGhostCard } from "@/components/kanban-ghost-card";

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
  isDragging?: boolean;
}

// ─── Hook: dwell de 2s para expansão do skeleton dentro da coluna ────────────
function useInColumnDwell({ dwellTimeMs = 2000, autoCloseMs = 4000 } = {}) {
  const [expandedAt, setExpandedAt] = useState<number | null>(null); // índice 0 = antes do 1º card
  const [hoveringAt, setHoveringAt] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseStartRef = useRef<number>(0);
  const autoCloseRemainingRef = useRef<number>(autoCloseMs);

  const clearTimers = useCallback(() => {
    if (dwellRef.current) { clearTimeout(dwellRef.current); dwellRef.current = null; }
    if (autoCloseRef.current) { clearTimeout(autoCloseRef.current); autoCloseRef.current = null; }
  }, []);

  const startAutoClose = useCallback((duration: number) => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    autoCloseStartRef.current = Date.now();
    autoCloseRemainingRef.current = duration;
    setIsPaused(false);
    autoCloseRef.current = setTimeout(() => {
      setExpandedAt(null);
      setHoveringAt(null);
      setIsPaused(false);
    }, duration);
  }, []);

  // Hover num separador: inicia contagem de 2s
  const onSepEnter = useCallback((index: number) => {
    if (expandedAt !== null) return; // já há um skeleton aberto
    setHoveringAt(index);
    if (dwellRef.current) clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(() => {
      setExpandedAt(index);
      startAutoClose(autoCloseMs);
    }, dwellTimeMs);
  }, [expandedAt, dwellTimeMs, autoCloseMs, startAutoClose]);

  // Saiu do separador antes dos 2s: cancela
  const onSepLeave = useCallback(() => {
    setHoveringAt(null);
    if (dwellRef.current) { clearTimeout(dwellRef.current); dwellRef.current = null; }
  }, []);

  // Clique direto no botão +: abre imediatamente
  const openAt = useCallback((index: number) => {
    clearTimers();
    setExpandedAt(index);
    startAutoClose(autoCloseMs);
  }, [clearTimers, startAutoClose, autoCloseMs]);

  // Mouse entrou no skeleton: pausa auto-close
  const onGhostEnter = useCallback(() => {
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
      const elapsed = Date.now() - autoCloseStartRef.current;
      autoCloseRemainingRef.current = Math.max(800, autoCloseRemainingRef.current - elapsed);
      setIsPaused(true);
    }
  }, []);

  // Mouse saiu do skeleton: retoma auto-close
  const onGhostLeave = useCallback(() => {
    if (expandedAt !== null) {
      startAutoClose(autoCloseRemainingRef.current);
    }
  }, [expandedAt, startAutoClose]);

  // Fecha o skeleton
  const close = useCallback(() => {
    clearTimers();
    setExpandedAt(null);
    setHoveringAt(null);
    setIsPaused(false);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    expandedAt,
    hoveringAt,
    isPaused,
    autoCloseMs,
    onSepEnter,
    onSepLeave,
    openAt,
    onGhostEnter,
    onGhostLeave,
    close,
  };
}

// ─── Separador Horizontal (inserção entre cards) ─────────────────────────────
function TaskSeparator({
  index,
  isHovering,
  onEnter,
  onLeave,
  onClickPlus,
  disabled,
}: {
  index: number;
  isHovering: boolean;
  onEnter: (i: number) => void;
  onLeave: () => void;
  onClickPlus: (i: number) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;
  return (
    <div
      className="relative h-4 -my-1 flex items-center justify-center group/sep z-10 select-none"
      onMouseEnter={() => onEnter(index)}
      onMouseLeave={onLeave}
      title="Adicionar tarefa aqui"
      aria-label="Adicionar tarefa aqui"
    >
      {/* Linha horizontal degradê */}
      <div
        className={cn(
          "w-[88%] h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-primary/50 to-transparent transition-all duration-300 pointer-events-none",
          isHovering ? "opacity-100" : "opacity-0 group-hover/sep:opacity-70"
        )}
      />
      {/* Botãozinho + */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClickPlus(index);
        }}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "size-5 rounded-full bg-card/90 backdrop-blur-md border border-border/80",
          "text-foreground/70 shadow-xs flex items-center justify-center",
          "transition-all duration-300",
          isHovering
            ? "opacity-100 scale-100 text-primary border-primary/60 bg-card"
            : "opacity-0 group-hover/sep:opacity-80 group-hover/sep:scale-100",
          "hover:scale-110 hover:text-primary hover:border-primary/60 hover:bg-card hover:shadow-md"
        )}
        aria-label="Adicionar tarefa nesta posição"
      >
        <Plus className="size-3 stroke-[2.2] transition-transform duration-300 group-hover/sep:rotate-90" />
      </button>
    </div>
  );
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
  isDragging = false,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const dwell = useInColumnDwell({ dwellTimeMs: 2000, autoCloseMs: 4000 });

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

  // Fechar skeleton se começar drag
  const closeDwell = dwell.close;
  useEffect(() => {
    if (isDragging) closeDwell();
  }, [isDragging, closeDwell]);

  // ─── Collapsed Rail ───────────────────────────────────────────────────────
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

        <div className="flex-1 flex items-center justify-center py-4">
          <span className="[writing-mode:vertical-lr] rotate-180 text-xs font-medium text-muted-foreground group-hover:text-foreground tracking-wide whitespace-nowrap">
            {getStatusDefinition(status).label} · {tasks.length}
          </span>
        </div>

        <div className="w-1.5 h-1.5 rounded-full bg-border mb-2" />
      </div>
    );
  }

  // ─── Expanded Column ──────────────────────────────────────────────────────
  const statusLabel = getStatusDefinition(status).label;
  const separatorDisabled = isDragging;

  return (
    <div
      data-column-status={status}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col flex-1 min-w-[240px] max-w-[300px] rounded-xl p-2 transition-all duration-150 select-none bg-muted/30 border border-border/80",
        isDragOver && "border-ring/50 bg-muted/60"
      )}
    >
      {/* ── Column Header ── */}
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <StatusIcon status={status} />
          <h3 className="font-medium text-xs text-foreground tracking-tight">
            {statusLabel}
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
            title={`Adicionar tarefa em ${statusLabel}`}
            aria-label={`Adicionar tarefa em ${statusLabel}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Cards list ── */}
      <div className="flex flex-col overflow-y-auto flex-1 pr-0.5 pt-0.5">

        {/* Separador ANTES do primeiro card (índice 0) */}
        <TaskSeparator
          index={0}
          isHovering={dwell.hoveringAt === 0}
          onEnter={dwell.onSepEnter}
          onLeave={dwell.onSepLeave}
          onClickPlus={dwell.openAt}
          disabled={separatorDisabled}
        />

        {/* Skeleton antes do primeiro card */}
        {dwell.expandedAt === 0 && (
          <div
            className="mb-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
            onMouseEnter={dwell.onGhostEnter}
            onMouseLeave={dwell.onGhostLeave}
          >
            <KanbanGhostCard
              label="Novo"
              sublabel={`em ${statusLabel}`}
              onClick={() => { dwell.close(); onQuickAdd(status); }}
              variant="task"
              isVisible
              autoCloseMs={dwell.autoCloseMs}
              isPaused={dwell.isPaused}
              onMouseEnter={dwell.onGhostEnter}
              onMouseLeave={dwell.onGhostLeave}
            />
          </div>
        )}

        {/* Se coluna vazia e sem skeleton, exibe empty-state clicável */}
        {tasks.length === 0 && dwell.expandedAt === null && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-2 py-10 cursor-pointer group/empty"
            onClick={() => dwell.openAt(0)}
          >
            <div className="size-8 rounded-xl bg-muted/60 border border-dashed border-border/50 flex items-center justify-center transition-all duration-200 group-hover/empty:border-primary/60 group-hover/empty:bg-primary/5">
              <Plus className="size-4 text-muted-foreground/50 group-hover/empty:text-primary transition-colors" />
            </div>
            <span className="text-[11px] text-muted-foreground/60 group-hover/empty:text-muted-foreground transition-colors">
              Nenhuma tarefa
            </span>
          </div>
        )}

        {/* Cards com separadores entre eles */}
        {tasks.map((task, idx) => (
          <React.Fragment key={task.id}>
            <div data-flip-id={task.id} className="mb-1.5">
              <KanbanCard
                task={task}
                members={members}
                onChangeAssignee={onChangeAssignee}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onOpenDetails={onOpenDetails}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            </div>

            {/* Separador DEPOIS de cada card (índice idx + 1) */}
            <TaskSeparator
              index={idx + 1}
              isHovering={dwell.hoveringAt === idx + 1}
              onEnter={dwell.onSepEnter}
              onLeave={dwell.onSepLeave}
              onClickPlus={dwell.openAt}
              disabled={separatorDisabled}
            />

            {/* Skeleton depois deste card */}
            {dwell.expandedAt === idx + 1 && (
              <div
                className="mb-1.5 animate-in fade-in slide-in-from-top-2 duration-200"
                onMouseEnter={dwell.onGhostEnter}
                onMouseLeave={dwell.onGhostLeave}
              >
                <KanbanGhostCard
                  label="Novo"
                  sublabel={`em ${statusLabel}`}
                  onClick={() => { dwell.close(); onQuickAdd(status); }}
                  variant="task"
                  isVisible
                  autoCloseMs={dwell.autoCloseMs}
                  isPaused={dwell.isPaused}
                  onMouseEnter={dwell.onGhostEnter}
                  onMouseLeave={dwell.onGhostLeave}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
