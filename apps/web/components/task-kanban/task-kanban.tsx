"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import type { CrmProjectMember } from "@gestor-ide/core";
import type { Task, TaskStatus, CanonicalTaskStatus } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";
import { ALL_CANONICAL_STATUSES } from "../task-status-icon";
import { KanbanColumn } from "./kanban-column";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TaskKanbanProps {
  tasks: Task[];
  members?: CrmProjectMember[];
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onQuickAdd: (status: TaskStatus) => void;
}

const BASE_COLUMNS: CanonicalTaskStatus[] = ALL_CANONICAL_STATUSES;

// ─── Hook: dwell de 2s para o separador entre colunas ───────────────────────
function useColumnSeparatorDwell(dwellMs = 2000, leaveDelayMs = 180) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null); // índice do gap onde mostrar ghost
  const [hoveringIndex, setHoveringIndex] = useState<number | null>(null);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onEnter = useCallback((gapIndex: number) => {
    if (leaveRef.current) { clearTimeout(leaveRef.current); leaveRef.current = null; }
    setHoveringIndex(gapIndex);
    if (activeIndex !== null) return; // já há ghost aberto
    if (dwellRef.current) clearTimeout(dwellRef.current);
    dwellRef.current = setTimeout(() => {
      setActiveIndex(gapIndex);
    }, dwellMs);
  }, [activeIndex, dwellMs]);

  const onLeave = useCallback(() => {
    if (dwellRef.current) { clearTimeout(dwellRef.current); dwellRef.current = null; }
    leaveRef.current = setTimeout(() => {
      setHoveringIndex(null);
    }, leaveDelayMs);
  }, [leaveDelayMs]);

  const openAt = useCallback((gapIndex: number) => {
    if (dwellRef.current) clearTimeout(dwellRef.current);
    setActiveIndex(gapIndex);
    setHoveringIndex(gapIndex);
  }, []);

  const close = useCallback(() => {
    setActiveIndex(null);
    setHoveringIndex(null);
  }, []);

  const keepOpen = useCallback(() => {
    if (leaveRef.current) { clearTimeout(leaveRef.current); leaveRef.current = null; }
  }, []);

  useEffect(() => () => {
    if (dwellRef.current) clearTimeout(dwellRef.current);
    if (leaveRef.current) clearTimeout(leaveRef.current);
  }, []);

  return { activeIndex, hoveringIndex, onEnter, onLeave, openAt, close, keepOpen };
}

// ─── Separador vertical entre colunas (cria nova coluna) ─────────────────────
function ColumnGapSeparator({
  gapIndex,
  isHovering,
  onEnter,
  onLeave,
  onClickPlus,
  disabled,
}: {
  gapIndex: number;
  isHovering: boolean;
  onEnter: (i: number) => void;
  onLeave: () => void;
  onClickPlus: (i: number) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;
  return (
    <div
      className="relative self-stretch flex-shrink-0 w-5 flex flex-col items-center justify-center group/colsep z-20 cursor-pointer"
      onMouseEnter={() => onEnter(gapIndex)}
      onMouseLeave={onLeave}
      title="Adicionar nova coluna"
      aria-label="Adicionar nova coluna"
    >
      {/* Linha vertical degradê */}
      <div
        className={cn(
          "w-[1.5px] h-[60%] rounded-full bg-gradient-to-b from-transparent via-primary/50 to-transparent transition-all duration-300 pointer-events-none",
          isHovering ? "opacity-100" : "opacity-0 group-hover/colsep:opacity-70"
        )}
      />
      {/* Botão + */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClickPlus(gapIndex);
        }}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "size-6 rounded-full bg-card/90 backdrop-blur-md border border-border/80",
          "text-foreground/70 shadow-sm flex items-center justify-center",
          "transition-all duration-300",
          isHovering
            ? "opacity-100 scale-110 text-primary border-primary/60 bg-card shadow-md"
            : "opacity-0 group-hover/colsep:opacity-80 group-hover/colsep:scale-100",
          "hover:scale-110 hover:text-primary hover:border-primary/60 hover:bg-card hover:shadow-md"
        )}
        aria-label="Adicionar nova coluna nesta posição"
      >
        <Plus className="size-3.5 stroke-[2.2] transition-transform duration-300 group-hover/colsep:rotate-90" />
      </button>
    </div>
  );
}

// ─── Ghost de nova coluna com formulário inline ───────────────────────────────
function NewColumnGhost({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onCancel();
  }

  return (
    <div
      className={cn(
        "flex-shrink-0 w-[240px] h-[calc(100vh-210px)] max-h-[420px]",
        "rounded-xl border-2 border-dashed border-primary/60 bg-card/50 backdrop-blur-xs",
        "flex flex-col items-center justify-center p-4 gap-3",
        "animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200",
        "shadow-md"
      )}
    >
      <div className="flex flex-col items-center gap-1 text-muted-foreground">
        <div className="size-9 rounded-xl bg-background/80 border border-border/70 flex items-center justify-center mb-1">
          <Plus className="size-4 text-primary stroke-[2.5]" />
        </div>
        <span className="text-xs font-bold text-foreground">Nova Coluna</span>
        <span className="text-[11px] text-muted-foreground/70">Digite o nome do status</span>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="w-full flex flex-col gap-2">
        <Input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Em Revisão"
          className="h-7 text-xs text-center"
          maxLength={32}
        />
        <div className="flex gap-1.5">
          <Button
            type="submit"
            size="compact"
            className="flex-1 gap-1"
            disabled={!name.trim()}
          >
            <Check className="size-3" />
            Criar
          </Button>
          <Button
            type="button"
            size="compact"
            variant="ghost"
            className="flex-1"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}

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

  // Colunas customizadas criadas no Kanban (apenas locais, por enquanto)
  const [, setCustomColumns] = useState<Array<{ name: string; insertAfterIndex: number }>>([]);

  const colSep = useColumnSeparatorDwell(2000, 180);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setIsDragging(true);
    colSep.close();
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

  function handleConfirmNewColumn(name: string) {
    const gapIndex = colSep.activeIndex!;
    setCustomColumns((prev) => [
      ...prev,
      { name, insertAfterIndex: gapIndex },
    ]);
    colSep.close();
  }

  const visibleBaseColumns = BASE_COLUMNS.filter((col) => !hiddenColumns.includes(col));

  // Monta lista final de colunas intercalando as custom
  // (por simplicidade, colunas custom são meramente visuais e redirecionam onQuickAdd para PENDENTE)
  // Uma integração real com a API do CRM precisaria de um endpoint de criação de status.
  const allVisibleColumns = visibleBaseColumns; // custom columns ficam para integração futura

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Hidden columns bar */}
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
                  <span>{status} ({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Board */}
      <div className="relative w-full">
        <ScrollArea className="w-full pb-4">
          <div className="flex items-start min-w-[1200px] xl:min-w-0 pr-2">

            {/* Ghost de nova coluna NO INÍCIO (gap 0) */}
            {colSep.activeIndex === 0 && (
              <div
                className="mr-3 flex-shrink-0"
                onMouseEnter={colSep.keepOpen}
              >
                <NewColumnGhost
                  onConfirm={handleConfirmNewColumn}
                  onCancel={colSep.close}
                />
              </div>
            )}

            {allVisibleColumns.map((colStatus, index) => {
              const colTasks = tasks.filter(
                (t) => normalizeTaskStatus(t.status) === colStatus
              );
              const isCollapsed = Boolean(collapsedColumns[colStatus]);
              // O gapIndex do separador DEPOIS desta coluna é index + 1
              const rightGapIndex = index + 1;

              return (
                <React.Fragment key={colStatus}>
                  {/* Separador vertical NO INÍCIO da primeira coluna (gap 0) */}
                  {index === 0 && (
                    <ColumnGapSeparator
                      gapIndex={0}
                      isHovering={colSep.hoveringIndex === 0}
                      onEnter={colSep.onEnter}
                      onLeave={colSep.onLeave}
                      onClickPlus={colSep.openAt}
                      disabled={isDragging}
                    />
                  )}

                  <div
                    className={cn(
                      "flex-1 min-w-[240px] max-w-[300px]",
                      isCollapsed && "flex-none"
                    )}
                  >
                    <KanbanColumn
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
                      isDragging={isDragging}
                    />
                  </div>

                  {/* Separador vertical À DIREITA de cada coluna */}
                  <ColumnGapSeparator
                    gapIndex={rightGapIndex}
                    isHovering={colSep.hoveringIndex === rightGapIndex}
                    onEnter={colSep.onEnter}
                    onLeave={colSep.onLeave}
                    onClickPlus={colSep.openAt}
                    disabled={isDragging}
                  />

                  {/* Ghost de nova coluna neste gap */}
                  {colSep.activeIndex === rightGapIndex && (
                    <div
                      className="ml-0 flex-shrink-0"
                      onMouseEnter={colSep.keepOpen}
                    >
                      <NewColumnGhost
                        onConfirm={handleConfirmNewColumn}
                        onCancel={colSep.close}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" className="h-1.5" />
        </ScrollArea>
      </div>
    </div>
  );
}
