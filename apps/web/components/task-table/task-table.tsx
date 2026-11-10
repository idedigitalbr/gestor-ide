"use client";

import React, { useState } from "react";
import type { Subtask, Task, TaskPriority, TaskStatus } from "@/types/task";
import { StatusIcon } from "../task-status-icon";
import { PriorityIcon } from "../task-priority-icon";
import { formatDateDeterministic } from "@/lib/initial-data";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDashed,
  Clock,
  CornerDownRight,
  Flag,
  GripVertical,
  ListTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onAddTask: (
    taskData: Omit<Task, "id" | "createdAt" | "code"> & { code?: string }
  ) => void;
  onUpdateSubtasks?: (taskId: string, subtasks: Subtask[]) => void;
  onReorderTasks?: (
    draggedTaskId: string,
    targetTaskId: string | null,
    targetStatus: TaskStatus
  ) => void;
}

const TABLE_GROUPS: TaskStatus[] = [
  "A Fazer",
  "Em Andamento",
  "Em Revisão",
  "Concluído",
];

const PRIORITIES: TaskPriority[] = ["Baixa", "Média", "Alta", "Urgente"];

const PRESET_TAGS = [
  "geral",
  "feature",
  "bug",
  "ui",
  "backend",
  "melhoria",
  "urgente",
];

function isOverdueDate(dueDate?: string): boolean {
  if (!dueDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate.slice(0, 10) < today;
}

export function TaskTable({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onOpenDetails,
  onAddTask,
  onUpdateSubtasks,
  onReorderTasks,
}: TaskTableProps) {
  // Controle de grupos recolhidos e tarefas com subtarefas expandidas
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  // Multi-seleção de linhas (checkbox aparece no hover ou quando marcado)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Estado de Drag & Drop inline
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<TaskStatus | null>(null);

  // Edição inline de título de tarefa existente
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Criação inline de Nova Tarefa (estilo ClickUp: só abre ao clicar e mostra ações/Salvar)
  const [addingInGroup, setAddingInGroup] = useState<TaskStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<TaskPriority>("Média");
  const [quickDueDate, setQuickDueDate] = useState<string>("");
  const [quickTag, setQuickTag] = useState<string>("geral");

  // Criação e edição inline de Subtarefas (Checklists)
  const [addingSubtaskForId, setAddingSubtaskForId] = useState<string | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskKey, setEditingSubtaskKey] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");

  function toggleGroup(status: TaskStatus) {
    setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
  }

  function toggleExpandTask(taskId: string) {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  }

  // ---------------------------------------------------------------------------
  // Seleção em Lote (Multi-select)
  // ---------------------------------------------------------------------------
  function toggleSelectTask(taskId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function toggleSelectGroup(groupTasks: Task[]) {
    const allSelected =
      groupTasks.length > 0 && groupTasks.every((t) => selectedIds.has(t.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const t of groupTasks) {
        if (allSelected) {
          next.delete(t.id);
        } else {
          next.add(t.id);
        }
      }
      return next;
    });
  }

  function handleBulkStatusChange(newStatus: TaskStatus) {
    for (const id of selectedIds) {
      const found = tasks.find((t) => t.id === id);
      if (found && found.status !== newStatus) {
        onUpdateTask({ ...found, status: newStatus });
      }
    }
    setSelectedIds(new Set());
  }

  function handleBulkPriorityChange(newPriority: TaskPriority) {
    for (const id of selectedIds) {
      const found = tasks.find((t) => t.id === id);
      if (found && found.priority !== newPriority) {
        onUpdateTask({ ...found, priority: newPriority });
      }
    }
    setSelectedIds(new Set());
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (
      window.confirm(
        `Deseja realmente excluir ${selectedIds.size} tarefa(s) selecionada(s)?`
      )
    ) {
      for (const id of selectedIds) {
        onDeleteTask(id);
      }
      setSelectedIds(new Set());
    }
  }

  // ---------------------------------------------------------------------------
  // Drag and Drop Inline (Reordenação e Mudança de Grupo)
  // ---------------------------------------------------------------------------
  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverGroup(null);
  }

  function handleDragOverRow(
    e: React.DragEvent,
    targetTaskId: string,
    status: TaskStatus
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverTaskId !== targetTaskId) {
      setDragOverTaskId(targetTaskId);
    }
    if (dragOverGroup !== status) {
      setDragOverGroup(status);
    }
  }

  function handleDropOnRow(
    e: React.DragEvent,
    targetTask: Task,
    targetStatus: TaskStatus
  ) {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = draggedTaskId || e.dataTransfer.getData("text/plain");
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverGroup(null);

    if (!sourceId || sourceId === targetTask.id) return;

    if (onReorderTasks) {
      onReorderTasks(sourceId, targetTask.id, targetStatus);
    } else {
      const sourceTask = tasks.find((t) => t.id === sourceId);
      if (sourceTask && sourceTask.status !== targetStatus) {
        onUpdateTask({ ...sourceTask, status: targetStatus });
      }
    }
  }

  function handleDropOnGroup(e: React.DragEvent, targetStatus: TaskStatus) {
    e.preventDefault();
    const sourceId = draggedTaskId || e.dataTransfer.getData("text/plain");
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDragOverGroup(null);

    if (!sourceId) return;

    if (onReorderTasks) {
      onReorderTasks(sourceId, null, targetStatus);
    } else {
      const sourceTask = tasks.find((t) => t.id === sourceId);
      if (sourceTask && sourceTask.status !== targetStatus) {
        onUpdateTask({ ...sourceTask, status: targetStatus });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Edição e Criação Inline de Tarefas
  // ---------------------------------------------------------------------------
  function handleStartEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  }

  function handleSaveInlineTitle(task: Task) {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdateTask({ ...task, title: trimmed });
    }
    setEditingTaskId(null);
  }

  function openQuickAdd(status: TaskStatus) {
    setAddingInGroup(status);
    setQuickTitle("");
    setQuickPriority("Média");
    setQuickDueDate("");
    setQuickTag("geral");
  }

  function handleSaveQuickAdd(e: React.FormEvent, status: TaskStatus) {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;

    onAddTask({
      title: trimmed,
      description: "",
      status,
      priority: quickPriority,
      dueDate: quickDueDate || undefined,
      tag: quickTag || "geral",
    });

    setQuickTitle("");
    setAddingInGroup(null);
  }

  // ---------------------------------------------------------------------------
  // Subtarefas (Checklists) Inline
  // ---------------------------------------------------------------------------
  function handleOpenAddSubtask(task: Task) {
    setExpandedTasks((prev) => ({ ...prev, [task.id]: true }));
    setAddingSubtaskForId(task.id);
    setNewSubtaskTitle("");
  }

  function handleSaveNewSubtask(e: React.FormEvent, task: Task) {
    e.preventDefault();
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;

    const current = task.subtasks ?? [];
    const newItem: Subtask = {
      id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: trimmed,
      completed: false,
    };
    const next = [...current, newItem];

    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }

    setNewSubtaskTitle("");
  }

  function handleToggleSubtask(task: Task, subtaskId: string) {
    const current = task.subtasks ?? [];
    const next = current.map((s) =>
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
  }

  function handleSaveSubtaskTitle(task: Task, subtaskId: string) {
    const trimmed = editingSubtaskTitle.trim();
    setEditingSubtaskKey(null);
    if (!trimmed) return;

    const current = task.subtasks ?? [];
    const next = current.map((s) =>
      s.id === subtaskId ? { ...s, title: trimmed } : s
    );
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
  }

  function handleDeleteSubtask(task: Task, subtaskId: string) {
    const current = task.subtasks ?? [];
    const next = current.filter((s) => s.id !== subtaskId);
    if (onUpdateSubtasks) {
      onUpdateSubtasks(task.id, next);
    } else {
      onUpdateTask({ ...task, subtasks: next });
    }
  }

  function handleDeleteWithConfirm(task: Task) {
    if (
      window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)
    ) {
      onDeleteTask(task.id);
    }
  }

  return (
    <div className="w-full bg-background select-none text-xs relative pb-16">
      {/* Cabeçalho Global de Colunas (Estilo ClickUp / Release Board) */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground bg-card/40 rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0 pl-6">
          <span>Tarefa</span>
        </div>
        <div className="flex items-center shrink-0">
          <span className="hidden md:inline-block w-32 text-left">
            Data de vencimento
          </span>
          <span className="w-28 text-left">Prioridade</span>
          <span className="hidden lg:inline-block w-28 text-left">
            Progresso
          </span>
          <span className="hidden sm:inline-block w-28 text-left">Status</span>
          <span className="w-8 text-right" />
        </div>
      </div>

      {/* Grupos de Status */}
      <div className="divide-y divide-border/60 border-x border-b border-border rounded-b-lg bg-card/20">
        {TABLE_GROUPS.map((status) => {
          const groupTasks = tasks.filter((t) => t.status === status);
          const isCollapsed = Boolean(collapsedGroups[status]);
          const isGroupSelected =
            groupTasks.length > 0 &&
            groupTasks.every((t) => selectedIds.has(t.id));
          const isDragOverThisGroup =
            dragOverGroup === status && !dragOverTaskId;

          const completedCount = groupTasks.filter(
            (t) => t.status === "Concluído"
          ).length;
          const totalSubtasksInGroup = groupTasks.reduce(
            (acc, t) => acc + (t.subtasks?.length ?? 0),
            0
          );
          const doneSubtasksInGroup = groupTasks.reduce(
            (acc, t) =>
              acc + (t.subtasks?.filter((s) => s.completed).length ?? 0),
            0
          );
          const groupProgressPercent =
            status === "Concluído"
              ? 100
              : totalSubtasksInGroup > 0
                ? Math.round((doneSubtasksInGroup / totalSubtasksInGroup) * 100)
                : completedCount > 0 && groupTasks.length > 0
                  ? Math.round((completedCount / groupTasks.length) * 100)
                  : 0;

          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverGroup !== status) setDragOverGroup(status);
              }}
              onDrop={(e) => handleDropOnGroup(e, status)}
              className={cn(
                "transition-colors",
                isDragOverThisGroup && "bg-secondary/40 ring-1 ring-primary/40"
              )}
            >
              {/* Cabeçalho do Grupo */}
              <div className="flex items-center justify-between px-2.5 py-2 bg-muted/20 hover:bg-muted/40 transition-colors group/header">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {/* Checkbox de selecionar grupo todo (só aparece no hover ou se selecionado) */}
                  <button
                    type="button"
                    onClick={() => toggleSelectGroup(groupTasks)}
                    className={cn(
                      "w-4 h-4 rounded-xs border flex items-center justify-center transition-all cursor-pointer shrink-0",
                      isGroupSelected
                        ? "opacity-100 bg-primary border-primary text-primary-foreground"
                        : "opacity-0 group-hover/header:opacity-100 border-muted-foreground/50 hover:border-foreground bg-background"
                    )}
                    title="Selecionar todas as tarefas deste grupo"
                    aria-label={`Selecionar todas as tarefas em ${status}`}
                  >
                    {isGroupSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleGroup(status)}
                    aria-expanded={!isCollapsed}
                    className="flex items-center gap-2 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 py-0.5"
                  >
                    <span className="text-muted-foreground hover:text-foreground">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>

                    <StatusIcon status={status} />

                    <span className="font-semibold text-xs text-foreground">
                      {status}
                    </span>

                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono px-1.5 py-0 h-4 border-border text-muted-foreground bg-background/60"
                    >
                      {groupTasks.length}{" "}
                      {groupTasks.length === 1 ? "tarefa" : "tarefas"}
                    </Badge>
                  </button>

                  {/* Botão + rápido que só aparece no hover do grupo */}
                  <button
                    type="button"
                    onClick={() => openQuickAdd(status)}
                    className="opacity-0 group-hover/header:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-all cursor-pointer"
                    title={`Adicionar tarefa em ${status}`}
                    aria-label={`Adicionar tarefa em ${status}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Barra de Progresso do Grupo (estilo Release Board Anexo 1) */}
                <div className="hidden sm:flex items-center gap-2 pr-2">
                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${groupProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Lista de Tarefas do Grupo */}
              {!isCollapsed && (
                <div className="divide-y divide-border/40">
                  {groupTasks.map((task) => {
                    const isEditing = editingTaskId === task.id;
                    const isSelected = selectedIds.has(task.id);
                    const isDragged = draggedTaskId === task.id;
                    const isDragTarget =
                      dragOverTaskId === task.id && draggedTaskId !== task.id;
                    const subtasks = task.subtasks ?? [];
                    const completedSubtasks = subtasks.filter(
                      (s) => s.completed
                    ).length;
                    const isTaskExpanded = Boolean(expandedTasks[task.id]);
                    const formattedDate = formatDateDeterministic(task.dueDate);
                    const overdue =
                      task.status !== "Concluído" &&
                      isOverdueDate(task.dueDate);

                    return (
                      <React.Fragment key={task.id}>
                        {/* Linha Principal da Tarefa */}
                        <div
                          draggable={!isEditing}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) =>
                            handleDragOverRow(e, task.id, status)
                          }
                          onDrop={(e) => handleDropOnRow(e, task, status)}
                          className={cn(
                            "flex items-center justify-between py-2 px-2.5 transition-colors group/row relative",
                            isSelected
                              ? "bg-secondary/60 hover:bg-secondary/80"
                              : "hover:bg-muted/30",
                            isDragged && "opacity-40",
                            isDragTarget && "border-t-2 border-t-primary"
                          )}
                        >
                          {/* Lado Esquerdo: Drag Handle + Checkbox + Expand Subtasks + Status + Título + Hover Actions */}
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-3">
                            {/* Alça de Drag (:::) — só aparece no hover */}
                            <span
                              className="opacity-0 group-hover/row:opacity-100 text-muted-foreground/70 hover:text-foreground cursor-grab active:cursor-grabbing transition-opacity shrink-0"
                              title="Arraste para mover ou reordenar"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>

                            {/* Checkbox de Seleção — só aparece no hover ou quando selecionado */}
                            <button
                              type="button"
                              onClick={() => toggleSelectTask(task.id)}
                              className={cn(
                                "w-4 h-4 rounded-xs border flex items-center justify-center transition-all cursor-pointer shrink-0 mr-0.5",
                                isSelected
                                  ? "opacity-100 bg-primary border-primary text-primary-foreground"
                                  : "opacity-0 group-hover/row:opacity-100 border-muted-foreground/50 hover:border-foreground bg-background"
                              )}
                              aria-label={`Selecionar tarefa ${task.title}`}
                            >
                              {isSelected && (
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              )}
                            </button>

                            {/* Seta para expandir subtarefas (se houver subtarefas) */}
                            {subtasks.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpandTask(task.id)}
                                className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                                title={
                                  isTaskExpanded
                                    ? "Recolher subtarefas"
                                    : "Expandir subtarefas"
                                }
                              >
                                {isTaskExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : (
                              <span className="w-4 shrink-0" />
                            )}

                            {/* Ícone de Status com Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="shrink-0 p-0.5 rounded hover:bg-secondary transition-colors cursor-pointer"
                                  title={`Status: ${task.status}. Clique para alterar.`}
                                >
                                  <StatusIcon status={task.status} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-40">
                                <DropdownMenuLabel className="text-xs">
                                  Alterar Status
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {TABLE_GROUPS.map((s) => (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() =>
                                      onUpdateTask({ ...task, status: s })
                                    }
                                    className={cn(
                                      "text-xs cursor-pointer",
                                      task.status === s &&
                                        "bg-secondary font-medium"
                                    )}
                                  >
                                    <StatusIcon status={s} className="mr-2" />
                                    <span>{s}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Edição Inline do Título (Estilo ClickUp: mostra Salvar/Cancelar quando ativo) */}
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <Input
                                  autoFocus
                                  value={editingTitle}
                                  onChange={(e) =>
                                    setEditingTitle(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveInlineTitle(task);
                                    } else if (e.key === "Escape") {
                                      setEditingTaskId(null);
                                    }
                                  }}
                                  className="h-7 text-xs bg-background border-ring text-foreground flex-1 max-w-md"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingTaskId(null)}
                                  className="h-6 px-2 text-[11px] cursor-pointer"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSaveInlineTitle(task)}
                                  className="h-6 px-2.5 text-[11px] cursor-pointer"
                                >
                                  Salvar ↵
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {/* Título e Código */}
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => onOpenDetails(task)}
                                      className={cn(
                                        "text-left text-xs font-medium hover:text-primary truncate cursor-pointer transition-colors",
                                        task.status === "Concluído"
                                          ? "line-through text-muted-foreground"
                                          : "text-foreground"
                                      )}
                                      title="Clique para abrir detalhes da tarefa"
                                    >
                                      {task.title}
                                    </button>

                                    {/* Contador de subtarefas (igual ao ClickUp Anexo 2) */}
                                    {subtasks.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleExpandTask(task.id)
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-secondary transition-colors cursor-pointer shrink-0"
                                        title={`${completedSubtasks}/${subtasks.length} subtarefas concluídas`}
                                      >
                                        <ListTree className="w-3 h-3" />
                                        <span>{subtasks.length}</span>
                                      </button>
                                    )}

                                    {/* Tag */}
                                    {task.tag && (
                                      <Badge
                                        variant="outline"
                                        className="hidden xl:inline-flex text-[10px] font-normal px-1.5 py-0 h-4 bg-muted/50 text-muted-foreground border-border shrink-0"
                                      >
                                        {task.tag}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground/80 leading-tight">
                                    {task.code || `IDE-${task.id.slice(-3)}`}
                                  </span>
                                </div>

                                {/* Botões Rápidos Inline que SÓ APARECEM NO HOVER (Estilo ClickUp Anexo 3: +, Tag, Lápis) */}
                                <div className="opacity-0 group-hover/row:opacity-100 flex items-center gap-1 ml-1 transition-opacity shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddSubtask(task)}
                                    className="w-6 h-6 rounded border border-border bg-background/90 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                                    title="Adicionar subtarefa"
                                    aria-label="Adicionar subtarefa"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button
                                        type="button"
                                        className="w-6 h-6 rounded border border-border bg-background/90 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                                        title="Alterar tag"
                                        aria-label="Alterar tag"
                                      >
                                        <Tag className="w-3 h-3" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="start"
                                      className="w-36"
                                    >
                                      <DropdownMenuLabel className="text-xs">
                                        Definir Tag
                                      </DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {PRESET_TAGS.map((tagOpt) => (
                                        <DropdownMenuItem
                                          key={tagOpt}
                                          onClick={() =>
                                            onUpdateTask({
                                              ...task,
                                              tag: tagOpt,
                                            })
                                          }
                                          className="text-xs cursor-pointer"
                                        >
                                          #{tagOpt}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  <button
                                    type="button"
                                    onClick={() => handleStartEditing(task)}
                                    className="w-6 h-6 rounded border border-border bg-background/90 hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                                    title="Renomear tarefa"
                                    aria-label="Renomear tarefa"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Lado Direito: Colunas Alinhadas (Data de Vencimento, Prioridade, Progresso, Status, Ações) */}
                          <div className="flex items-center shrink-0">
                            {/* Coluna: Data de Vencimento (editável inline via Popover) */}
                            <div className="hidden md:flex items-center w-32">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-secondary transition-colors cursor-pointer text-xs",
                                      overdue
                                        ? "text-destructive font-medium"
                                        : formattedDate
                                          ? "text-muted-foreground hover:text-foreground"
                                          : "text-muted-foreground/40 group-hover/row:text-muted-foreground"
                                    )}
                                    title="Definir data de vencimento"
                                  >
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    {formattedDate ? (
                                      <span className="truncate">
                                        {formattedDate}
                                      </span>
                                    ) : (
                                      <span className="opacity-0 group-hover/row:opacity-100 text-[11px]">
                                        Definir
                                      </span>
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  align="start"
                                  className="w-52 p-2.5 flex flex-col gap-2"
                                >
                                  <span className="text-[11px] font-medium text-muted-foreground">
                                    Data de vencimento
                                  </span>
                                  <Input
                                    type="date"
                                    value={
                                      task.dueDate
                                        ? task.dueDate.slice(0, 10)
                                        : ""
                                    }
                                    onChange={(e) =>
                                      onUpdateTask({
                                        ...task,
                                        dueDate: e.target.value || undefined,
                                      })
                                    }
                                    className="h-7 text-xs"
                                  />
                                  {task.dueDate && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        onUpdateTask({
                                          ...task,
                                          dueDate: undefined,
                                        })
                                      }
                                      className="h-6 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer"
                                    >
                                      Remover data
                                    </Button>
                                  )}
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* Coluna: Prioridade */}
                            <div className="flex items-center w-28">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-secondary transition-colors cursor-pointer"
                                    title={`Prioridade: ${task.priority}`}
                                  >
                                    <PriorityIcon
                                      priority={task.priority}
                                      showLabel
                                    />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-36">
                                  <DropdownMenuLabel className="text-xs">
                                    Prioridade
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {PRIORITIES.map((p) => (
                                    <DropdownMenuItem
                                      key={p}
                                      onClick={() =>
                                        onUpdateTask({ ...task, priority: p })
                                      }
                                      className={cn(
                                        "text-xs cursor-pointer",
                                        task.priority === p &&
                                          "bg-secondary font-medium"
                                      )}
                                    >
                                      <PriorityIcon priority={p} showLabel />
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Coluna: Progresso / Esforço (Estilo Release Board Anexo 1) */}
                            <div className="hidden lg:flex items-center gap-2 w-28 pr-2">
                              {subtasks.length > 0 ? (
                                <>
                                  <div className="flex gap-0.5">
                                    {subtasks.slice(0, 6).map((st) => (
                                      <span
                                        key={st.id}
                                        className={cn(
                                          "w-1.5 h-2.5 rounded-[1px]",
                                          st.completed
                                            ? "bg-primary"
                                            : "bg-muted-foreground/25"
                                        )}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-[11px] font-mono text-muted-foreground">
                                    {completedSubtasks}/{subtasks.length}
                                  </span>
                                </>
                              ) : task.estimate ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{task.estimate}</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30 text-[11px]">
                                  —
                                </span>
                              )}
                            </div>

                            {/* Coluna: Pill de Status (Estilo ClickUp Anexo 2) */}
                            <div className="hidden sm:flex items-center w-28">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide border transition-colors cursor-pointer",
                                      task.status === "Concluído"
                                        ? "bg-primary/15 text-primary border-primary/30"
                                        : task.status === "Em Andamento"
                                          ? "bg-secondary text-secondary-foreground border-border"
                                          : "bg-muted/50 text-muted-foreground border-border"
                                    )}
                                  >
                                    <StatusIcon
                                      status={task.status}
                                      className="w-3 h-3"
                                    />
                                    <span className="truncate">
                                      {task.status}
                                    </span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuLabel className="text-xs">
                                    Mudar Status
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {TABLE_GROUPS.map((s) => (
                                    <DropdownMenuItem
                                      key={s}
                                      onClick={() =>
                                        onUpdateTask({ ...task, status: s })
                                      }
                                      className="text-xs cursor-pointer"
                                    >
                                      <StatusIcon status={s} className="mr-2" />
                                      <span>{s}</span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Menu de Ações (...) — só aparece no hover */}
                            <div className="w-8 flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="opacity-0 group-hover/row:opacity-100 focus:opacity-100 p-1 text-muted-foreground hover:text-foreground rounded hover:bg-secondary transition-opacity cursor-pointer"
                                    aria-label={`Mais ações para ${task.title}`}
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem
                                    onClick={() => onOpenDetails(task)}
                                    className="text-xs cursor-pointer"
                                  >
                                    Abrir detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleStartEditing(task)}
                                    className="text-xs cursor-pointer"
                                  >
                                    Renomear inline
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleOpenAddSubtask(task)}
                                    className="text-xs cursor-pointer"
                                  >
                                    Adicionar subtarefa
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeleteWithConfirm(task)
                                    }
                                    className="text-xs text-destructive focus:text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    <span>Excluir</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>

                        {/* Subtarefas Expandidas Inline + Barra de Nova Subtarefa */}
                        {(isTaskExpanded || addingSubtaskForId === task.id) && (
                          <div className="bg-muted/10 divide-y divide-border/30">
                            {subtasks.map((st) => {
                              const editKey = `${task.id}:${st.id}`;
                              const isEditingSub =
                                editingSubtaskKey === editKey;

                              return (
                                <div
                                  key={st.id}
                                  className="flex items-center justify-between py-1.5 pl-14 pr-3 hover:bg-muted/30 transition-colors group/subrow"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <CornerDownRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleSubtask(task, st.id)
                                      }
                                      className="p-0.5 rounded hover:bg-secondary transition-colors cursor-pointer shrink-0"
                                      title={
                                        st.completed
                                          ? "Marcar como pendente"
                                          : "Concluir subtarefa"
                                      }
                                    >
                                      {st.completed ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                                      ) : (
                                        <CircleDashed className="w-3.5 h-3.5 text-muted-foreground" />
                                      )}
                                    </button>

                                    {isEditingSub ? (
                                      <div className="flex items-center gap-1.5 flex-1 max-w-md">
                                        <Input
                                          autoFocus
                                          value={editingSubtaskTitle}
                                          onChange={(e) =>
                                            setEditingSubtaskTitle(
                                              e.target.value
                                            )
                                          }
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleSaveSubtaskTitle(
                                                task,
                                                st.id
                                              );
                                            } else if (e.key === "Escape") {
                                              setEditingSubtaskKey(null);
                                            }
                                          }}
                                          className="h-6 text-xs bg-background"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setEditingSubtaskKey(null)
                                          }
                                          className="h-6 px-2 text-[10px] cursor-pointer"
                                        >
                                          Cancelar
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() =>
                                            handleSaveSubtaskTitle(task, st.id)
                                          }
                                          className="h-6 px-2 text-[10px] cursor-pointer"
                                        >
                                          Salvar ↵
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span
                                          onClick={() => {
                                            setEditingSubtaskKey(editKey);
                                            setEditingSubtaskTitle(st.title);
                                          }}
                                          className={cn(
                                            "text-xs truncate cursor-text",
                                            st.completed
                                              ? "line-through text-muted-foreground"
                                              : "text-foreground"
                                          )}
                                        >
                                          {st.title}
                                        </span>

                                        {/* Ações que só aparecem no hover da subtarefa */}
                                        <div className="opacity-0 group-hover/subrow:opacity-100 flex items-center gap-1 transition-opacity">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingSubtaskKey(editKey);
                                              setEditingSubtaskTitle(st.title);
                                            }}
                                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                                            title="Renomear subtarefa"
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteSubtask(task, st.id)
                                            }
                                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive cursor-pointer"
                                            title="Excluir subtarefa"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="hidden sm:flex items-center w-28 mr-8">
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] uppercase border-border text-muted-foreground"
                                    >
                                      {st.completed ? "Concluído" : "Pendente"}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}

                            {/* Linha de Criação Inline de Subtarefa (Estilo ClickUp Anexo 2/3) */}
                            {addingSubtaskForId === task.id && (
                              <form
                                onSubmit={(e) => handleSaveNewSubtask(e, task)}
                                className="flex items-center justify-between gap-2 py-2 pl-14 pr-3 bg-secondary/30"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <CircleDashed className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Nome da subtarefa..."
                                    value={newSubtaskTitle}
                                    onChange={(e) =>
                                      setNewSubtaskTitle(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Escape") {
                                        setAddingSubtaskForId(null);
                                      }
                                    }}
                                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAddingSubtaskForId(null)}
                                    className="h-6 px-2.5 text-[11px] cursor-pointer"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    type="submit"
                                    size="sm"
                                    className="h-6 px-3 text-[11px] cursor-pointer"
                                  >
                                    Salvar ↵
                                  </Button>
                                </div>
                              </form>
                            )}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {/* Barra de Criação Inline de Tarefa no Grupo (Estilo ClickUp Anexo 2 & 3) */}
                  {addingInGroup === status ? (
                    <form
                      onSubmit={(e) => handleSaveQuickAdd(e, status)}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 py-2 px-3 bg-secondary/30 border-l-2 border-l-primary"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-[200px] pl-6">
                        <StatusIcon status={status} />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Nome da Tarefa..."
                          value={quickTitle}
                          onChange={(e) => setQuickTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setAddingInGroup(null);
                          }}
                          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                      </div>

                      {/* Controles Inline do ClickUp (Data, Prioridade, Tag + Cancelar / Salvar ↵) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Seletor Rápido de Data */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "h-6 px-1.5 rounded border border-border bg-background hover:bg-secondary flex items-center gap-1 text-[11px] transition-colors cursor-pointer",
                                quickDueDate
                                  ? "text-primary font-medium"
                                  : "text-muted-foreground"
                              )}
                              title="Definir prazo"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              {quickDueDate && (
                                <span>{quickDueDate.slice(5)}</span>
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-48 p-2">
                            <Input
                              type="date"
                              value={quickDueDate}
                              onChange={(e) => setQuickDueDate(e.target.value)}
                              className="h-7 text-xs"
                            />
                          </PopoverContent>
                        </Popover>

                        {/* Seletor Rápido de Prioridade */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="h-6 px-1.5 rounded border border-border bg-background hover:bg-secondary flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title={`Prioridade: ${quickPriority}`}
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">
                                {quickPriority}
                              </span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            {PRIORITIES.map((p) => (
                              <DropdownMenuItem
                                key={p}
                                onClick={() => setQuickPriority(p)}
                                className="text-xs cursor-pointer"
                              >
                                <PriorityIcon priority={p} showLabel />
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Seletor Rápido de Tag */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="h-6 px-1.5 rounded border border-border bg-background hover:bg-secondary flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title={`Tag: ${quickTag}`}
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            {PRESET_TAGS.map((t) => (
                              <DropdownMenuItem
                                key={t}
                                onClick={() => setQuickTag(t)}
                                className="text-xs cursor-pointer"
                              >
                                #{t}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setAddingInGroup(null)}
                          className="h-6 px-2.5 text-[11px] cursor-pointer"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          className="h-6 px-3 text-[11px] cursor-pointer"
                        >
                          Salvar ↵
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openQuickAdd(status)}
                      className="w-full text-left py-2 pl-9 pr-3 text-xs text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar tarefa</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barra Flutuante de Ações em Lote (aparece quando 1 ou mais tarefas estão selecionadas) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Badge variant="default" className="text-xs px-2 py-0.5">
            {selectedIds.size} selecionada(s)
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
              >
                Mudar Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-40">
              {TABLE_GROUPS.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleBulkStatusChange(s)}
                  className="text-xs cursor-pointer"
                >
                  <StatusIcon status={s} className="mr-2" />
                  <span>{s}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs cursor-pointer"
              >
                Prioridade
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-36">
              {PRIORITIES.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => handleBulkPriorityChange(p)}
                  className="text-xs cursor-pointer"
                >
                  <PriorityIcon priority={p} showLabel />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            className="h-7 text-xs gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </Button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
            title="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
