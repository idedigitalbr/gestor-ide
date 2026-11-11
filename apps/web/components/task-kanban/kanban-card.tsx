"use client";

import React from "react";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";
import { normalizeTaskStatus } from "@/types/task";
import {
  StatusIcon,
  StatusDropdownContent,
  ALL_CANONICAL_STATUSES,
} from "../task-status-icon";
import { TaskItemTypeIcon } from "../task-item-type-selector";
import { isTaskContentFilled } from "@/lib/task-item-type";
import {
  PriorityIcon,
  ALL_CANONICAL_PRIORITIES,
} from "../task-priority-icon";
import { formatDateDeterministic } from "@/lib/initial-data";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Trash2,
  Timer,
  CheckSquare,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface KanbanCardProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenDetails: (task: Task) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

const STATUS_ORDER = ALL_CANONICAL_STATUSES;
const PRIORITIES = ALL_CANONICAL_PRIORITIES;

export function KanbanCard({
  task,
  onUpdateTask,
  onDeleteTask,
  onOpenDetails,
  onDragStart,
}: KanbanCardProps) {
  const normStatus = normalizeTaskStatus(task.status);
  const currentIndex = STATUS_ORDER.indexOf(normStatus);
  const canMoveLeft = currentIndex > 0;
  const canMoveRight = currentIndex < STATUS_ORDER.length - 1;

  function moveLeft() {
    if (canMoveLeft) {
      onUpdateTask({ ...task, status: STATUS_ORDER[currentIndex - 1] });
    }
  }

  function moveRight() {
    if (canMoveRight) {
      onUpdateTask({ ...task, status: STATUS_ORDER[currentIndex + 1] });
    }
  }

  function handleSetStatus(newStatus: TaskStatus) {
    if (newStatus !== task.status) {
      onUpdateTask({ ...task, status: newStatus });
    }
  }

  function handleSetPriority(newPriority: TaskPriority) {
    if (newPriority !== task.priority) {
      onUpdateTask({ ...task, priority: newPriority });
    }
  }

  function handleDeleteFromMenu(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) {
      onDeleteTask(task.id);
    }
  }

  function handleCardKeyDown(e: React.KeyboardEvent) {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpenDetails(task);
    }
  }

  const formattedDate = formatDateDeterministic(task.dueDate);
  const totalSubtasks = task.subtasks?.length ?? 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length ?? 0;

  // Tag bullet colors (faithful to It's a Plan palette)
  function getTagBulletColor(tag?: string) {
    if (!tag) return "bg-zinc-500";
    const t = tag.toLowerCase();
    if (t.includes("front")) return "bg-emerald-500";
    if (t.includes("tab") || t.includes("enhanc")) return "bg-purple-500";
    if (t.includes("kanban")) return "bg-amber-500";
    if (t.includes("ux")) return "bg-pink-500";
    if (t.includes("a11y") || t.includes("agent")) return "bg-slate-500";
    return "bg-neutral-500";
  }

  // Assignee initials & color (faithful to It's a Plan avatars)
  const assigneeInitials = task.tag?.includes("agent") ? "AI" : "W";
  const avatarStyle = task.tag?.includes("agent")
    ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
    : "bg-violet-500/20 text-violet-400 border-violet-500/30";

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      onClick={() => onOpenDetails(task)}
      onKeyDown={handleCardKeyDown}
      aria-label={`Ver detalhes da tarefa ${task.code || ""}: ${task.title}`}
      className="group relative bg-card text-card-foreground border border-border hover:border-ring/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-xl p-3 transition-all duration-150 cursor-grab active:cursor-grabbing hover:shadow-xs select-none"
    >
      {/* Top row: Code + Priority indicator + Quick Actions Menu */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-xs font-mono font-medium text-muted-foreground">
          {task.code || `PLAN-${task.id.slice(-3)}`}
        </span>

        <div className="flex items-center gap-1">
          <PriorityIcon priority={task.priority} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-surface-hover opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer rounded"
                aria-label={`Menu de ações rápidas da tarefa ${task.title}`}
                title="Ações rápidas"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-48 bg-card border-border shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(task);
                }}
                className="gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Abrir detalhes</span>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                  <StatusIcon status={task.status} />
                  <span>Alterar status</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-0 bg-transparent border-none shadow-none">
                  <StatusDropdownContent
                    currentStatus={task.status}
                    onSelectStatus={(st) => handleSetStatus(st)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2 cursor-pointer">
                  <PriorityIcon priority={task.priority} />
                  <span>Alterar prioridade</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-40 bg-card border-border shadow-md">
                  {PRIORITIES.map((pr) => (
                    <DropdownMenuItem
                      key={pr}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPriority(pr);
                      }}
                      className="justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <PriorityIcon priority={pr} />
                        <span>{pr}</span>
                      </span>
                      {task.priority === pr && (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="bg-border" />

              <DropdownMenuItem
                onClick={handleDeleteFromMenu}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir tarefa</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Middle row: Task Icon + Title */}
      <div className="flex items-start gap-2 mb-2">
        <span className="mt-0.5 shrink-0">
          <TaskItemTypeIcon
            type={task.itemType ?? "TASK"}
            hasContent={isTaskContentFilled(task.description)}
            size={14}
          />
        </span>
        <h4 className="text-xs font-normal text-card-foreground leading-snug line-clamp-2">
          {task.title}
        </h4>
      </div>

      {/* Meta badges: Tag, Estimate, Subtasks */}
      {(task.tag || task.estimate || totalSubtasks > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {task.tag && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border/50 inline-flex items-center gap-1.5"
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", getTagBulletColor(task.tag))} />
              <span>{task.tag}</span>
            </span>
          )}

          {task.estimate && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 font-mono"
              title={`Estimativa: ${task.estimate}`}
            >
              <Timer className="w-3 h-3 text-muted-foreground" />
              <span>{task.estimate}</span>
            </span>
          )}

          {totalSubtasks > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 font-mono"
              title={`Checklist: ${completedSubtasks} de ${totalSubtasks} concluídas`}
            >
              <CheckSquare className="w-3 h-3 text-muted-foreground" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Bottom row: Created/Due Date + Directional Steppers + Avatar */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
        <div className="flex flex-col">
          {formattedDate ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{formattedDate}</span>
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/70">Sem prazo definido</span>
          )}
        </div>

        {/* Steppers & Avatar */}
        <div className="flex items-center gap-1">
          {canMoveLeft && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                moveLeft();
              }}
              title={`Voltar para ${STATUS_ORDER[currentIndex - 1]}`}
              className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`Mover para ${STATUS_ORDER[currentIndex - 1]}`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {canMoveRight && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                moveRight();
              }}
              title={`Avançar para ${STATUS_ORDER[currentIndex + 1]}`}
              className="p-1 rounded hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label={`Mover para ${STATUS_ORDER[currentIndex + 1]}`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div
            className={cn(
              "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-semibold ml-0.5",
              avatarStyle
            )}
            title={task.tag?.includes("agent") ? "Atribuído a Agente AI" : "Atribuído a Will"}
          >
            {assigneeInitials}
          </div>
        </div>
      </div>
    </div>
  );
}
