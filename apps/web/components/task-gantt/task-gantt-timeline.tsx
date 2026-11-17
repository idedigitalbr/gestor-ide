"use client";

import React, { useState, useMemo } from "react";
import type { Task } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
import {
  Check,
  Clock,
  Diamond,
  Link as LinkIcon,
  Plus,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  GanttRowItem,
  GanttScale,
  TaskDependency,
} from "./task-gantt-types";
import {
  TimelineWindow,
  addDays,
  formatDateRange,
  formatIsoDate,
  getBarPosition,
  getTodayPixel,
  parseIsoDate,
  wouldCreateDependencyCycle,
} from "./task-gantt-utils";

interface TaskGanttTimelineProps {
  rows: GanttRowItem[];
  window: TimelineWindow;
  canWrite?: boolean;
  dependencies: TaskDependency[];
  onAddDependency?: (fromTaskId: string, toTaskId: string) => void;
  onRemoveDependency?: (dependencyId: string) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTaskDates?: (taskId: string, startDate: string, dueDate: string) => void;
  timelineScrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  className?: string;
}

interface DragAction {
  taskId: string;
  type: "move" | "resize-left" | "resize-right";
  initialMouseX: number;
  initialStart: Date;
  initialDue: Date;
  currentStart: Date;
  currentDue: Date;
}

export function TaskGanttTimeline({
  rows,
  window: tWindow,
  canWrite = true,
  dependencies,
  onAddDependency,
  onRemoveDependency,
  onOpenTask,
  onUpdateTaskDates,
  timelineScrollRef,
  onScroll,
  className,
}: TaskGanttTimelineProps) {
  // Drag e Resize interativo de barras
  const [dragAction, setDragAction] = useState<DragAction | null>(null);

  // Conexão interativa de dependência
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Hover em dependência para remoção
  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null);

  const rowHeight = 40; // Exatamente 40px por linha, correspondente ao task-gantt-tree

  const todayPixel = useMemo(
    () => getTodayPixel(tWindow.startDate, tWindow.dayWidth),
    [tWindow.startDate, tWindow.dayWidth]
  );

  // Mapa de índices de linha para calcular coordenadas das dependências
  const rowIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r, idx) => map.set(r.id, idx));
    return map;
  }, [rows]);

  // Mapa de barras de tarefas calculadas
  const barPositionsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        left: number;
        width: number;
        isMilestone: boolean;
        isUndated: boolean;
      }
    >();

    for (const r of rows) {
      // Se estiver em drag ativo, usa as datas do preview
      let sStr = r.startDate;
      let dStr = r.dueDate;

      if (dragAction && dragAction.taskId === r.id) {
        sStr = formatIsoDate(dragAction.currentStart);
        dStr = formatIsoDate(dragAction.currentDue);
      }

      const pos = getBarPosition(sStr, dStr, tWindow.startDate, tWindow.dayWidth);
      map.set(r.id, pos);
    }
    return map;
  }, [rows, dragAction, tWindow.startDate, tWindow.dayWidth]);

  // Handler de início de Drag/Resize
  const handlePointerDown = (
    e: React.PointerEvent,
    taskId: string,
    type: "move" | "resize-left" | "resize-right",
    startDateStr: string | null,
    dueDateStr: string | null
  ) => {
    if (!canWrite || !onUpdateTaskDates) return;
    e.stopPropagation();

    const s = parseIsoDate(startDateStr) ?? tWindow.startDate;
    const d = parseIsoDate(dueDateStr) ?? s;

    setDragAction({
      taskId,
      type,
      initialMouseX: e.clientX,
      initialStart: s,
      initialDue: d,
      currentStart: s,
      currentDue: d,
    });

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragAction) return;

    const deltaX = e.clientX - dragAction.initialMouseX;
    const deltaDays = Math.round(deltaX / tWindow.dayWidth);

    if (dragAction.type === "move") {
      const nextStart = addDays(dragAction.initialStart, deltaDays);
      const nextDue = addDays(dragAction.initialDue, deltaDays);
      setDragAction((prev) =>
        prev
          ? {
              ...prev,
              currentStart: nextStart,
              currentDue: nextDue,
            }
          : null
      );
    } else if (dragAction.type === "resize-left") {
      const candidateStart = addDays(dragAction.initialStart, deltaDays);
      // Impede início após fim
      if (candidateStart.getTime() <= dragAction.initialDue.getTime()) {
        setDragAction((prev) =>
          prev ? { ...prev, currentStart: candidateStart } : null
        );
      }
    } else if (dragAction.type === "resize-right") {
      const candidateDue = addDays(dragAction.initialDue, deltaDays);
      // Impede fim antes do início
      if (candidateDue.getTime() >= dragAction.initialStart.getTime()) {
        setDragAction((prev) =>
          prev ? { ...prev, currentDue: candidateDue } : null
        );
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragAction) return;
    const { taskId, currentStart, currentDue } = dragAction;
    setDragAction(null);

    try {
      const target = e.currentTarget as HTMLElement;
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignora erro se target não tiver mais captura
    }

    if (onUpdateTaskDates) {
      onUpdateTaskDates(
        taskId,
        formatIsoDate(currentStart),
        formatIsoDate(currentDue)
      );
    }
  };

  // Cores de barra de acordo com o status e tipo
  function getBarClasses(row: GanttRowItem) {
    if (row.itemType === "STAGE") {
      return "bg-purple-600/90 hover:bg-purple-600 text-white shadow-xs border border-purple-500/30";
    }
    if (row.itemType === "MODULE") {
      return "bg-indigo-600/80 hover:bg-indigo-600 text-white shadow-xs border border-indigo-500/30";
    }
    if (row.itemType === "PAGE") {
      return "bg-blue-600/70 hover:bg-blue-600 text-white shadow-xs border border-blue-500/30";
    }

    const norm = normalizeTaskStatus(row.task.status);
    if (norm === "CONCLUÍDO") {
      return "bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-500/30";
    }
    if (norm === "FAZENDO AGORA") {
      return "bg-primary/90 hover:bg-primary text-primary-foreground border border-primary/30";
    }
    if (norm === "AGUARDANDO FEEDBACK") {
      return "bg-amber-600/85 hover:bg-amber-600 text-white border border-amber-500/30";
    }
    if (norm === "BLOQUEADO") {
      return "bg-destructive/85 hover:bg-destructive text-white border border-destructive/30";
    }
    return "bg-secondary-foreground/45 hover:bg-secondary-foreground/65 text-secondary border border-border/40";
  }

  return (
    <div
      ref={timelineScrollRef}
      onScroll={onScroll}
      className={cn(
        "overflow-x-auto overflow-y-auto relative h-full select-none focus:outline-none",
        className
      )}
      style={{
        scrollbarWidth: "thin",
      }}
    >
      <div
        className="relative"
        style={{
          width: `${Math.max(tWindow.totalWidth, 800)}px`,
          minHeight: "100%",
        }}
      >
        {/* Cabeçalho Fixo da Timeline (2 Linhas: Meses e Semanas/Dias) */}
        <div className="sticky top-0 z-20 border-b border-border/60 bg-muted/80 backdrop-blur-xs">
          {/* Linha 1: Grupos de Mês / Ano */}
          <div className="flex h-5 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            {tWindow.headerGroups.map((group) => (
              <div
                key={group.key}
                className="flex items-center px-2 border-r border-border/30 truncate"
                style={{ width: `${group.width}px` }}
              >
                {group.label}
              </div>
            ))}
          </div>

          {/* Linha 2: Colunas da Escala Selecionada */}
          <div className="flex h-5 text-[10px] font-mono text-muted-foreground">
            {tWindow.columns.map((col) => (
              <div
                key={col.key}
                className={cn(
                  "flex items-center justify-between px-1.5 border-r border-border/30 truncate",
                  col.isToday && "text-primary font-bold bg-primary/10",
                  col.isWeekend && "bg-muted/30"
                )}
                style={{ width: `${col.width}px` }}
              >
                <span className="truncate">{col.label}</span>
                {col.subLabel && (
                  <span className="text-[9px] opacity-75 hidden sm:inline ml-1 truncate">
                    {col.subLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Linha Vertical Indicadora de "Hoje" */}
        {todayPixel >= 0 && todayPixel <= tWindow.totalWidth && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none z-10 flex flex-col items-center"
            style={{ left: `${todayPixel}px` }}
          >
            {/* Badge "Hoje" no Topo da Régua */}
            <div className="sticky top-1 z-30 -translate-x-1/2">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground shadow-md uppercase tracking-wider">
                Hoje
              </span>
            </div>
            {/* Linha Tracejada */}
            <div className="w-0 flex-1 border-l-2 border-dashed border-primary opacity-80" />
          </div>
        )}

        {/* Grade de Fundo (Colunas e Finais de Semana) */}
        <div className="absolute inset-0 pointer-events-none flex">
          {tWindow.columns.map((col) => (
            <div
              key={`bg-${col.key}`}
              className={cn(
                "h-full border-r border-border/15",
                col.isWeekend && "bg-white/[0.015] dark:bg-black/20"
              )}
              style={{ width: `${col.width}px` }}
            />
          ))}
        </div>

        {/* Overlay SVG de Linhas de Dependências (FS) */}
        <svg
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            width: `${tWindow.totalWidth}px`,
            height: `${rows.length * rowHeight + 40}px`,
          }}
        >
          <defs>
            <marker
              id="gantt-arrow"
              viewBox="0 0 6 6"
              refX="5"
              refY="3"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" fill="currentColor" />
            </marker>
          </defs>

          {dependencies.map((dep) => {
            const fromIndex = rowIndexMap.get(dep.fromTaskId);
            const toIndex = rowIndexMap.get(dep.toTaskId);
            if (fromIndex === undefined || toIndex === undefined) return null;

            const fromBar = barPositionsMap.get(dep.fromTaskId);
            const toBar = barPositionsMap.get(dep.toTaskId);
            if (!fromBar || !toBar || fromBar.isUndated || toBar.isUndated) {
              return null;
            }

            // Ponto de saída: extremidade direita do predecessor
            const x1 = fromBar.left + fromBar.width;
            const y1 = fromIndex * rowHeight + rowHeight / 2;

            // Ponto de chegada: extremidade esquerda do sucessor
            const x2 = toBar.left;
            const y2 = toIndex * rowHeight + rowHeight / 2;

            // Caminho suave em curva bézier ou ortogonal
            let pathD = "";
            if (x2 >= x1 + 8) {
              const dx = Math.min(24, (x2 - x1) / 2);
              pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            } else {
              // Conflito temporal (sucessor começa antes de predecessor terminar)
              const offset = 14;
              pathD = `M ${x1} ${y1} L ${x1 + offset} ${y1} L ${x1 + offset} ${
                y1 + (y2 > y1 ? 14 : -14)
              } L ${x2 - offset} ${y1 + (y2 > y1 ? 14 : -14)} L ${x2 - offset} ${y2} L ${x2} ${y2}`;
            }

            const isHovered = hoveredDepId === dep.id;

            return (
              <g
                key={dep.id}
                className="pointer-events-auto cursor-pointer"
                onMouseEnter={() => setHoveredDepId(dep.id)}
                onMouseLeave={() => setHoveredDepId(null)}
                onClick={() => {
                  if (canWrite && onRemoveDependency) {
                    onRemoveDependency(dep.id);
                  }
                }}
              >
                {/* Linha visível */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  markerEnd="url(#gantt-arrow)"
                  className={cn(
                    "transition-all duration-150",
                    isHovered
                      ? "text-destructive stroke-destructive"
                      : "text-muted-foreground/50 stroke-muted-foreground/50 hover:text-primary hover:stroke-primary"
                  )}
                />
                {/* Área de toque maior */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                />
              </g>
            );
          })}
        </svg>

        {/* Linhas de Barras da Timeline */}
        <div className="relative divide-y divide-border/20">
          {rows.map((row) => {
            const bar = barPositionsMap.get(row.id);
            const isStage = row.itemType === "STAGE";
            const isModule = row.itemType === "MODULE";
            const isCompleted = normalizeTaskStatus(row.task.status) === "CONCLUÍDO";
            const isDragging = dragAction?.taskId === row.id;

            return (
              <div
                key={row.id}
                className={cn(
                  "relative flex items-center group/row transition-colors",
                  isStage && "bg-purple-950/5",
                  isModule && "bg-cyan-950/5"
                )}
                style={{ height: `${rowHeight}px` }}
              >
                {/* Tarefa sem data definida */}
                {(!bar || bar.isUndated) && (
                  <div
                    className="absolute left-4 flex items-center gap-2 text-[11px] text-muted-foreground/50 italic opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Clock className="size-3" />
                    <span>Sem período definido</span>
                    {canWrite && onUpdateTaskDates && (
                      <button
                        type="button"
                        onClick={() => {
                          const todayStr = formatIsoDate(new Date());
                          const nextWeekStr = formatIsoDate(addDays(new Date(), 5));
                          onUpdateTaskDates(row.id, todayStr, nextWeekStr);
                        }}
                        className="ml-2 inline-flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        <Plus className="size-3" />
                        <span>Definir</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Barra de Gantt Normal ou Agregada */}
                {bar && !bar.isUndated && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onPointerDown={(e) =>
                            handlePointerDown(
                              e,
                              row.id,
                              "move",
                              row.startDate,
                              row.dueDate
                            )
                          }
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onClick={() => {
                            if (!dragAction) {
                              onOpenTask(row.task);
                            }
                          }}
                          className={cn(
                            "absolute flex items-center justify-between rounded-md px-2 text-xs font-medium cursor-grab active:cursor-grabbing transition-shadow",
                            getBarClasses(row),
                            isDragging && "ring-2 ring-primary ring-offset-2 z-30 shadow-lg scale-[1.01]",
                            bar.isMilestone && "rounded-full justify-center px-1"
                          )}
                          style={{
                            left: `${bar.left}px`,
                            width: `${bar.width}px`,
                            height: isStage ? "24px" : isModule ? "22px" : "20px",
                          }}
                        >
                          {/* Handle de Resize Esquerdo */}
                          {canWrite && !row.isDerivedDates && !bar.isMilestone && (
                            <div
                              onPointerDown={(e) =>
                                handlePointerDown(
                                  e,
                                  row.id,
                                  "resize-left",
                                  row.startDate,
                                  row.dueDate
                                )
                              }
                              className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/30 rounded-l-md transition-colors"
                            />
                          )}

                          {/* Conteúdo da Barra (Ícone + Título + Progresso) */}
                          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden pointer-events-none">
                            {isCompleted && (
                              <Check className="size-3 shrink-0 text-white" />
                            )}
                            {bar.isMilestone && (
                              <Diamond className="size-3 shrink-0 text-pink-300" />
                            )}
                            <span className="truncate text-[10px] font-medium leading-none">
                              {row.task.title}
                            </span>
                          </div>

                          {/* Marco de entrega da etapa ao final (se for STAGE) */}
                          {isStage && (
                            <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                              <span className="flex size-3.5 rotate-45 bg-purple-500 border border-purple-300 rounded-[2px]" />
                              {row.dueDate && (
                                <span className="ml-2 whitespace-nowrap text-[10px] text-purple-300 font-mono hidden md:inline">
                                  Entrega {formatDateRange(null, row.dueDate)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Handle de Resize Direito */}
                          {canWrite && !row.isDerivedDates && !bar.isMilestone && (
                            <div
                              onPointerDown={(e) =>
                                handlePointerDown(
                                  e,
                                  row.id,
                                  "resize-right",
                                  row.startDate,
                                  row.dueDate
                                )
                              }
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/30 rounded-r-md transition-colors"
                            />
                          )}

                          {/* Ponto de Conexão de Dependência na Extremidade Direita */}
                          {canWrite && onAddDependency && (
                            <button
                              type="button"
                              title="Criar dependência (Término para Início)"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!connectingFromId) {
                                  setConnectingFromId(row.id);
                                } else if (connectingFromId !== row.id) {
                                  if (
                                    !wouldCreateDependencyCycle(
                                      dependencies,
                                      connectingFromId,
                                      row.id
                                    )
                                  ) {
                                    onAddDependency(connectingFromId, row.id);
                                  }
                                  setConnectingFromId(null);
                                }
                              }}
                              className={cn(
                                "absolute -right-2.5 top-1/2 -translate-y-1/2 size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity cursor-crosshair z-20 hover:scale-125 shadow-xs",
                                connectingFromId === row.id && "opacity-100 ring-2 ring-white"
                              )}
                            >
                              <LinkIcon className="size-2.5" />
                            </button>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs p-2.5 space-y-1">
                        <div className="font-semibold text-foreground">{row.task.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>Período: {formatDateRange(row.startDate, row.dueDate)}</span>
                          <span>•</span>
                          <span>Progresso: {row.progressPercent}%</span>
                        </div>
                        {row.isDerivedDates && (
                          <div className="text-[10px] text-purple-400 italic">
                            (Intervalo agregado a partir dos itens descendentes)
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
