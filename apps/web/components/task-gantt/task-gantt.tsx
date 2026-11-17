"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { CrmProjectMember, Task } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
import { cn } from "@/lib/utils";
import {
  getLocalTaskDependencies,
  setLocalTaskDependencies,
} from "@/lib/gestor-cache";
import { TaskGanttToolbar } from "./task-gantt-toolbar";
import { TaskGanttTree } from "./task-gantt-tree";
import { TaskGanttTimeline } from "./task-gantt-timeline";
import type {
  GanttScale,
  GanttGroupBy,
  GanttDisplayFilter,
  TaskDependency,
} from "./task-gantt-types";
import {
  computeTimelineWindow,
  flattenTaskHierarchy,
  getTodayPixel,
} from "./task-gantt-utils";

export interface TaskGanttProps {
  tasks: Task[];
  allTasks?: Task[];
  projectId?: string | null;
  members?: CrmProjectMember[];
  membersLoaded?: boolean;
  canWrite?: boolean;
  onOpen: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
  className?: string;
}

const DEFAULT_SPLITTER_WIDTH = 450;
const MIN_SPLITTER_WIDTH = 280;
const MAX_SPLITTER_WIDTH = 700;

export function TaskGantt({
  tasks,
  allTasks,
  projectId,
  members = [],
  membersLoaded = true,
  canWrite = true,
  onOpen,
  onUpdateTask,
  onChangeAssignee,
  className,
}: TaskGanttProps) {
  // Escala temporal: Dia | Semana | Mês (Semana como padrão)
  const [scale, setScale] = useState<GanttScale>("week");

  // Zoom: 70% a 150% (1.0 = 100%)
  const [zoom, setZoom] = useState<number>(1.0);

  // Agrupamento e Exibição
  const [groupBy, setGroupBy] = useState<GanttGroupBy>("hierarchy");
  const [displayFilter, setDisplayFilter] = useState<GanttDisplayFilter>("all");

  // Filtros internos rápidos
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modo Foco / Expansão
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Estado de expansão de nós da árvore
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Largura do painel esquerdo (Árvore)
  const [splitterWidth, setSplitterWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("gestor_gantt_splitter_width");
      return saved ? Math.max(MIN_SPLITTER_WIDTH, Math.min(MAX_SPLITTER_WIDTH, Number(saved))) : DEFAULT_SPLITTER_WIDTH;
    } catch {
      return DEFAULT_SPLITTER_WIDTH;
    }
  });

  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  // Dependências entre tarefas (persistidas localmente por projeto)
  const [prevProjectId, setPrevProjectId] = useState<string | null | undefined>(projectId);
  const [dependencies, setDependencies] = useState<TaskDependency[]>(() => {
    return projectId ? getLocalTaskDependencies(projectId) : [];
  });

  if (projectId !== prevProjectId) {
    setPrevProjectId(projectId);
    setDependencies(projectId ? getLocalTaskDependencies(projectId) : []);
  }

  const handleAddDependency = useCallback(
    (fromTaskId: string, toTaskId: string) => {
      if (!projectId) return;
      const newDep: TaskDependency = {
        id: `dep-${fromTaskId}-${toTaskId}-${Date.now()}`,
        fromTaskId,
        toTaskId,
        type: "FS",
      };
      setDependencies((prev) => {
        const next = [...prev, newDep];
        setLocalTaskDependencies(projectId, next);
        return next;
      });
    },
    [projectId]
  );

  const handleRemoveDependency = useCallback(
    (dependencyId: string) => {
      if (!projectId) return;
      setDependencies((prev) => {
        const next = prev.filter((d) => d.id !== dependencyId);
        setLocalTaskDependencies(projectId, next);
        return next;
      });
    },
    [projectId]
  );

  // Lista base de tarefas para cálculos
  const baseTasks = useMemo(() => {
    return allTasks && allTasks.length > 0 ? allTasks : tasks;
  }, [allTasks, tasks]);

  // Filtragem de tarefas antes do achatamento
  const filteredTasks = useMemo(() => {
    let list = baseTasks;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => t.title.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      list = list.filter((t) => normalizeTaskStatus(t.status) === statusFilter);
    }

    return list;
  }, [baseTasks, searchQuery, statusFilter]);

  // Linhas da árvore achatadas respeitando expansão e filtros
  const rows = useMemo(() => {
    return flattenTaskHierarchy(filteredTasks, expandedTasks, displayFilter);
  }, [filteredTasks, expandedTasks, displayFilter]);

  // Janela temporal (datas, colunas e cabeçalhos)
  const timelineWindow = useMemo(() => {
    return computeTimelineWindow(rows, scale, zoom);
  }, [rows, scale, zoom]);

  // Toggle de expandir/recolher
  const handleToggleExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === undefined ? false : !prev[taskId],
    }));
  }, []);

  // Atualização interativa de datas a partir da timeline
  const handleUpdateTaskDates = useCallback(
    (taskId: string, startDate: string, dueDate: string) => {
      if (!onUpdateTask) return;
      const task = baseTasks.find((t) => t.id === taskId);
      if (task) {
        onUpdateTask({ ...task, startDate, dueDate });
      }
    },
    [baseTasks, onUpdateTask]
  );

  // Sincronização de Scroll Vertical entre Tabela e Timeline
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  const handleTreeScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (timelineScrollRef.current && treeScrollRef.current) {
      timelineScrollRef.current.scrollTop = treeScrollRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleTimelineScroll = () => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    if (treeScrollRef.current && timelineScrollRef.current) {
      treeScrollRef.current.scrollTop = timelineScrollRef.current.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  // Navegação: Centralizar em "Hoje"
  const handleScrollToToday = useCallback(() => {
    if (!timelineScrollRef.current) return;
    const todayPixel = getTodayPixel(
      timelineWindow.startDate,
      timelineWindow.dayWidth
    );
    const containerWidth = timelineScrollRef.current.clientWidth;
    timelineScrollRef.current.scrollTo({
      left: Math.max(0, todayPixel - containerWidth / 2),
      behavior: "smooth",
    });
  }, [timelineWindow.startDate, timelineWindow.dayWidth]);

  // Centraliza no Hoje no primeiro carregamento
  useEffect(() => {
    const timer = setTimeout(() => {
      handleScrollToToday();
    }, 150);
    return () => clearTimeout(timer);
  }, [handleScrollToToday]);

  // Navegação: Navegar para anterior / próximo período
  const handleNavigate = (direction: "prev" | "next") => {
    if (!timelineScrollRef.current) return;
    const delta = (timelineScrollRef.current.clientWidth / 2) * (direction === "next" ? 1 : -1);
    timelineScrollRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  // Drag do Splitter entre Tabela e Timeline
  const handleSplitterPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    const startX = e.clientX;
    const initialWidth = splitterWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth = Math.max(
        MIN_SPLITTER_WIDTH,
        Math.min(MAX_SPLITTER_WIDTH, initialWidth + delta)
      );
      setSplitterWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      try {
        localStorage.setItem("gestor_gantt_splitter_width", String(splitterWidth));
      } catch {}
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleSplitterDoubleClick = () => {
    setSplitterWidth(DEFAULT_SPLITTER_WIDTH);
    try {
      localStorage.setItem("gestor_gantt_splitter_width", String(DEFAULT_SPLITTER_WIDTH));
    } catch {}
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs",
        isFocusMode ? "fixed inset-2 z-50 rounded-lg shadow-2xl bg-background" : "h-[720px] max-h-[85vh]",
        className
      )}
    >
      {/* Barra de Ferramentas do Gantt */}
      <TaskGanttToolbar
        scale={scale}
        onScaleChange={setScale}
        zoom={zoom}
        onZoomChange={setZoom}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        displayFilter={displayFilter}
        onDisplayFilterChange={setDisplayFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onTodayClick={handleScrollToToday}
        onNavigate={handleNavigate}
        isFocusMode={isFocusMode}
        onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
        totalVisible={rows.length}
        totalTasks={baseTasks.length}
      />

      {/* Corpo Principal do Gantt: Tabela à Esquerda + Timeline à Direita */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Painel Esquerdo: Árvore Hierárquica */}
        <div
          ref={treeScrollRef}
          onScroll={handleTreeScroll}
          className="shrink-0 overflow-y-auto overflow-x-hidden border-r border-border/60 bg-card/40"
          style={{
            width: `${splitterWidth}px`,
            scrollbarWidth: "none",
          }}
        >
          <TaskGanttTree
            rows={rows}
            members={members}
            membersLoaded={membersLoaded}
            canWrite={canWrite}
            onOpenTask={onOpen}
            onUpdateTask={onUpdateTask}
            onChangeAssignee={onChangeAssignee}
            onToggleExpand={handleToggleExpand}
          />
        </div>

        {/* Divisor Arrastável (Splitter) */}
        <div
          onPointerDown={handleSplitterPointerDown}
          onDoubleClick={handleSplitterDoubleClick}
          title="Arrastar para redimensionar colunas (duplo clique para redefinir)"
          className={cn(
            "w-1.5 shrink-0 -ml-1 z-30 cursor-col-resize hover:bg-primary/50 transition-colors",
            isDraggingSplitter && "bg-primary"
          )}
        />

        {/* Painel Direito: Timeline Canvas */}
        <div className="flex-1 min-w-0 h-full overflow-hidden bg-background/50">
          <TaskGanttTimeline
            rows={rows}
            window={timelineWindow}
            canWrite={canWrite}
            dependencies={dependencies}
            onAddDependency={handleAddDependency}
            onRemoveDependency={handleRemoveDependency}
            onOpenTask={onOpen}
            onUpdateTaskDates={canWrite ? handleUpdateTaskDates : undefined}
            timelineScrollRef={timelineScrollRef}
            onScroll={handleTimelineScroll}
          />
        </div>
      </div>
    </div>
  );
}
