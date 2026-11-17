"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { CheckSquare, AlertCircle, ExternalLink, Calendar as CalendarIcon } from "lucide-react";
import type { Task } from "@/types/task";
import { StatusIcon } from "@/components/task-status-icon";
import { PriorityIcon } from "@/components/task-priority-icon";
import { normalizeTaskStatus } from "@gestor-ide/core";
import { cn } from "@/lib/utils";

export interface TaskNodeData {
  taskId: string;
  task?: Task;
  onOpenTask?: (taskId: string) => void;
}

export const TaskNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = (data ?? {}) as unknown as TaskNodeData;
  const taskId = nodeData.taskId;
  const task = nodeData.task;
  const onOpenTask = nodeData.onOpenTask;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task && onOpenTask) {
      onOpenTask(task.id);
    }
  };

  if (!task) {
    return (
      <div
        className={cn(
          "group relative flex w-60 items-center gap-2.5 rounded-xl border border-destructive/40 bg-destructive/5 p-3 shadow-sm select-none",
          selected && "ring-2 ring-destructive/40 shadow-md"
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          className="!size-3 !border-2 !border-background !bg-destructive"
        />
        <AlertCircle className="size-4 shrink-0 text-destructive" />
        <div className="flex flex-col truncate">
          <span className="text-[10px] font-bold uppercase text-destructive tracking-wider">
            Tarefa indisponível
          </span>
          <span className="text-xs text-muted-foreground truncate font-mono">
            ID: {taskId}
          </span>
        </div>
        <Handle
          type="source"
          position={Position.Right}
          className="!size-3 !border-2 !border-background !bg-destructive"
        />
      </div>
    );
  }

  const normalizedStatus = normalizeTaskStatus(task.status);
  const isDone = normalizedStatus === "CONCLUÍDO";

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative w-64 rounded-xl border bg-card text-card-foreground shadow-sm transition-all select-none cursor-pointer hover:shadow-md",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/50",
        isDone && "opacity-80"
      )}
    >
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-1.5 rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="size-3.5 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tarefa CRM
          </span>
        </div>
        <div className="flex items-center gap-1">
          {task.priority && (
            <PriorityIcon priority={task.priority} />
          )}
          <ExternalLink className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 shrink-0">
            <StatusIcon status={task.status} className="size-4" />
          </div>
          <h4
            className={cn(
              "text-xs font-semibold text-foreground line-clamp-2",
              isDone && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </h4>
        </div>

        {/* Footer info */}
        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
          <span className="font-medium truncate max-w-[120px]">
            {normalizedStatus}
          </span>
          {task.dueDate && (
            <div className="flex items-center gap-1 font-mono">
              <CalendarIcon className="size-2.5" />
              <span>{task.dueDate.slice(0, 10)}</span>
            </div>
          )}
        </div>
      </div>

      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !border-2 !border-background !bg-primary transition-transform group-hover:scale-125"
      />
    </div>
  );
});

TaskNode.displayName = "TaskNode";
