"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  CircleDot,
  Filter,
  Flag,
  Package,
  RotateCcw,
  Tag,
  User,
  X,
} from "lucide-react";
import type { Task, TaskFilter, TaskPriority, TaskStatus } from "@/types/task";
import { ALL_CANONICAL_STATUSES, StatusIcon } from "../task-status-icon";
import { ALL_CANONICAL_PRIORITIES, PriorityIcon } from "../task-priority-icon";
import { cn } from "@/lib/utils";

export interface TaskFilterMenuProps {
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
  tasks: Task[];
  className?: string;
  iconOnly?: boolean;
  align?: "start" | "end";
}

type FilterTab =
  | "status"
  | "assignee"
  | "priority"
  | "tag"
  | "dueDate"
  | "taskType";

const FILTER_TABS: {
  id: FilterTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "status", label: "Status", icon: CircleDot },
  { id: "assignee", label: "Responsável", icon: User },
  { id: "priority", label: "Prioridade", icon: Flag },
  { id: "tag", label: "Etiquetas", icon: Tag },
  { id: "dueDate", label: "Data de vencimento", icon: Calendar },
  { id: "taskType", label: "Tipo de tarefa", icon: Package },
];

export function countActiveFilters(filters: TaskFilter): number {
  let count = 0;
  if (filters.search?.trim()) count++;
  if (filters.status && filters.status !== "Todos") count++;
  if (filters.priority && filters.priority !== "Todas") count++;
  if (filters.statuses && filters.statuses.length > 0) count++;
  if (filters.assignees && filters.assignees.length > 0) count++;
  if (filters.priorities && filters.priorities.length > 0) count++;
  if (filters.tags && filters.tags.length > 0) count++;
  if (filters.dueDateCategory && filters.dueDateCategory !== "all") count++;
  if (filters.taskType && filters.taskType !== "all") count++;
  return count;
}

export function TaskFilterMenu({
  filters,
  onFilterChange,
  tasks,
  className,
  iconOnly = false,
  align = "start",
}: TaskFilterMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("status");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();

  // Fecha ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeCount = countActiveFilters(filters);
  const hasActiveFilters = activeCount > 0;

  // Extrair responsáveis e etiquetas existentes na base de tarefas
  const availableAssignees = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.assignee?.trim()) set.add(t.assignee.trim());
    }
    return Array.from(set);
  }, [tasks]);

  const availableTags = React.useMemo(() => {
    const set = new Set<string>([
      "geral",
      "feature",
      "bug",
      "ui",
      "backend",
      "melhoria",
      "urgente",
    ]);
    for (const t of tasks) {
      if (t.tag?.trim()) set.add(t.tag.trim());
      if (t.tags) {
        for (const tag of t.tags) {
          if (tag.trim()) set.add(tag.trim());
        }
      }
    }
    return Array.from(set);
  }, [tasks]);

  // Helpers de seleção multi-opção
  const toggleArrayFilter = (
    key: "statuses" | "assignees" | "priorities" | "tags",
    val: string
  ) => {
    const current = (filters[key] as string[]) || [];
    const next = current.includes(val)
      ? current.filter((v) => v !== val)
      : [...current, val];
    onFilterChange({
      ...filters,
      [key]: next,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      search: "",
      status: "Todos",
      priority: "Todas",
      statuses: [],
      assignees: [],
      priorities: [],
      tags: [],
      dueDateCategory: "all",
      taskType: "all",
    });
  };

  // Contadores por aba
  const tabCounts: Record<FilterTab, number> = {
    status: (filters.statuses?.length ?? 0) + (filters.status !== "Todos" ? 1 : 0),
    assignee: filters.assignees?.length ?? 0,
    priority: (filters.priorities?.length ?? 0) + (filters.priority !== "Todas" ? 1 : 0),
    tag: filters.tags?.length ?? 0,
    dueDate: filters.dueDateCategory && filters.dueDateCategory !== "all" ? 1 : 0,
    taskType: filters.taskType && filters.taskType !== "all" ? 1 : 0,
  };

  return (
    <div className={cn("relative inline-block", className)} ref={containerRef}>
      {/* Botão de Disparo do Filtro */}
      <button
        id={triggerId}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Filtrar tarefas"
        className={cn(
          iconOnly
            ? "flex items-center justify-center h-8 w-8 rounded-lg transition-colors cursor-pointer relative text-muted-foreground hover:text-foreground hover:bg-muted/60"
            : "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer",
          hasActiveFilters &&
            (iconOnly
              ? "text-primary bg-primary/10 ring-1 ring-primary/40"
              : "border-primary/60 bg-primary/15 text-primary hover:bg-primary/20")
        )}
      >
        <Filter
          className={cn(
            iconOnly ? "w-4 h-4" : "w-3.5 h-3.5",
            hasActiveFilters ? "text-primary" : "text-muted-foreground"
          )}
        />
        {!iconOnly && <span>Filtro</span>}
        {!iconOnly && hasActiveFilters && (
          <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
            {activeCount}
          </span>
        )}
        {!iconOnly && (
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform" />
        )}
        {iconOnly && hasActiveFilters && (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
        )}
      </button>

      {/* Popover do Filtro Avançado */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Filtros de tarefas"
          className={cn(
            "absolute mt-1.5 w-[min(460px,calc(100vw-2rem))] z-50 rounded-xl border border-[#2c2f44] bg-[#161722] text-[#e2e4ef] shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100 flex flex-col",
            align === "end" ? "right-0" : "left-0"
          )}
        >
          {/* Header do Popover com Limpar Filtros */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#25283a]">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-[#a78bfa]" />
              <span className="text-xs font-bold text-white">Filtrar por</span>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>

          {/* Corpo com Navegação Lateral e Opções */}
          <div className="flex min-h-[220px] max-h-[320px] pt-2">
            {/* Abas Laterais (Dimensões do Anexo 1) */}
            <div className="w-40 border-r border-[#25283a] pr-2 space-y-0.5">
              {FILTER_TABS.map((tab) => {
                const Icon = tab.icon;
                const count = tabCounts[tab.id];
                const isSelected = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left",
                      isSelected
                        ? "bg-[#25283b] text-white"
                        : "text-[#c4c7db] hover:bg-[#1e2030] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          isSelected ? "text-[#a78bfa]" : "text-[#8e92a8]"
                        )}
                      />
                      <span className="truncate">{tab.label}</span>
                    </div>
                    {count > 0 && (
                      <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#7c5dfa] text-white text-[10px] font-bold">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Conteúdo da Aba Selecionada */}
            <div className="flex-1 pl-3 overflow-y-auto space-y-1">
              {activeTab === "status" && (
                <div className="space-y-1">
                  {ALL_CANONICAL_STATUSES.map((status) => {
                    const isChecked = Boolean(
                      filters.statuses?.includes(status) ||
                        filters.status === status
                    );

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => toggleArrayFilter("statuses", status)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                          isChecked
                            ? "bg-[#201e33] text-white"
                            : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <StatusIcon status={status} className="w-3.5 h-3.5" />
                          <span>{status}</span>
                        </div>
                        {isChecked && (
                          <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "assignee" && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleArrayFilter("assignees", "unassigned")}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                      filters.assignees?.includes("unassigned")
                        ? "bg-[#201e33] text-white"
                        : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-[#8e92a8]" />
                      <span>Sem responsável</span>
                    </div>
                    {filters.assignees?.includes("unassigned") && (
                      <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                    )}
                  </button>

                  {availableAssignees.map((assignee) => {
                    const isChecked = Boolean(
                      filters.assignees?.includes(assignee)
                    );
                    return (
                      <button
                        key={assignee}
                        type="button"
                        onClick={() => toggleArrayFilter("assignees", assignee)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                          isChecked
                            ? "bg-[#201e33] text-white"
                            : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-[#a78bfa]" />
                          <span>{assignee}</span>
                        </div>
                        {isChecked && (
                          <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "priority" && (
                <div className="space-y-1">
                  {ALL_CANONICAL_PRIORITIES.map((priority) => {
                    const isChecked = Boolean(
                      filters.priorities?.includes(priority) ||
                        filters.priority === priority
                    );

                    return (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => toggleArrayFilter("priorities", priority)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                          isChecked
                            ? "bg-[#201e33] text-white"
                            : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <PriorityIcon
                            priority={priority}
                            className="w-3.5 h-3.5"
                          />
                          <span>{priority}</span>
                        </div>
                        {isChecked && (
                          <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "tag" && (
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleArrayFilter("tags", "untagged")}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                      filters.tags?.includes("untagged")
                        ? "bg-[#201e33] text-white"
                        : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-[#8e92a8]" />
                      <span>Sem etiqueta</span>
                    </div>
                    {filters.tags?.includes("untagged") && (
                      <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                    )}
                  </button>

                  {availableTags.map((tag) => {
                    const isChecked = Boolean(filters.tags?.includes(tag));
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleArrayFilter("tags", tag)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                          isChecked
                            ? "bg-[#201e33] text-white"
                            : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-[#a78bfa]" />
                          <span>#{tag}</span>
                        </div>
                        {isChecked && (
                          <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "dueDate" && (
                <div className="space-y-1">
                  {[
                    { id: "all", label: "Todas as datas" },
                    { id: "overdue", label: "Atrasadas" },
                    { id: "today", label: "Para hoje" },
                    { id: "this_week", label: "Para esta semana" },
                    { id: "has_date", label: "Com data definida" },
                    { id: "no_date", label: "Sem data definida" },
                  ].map((option) => {
                    const isChecked =
                      (filters.dueDateCategory || "all") === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            dueDateCategory: option.id,
                          })
                        }
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                          isChecked
                            ? "bg-[#201e33] text-white font-medium"
                            : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#a78bfa]" />
                          <span>{option.label}</span>
                        </div>
                        {isChecked && (
                          <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeTab === "taskType" && (
                <div className="space-y-1">
                  {[
                    { id: "all", label: "Todos os tipos" },
                    { id: "with_subtasks", label: "Com subtarefas / checklists" },
                    { id: "simple", label: "Tarefas simples" },
                  ].map((option) => {
                    const isChecked =
                      (filters.taskType || "all") === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          onFilterChange({
                            ...filters,
                            taskType: option.id,
                          })
                        }
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer text-left",
                          isChecked
                            ? "bg-[#201e33] text-white font-medium"
                            : "text-[#c4c7db] hover:bg-[#1b1d2b] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-[#a78bfa]" />
                          <span>{option.label}</span>
                        </div>
                        {isChecked && (
                          <Check className="w-4 h-4 text-[#a78bfa] stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
