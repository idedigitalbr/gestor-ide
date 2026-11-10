"use client";

import React, { useState } from "react";
import type { Task, TaskStatus } from "@/types/task";
import { StatusIcon } from "../task-status-icon";
import { PriorityIcon } from "../task-priority-icon";
import { formatDateDeterministic } from "@/lib/initial-data";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TaskTableProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onAddTask: (taskData: Omit<Task, "id" | "createdAt" | "code"> & { code?: string }) => void;
}

const TABLE_GROUPS: TaskStatus[] = ["A Fazer", "Em Andamento", "Em Revisão", "Concluído"];

export function TaskTable({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onOpenDetails,
  onAddTask,
}: TaskTableProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [addingInGroup, setAddingInGroup] = useState<TaskStatus | null>(null);
  const [quickTitle, setQuickTitle] = useState("");

  function toggleGroup(status: TaskStatus) {
    setCollapsedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
  }

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

  function handleInlineKeyDown(e: React.KeyboardEvent, task: Task) {
    if (e.key === "Enter") {
      handleSaveInlineTitle(task);
    } else if (e.key === "Escape") {
      setEditingTaskId(null);
    }
  }

  function handleSaveQuickAdd(e: React.FormEvent, status: TaskStatus) {
    e.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed) return;

    // Code and ID are generated centrally by TaskApp
    onAddTask({
      title: trimmed,
      description: "",
      status,
      priority: "Média",
      tag: "geral",
    });

    setQuickTitle("");
    setAddingInGroup(null);
  }

  function handleDeleteWithConfirm(task: Task) {
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) {
      onDeleteTask(task.id);
    }
  }

  return (
    <div className="w-full bg-background select-none text-xs">
      {/* Table Global Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle text-xs font-semibold text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Título da Tarefa</span>
        </div>
        <div className="flex items-center gap-10 pr-4">
          <span className="hidden sm:inline">Prazo</span>
          <span>Prioridade</span>
        </div>
      </div>

      {/* Status Groups */}
      <div className="divide-y divide-border-subtle">
        {TABLE_GROUPS.map((status) => {
          const groupTasks = tasks.filter((t) => t.status === status);
          const isCollapsed = Boolean(collapsedGroups[status]);

          return (
            <div key={status} className="py-1">
              {/* Group Header Row */}
              <div className="flex items-center justify-between px-2 py-1.5 hover:bg-surface-subtle rounded transition-colors group">
                <button
                  type="button"
                  onClick={() => toggleGroup(status)}
                  aria-expanded={!isCollapsed}
                  className="flex items-center gap-2 flex-1 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1 py-0.5"
                >
                  <span className="p-0.5 text-muted-foreground hover:text-foreground">
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

                  <span className="text-xs font-mono font-medium text-muted-foreground">
                    {groupTasks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddingInGroup(status);
                    setQuickTitle("");
                  }}
                  className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 p-1 text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  title={`Adicionar tarefa em ${status}`}
                  aria-label={`Adicionar tarefa em ${status}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Group Items */}
              {!isCollapsed && (
                <div className="pl-6 divide-y divide-border-subtle/40">
                  {groupTasks.map((task) => {
                    const isEditing = editingTaskId === task.id;
                    const formattedDate = formatDateDeterministic(task.dueDate);

                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between py-2 px-2 hover:bg-surface-subtle rounded transition-colors group/row"
                      >
                        {/* Left: Status Icon + Title */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="shrink-0 p-0.5 rounded hover:bg-surface-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                title={`Status: ${task.status}. Clique para alterar.`}
                                aria-label={`Alterar status da tarefa ${task.title}`}
                              >
                                <StatusIcon status={task.status} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-36">
                              <DropdownMenuLabel>Mudar Status</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {TABLE_GROUPS.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => onUpdateTask({ ...task, status: s })}
                                  className={cn(
                                    task.status === s && "text-foreground font-medium bg-surface-active"
                                  )}
                                >
                                  <StatusIcon status={s} className="mr-2" />
                                  <span>{s}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Code */}
                          <span className="text-xs font-mono font-medium text-muted-foreground shrink-0">
                            {task.code || `PLAN-${task.id.slice(-3)}`}
                          </span>

                          {/* Title (editable on click or Enter/Space) */}
                          {isEditing ? (
                            <Input
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => handleSaveInlineTitle(task)}
                              onKeyDown={(e) => handleInlineKeyDown(e, task)}
                              className="h-6 text-xs bg-background border-border text-foreground max-w-md"
                              aria-label="Editar título da tarefa"
                            />
                          ) : (
                            <div className="flex items-center gap-2 truncate">
                              <button
                                type="button"
                                onClick={() => handleStartEditing(task)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleStartEditing(task);
                                  }
                                }}
                                className="text-left text-xs font-medium text-foreground hover:text-primary truncate cursor-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded px-1"
                                title="Clique ou pressione Enter para editar"
                                aria-label={`Editar título: ${task.title}`}
                              >
                                {task.title}
                              </button>
                              {task.tag && (
                                <Badge
                                  variant="subtle"
                                  className="hidden md:inline-block text-[11px] font-medium px-1.5 py-0 bg-muted text-muted-foreground border-border"
                                >
                                  {task.tag}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: Date + Priority + Actions */}
                        <div className="flex items-center gap-6 shrink-0">
                          {/* Date */}
                          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground w-20 justify-end">
                            {formattedDate ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-text-icon" />
                                <span>{formattedDate}</span>
                              </>
                            ) : (
                              <span className="text-text-icon/80">—</span>
                            )}
                          </span>

                          {/* Priority dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-surface-hover transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                aria-label={`Prioridade: ${task.priority}. Clique para alterar.`}
                              >
                                <PriorityIcon priority={task.priority} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuLabel>Prioridade</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {(["Baixa", "Média", "Alta", "Urgente"] as const).map((p) => (
                                <DropdownMenuItem
                                  key={p}
                                  onClick={() => onUpdateTask({ ...task, priority: p })}
                                  className={cn(task.priority === p && "text-foreground font-medium bg-surface-active")}
                                >
                                  <PriorityIcon priority={p} showLabel />
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Actions menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="opacity-0 group-hover/row:opacity-100 group-focus-within/row:opacity-100 focus:opacity-100 focus-visible:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                                aria-label={`Mais ações para ${task.title}`}
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem onClick={() => onOpenDetails(task)}>
                                Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteWithConfirm(task)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick add inline row inside this status */}
                  {addingInGroup === status ? (
                    <form
                      onSubmit={(e) => handleSaveQuickAdd(e, status)}
                      className="py-1.5 px-2 flex items-center gap-2"
                    >
                      <StatusIcon status={status} />
                      <Input
                        autoFocus
                        placeholder="Nome da tarefa... (Enter para salvar, Esc para cancelar)"
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setAddingInGroup(null);
                        }}
                        className="h-7 text-xs bg-sidebar border-ring max-w-md text-foreground"
                      />
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingInGroup(status);
                        setQuickTitle("");
                      }}
                      className="w-full text-left py-1.5 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
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
    </div>
  );
}
