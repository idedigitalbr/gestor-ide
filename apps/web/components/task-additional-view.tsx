"use client";

import React, { useMemo, useState } from "react";
import type { CrmProjectMember, Task } from "@gestor-ide/core";
import { normalizeTaskStatus } from "@gestor-ide/core";
import { AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusIcon } from "@/components/task-status-icon";
import { TaskSolidStatusBadge } from "@/components/task-table/task-solid-status-badge";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { TaskGantt } from "@/components/task-gantt/task-gantt";
import { cn } from "@/lib/utils";

function dateOf(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function keyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function isTaskOverdue(task: Task, todayKey: string): boolean {
  if (!task.dueDate) return false;
  if (normalizeTaskStatus(task.status) === "CONCLUÍDO") return false;
  return task.dueDate.slice(0, 10) < todayKey;
}

function TaskButton({
  task,
  todayKey,
  onOpen,
  onUpdateTask,
  draggable = false,
  onDragStart,
}: {
  task: Task;
  todayKey: string;
  onOpen: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}) {
  const overdue = isTaskOverdue(task, todayKey);

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => onDragStart?.(e, task.id) : undefined}
      className={cn(
        "group flex items-center justify-between gap-2 rounded-md border bg-card px-2 py-1.5 text-xs transition-colors hover:bg-accent/60",
        overdue ? "border-destructive/40" : "border-border",
        draggable && "cursor-grab active:cursor-grabbing"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xs cursor-pointer"
      >
        <StatusIcon status={task.status} className="shrink-0" />
        <span className="truncate font-medium text-foreground">{task.title}</span>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {overdue && (
          <span
            className="text-[10px] font-medium text-destructive inline-flex items-center gap-0.5"
            title="Prazo vencido"
          >
            <AlertTriangle className="w-3 h-3" />
          </span>
        )}
        {onUpdateTask && (
          <TaskSolidStatusBadge
            status={task.status}
            size="sm"
            onChangeStatus={(nextStatus) => onUpdateTask({ ...task, status: nextStatus })}
          />
        )}
      </div>
    </div>
  );
}

export function TaskAdditionalView({
  mode,
  tasks,
  allTasks,
  projectId,
  members,
  onOpen,
  onUpdateTask,
  onChangeAssignee,
  canWrite = true,
}: {
  mode: "table" | "kanban" | "calendar" | "gantt" | "workload";
  tasks: Task[];
  allTasks?: Task[];
  projectId?: string | null;
  members: CrmProjectMember[];
  onOpen: (task: Task) => void;
  onUpdateTask?: (task: Task) => void;
  onChangeAssignee?: (taskId: string, member: CrmProjectMember | null) => Promise<boolean>;
  canWrite?: boolean;
}) {
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dragOverAssigneeId, setDragOverAssigneeId] = useState<string | null>(null);
  const todayKey = keyOf(new Date());
  const undated = tasks.filter((task) => !dateOf(task.dueDate));

  const days = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  if (mode === "calendar") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold [&::first-letter]:uppercase">
              {month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </h2>
            <p className="text-xs text-muted-foreground">
              Tarefas do projeto exibidas pela data de prazo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
              }
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              Próximo
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <div className="grid min-w-[700px] grid-cols-7">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
              <div
                key={label}
                className="border-b border-border bg-muted p-2 text-center text-xs font-medium text-muted-foreground"
              >
                {label}
              </div>
            ))}
            {days.map((day) => {
              const dayKey = keyOf(day);
              const isToday = dayKey === todayKey;
              const dayTasks = tasks.filter((task) => task.dueDate?.slice(0, 10) === dayKey);
              return (
                <div
                  key={dayKey}
                  className={cn(
                    "min-h-28 space-y-1 border-b border-r border-border p-2",
                    day.getMonth() !== month.getMonth()
                      ? "bg-muted/40 text-muted-foreground"
                      : "bg-card",
                    isToday && "ring-1 ring-inset ring-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isToday && "rounded-full bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground"
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>
                  {dayTasks.map((task) => (
                    <TaskButton
                      key={task.id}
                      task={task}
                      todayKey={todayKey}
                      onOpen={onOpen}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {undated.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Sem prazo ({undated.length})</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {undated.map((task) => (
                <TaskButton
                  key={task.id}
                  task={task}
                  todayKey={todayKey}
                  onOpen={onOpen}
                  onUpdateTask={onUpdateTask}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  if (mode === "gantt") {
    return (
      <TaskGantt
        tasks={tasks}
        allTasks={allTasks}
        projectId={projectId}
        members={members}
        canWrite={canWrite}
        onOpen={onOpen}
        onUpdateTask={onUpdateTask}
        onChangeAssignee={onChangeAssignee}
      />
    );
  }

  // Workload view
  const groups = new Map<
    string,
    { id: string; name: string; avatarUrl?: string | null; member: CrmProjectMember | null; tasks: Task[] }
  >();

  for (const member of members) {
    groups.set(member.userId, {
      id: member.userId,
      name: member.user.name || member.user.email || "Responsável",
      avatarUrl: member.user.avatarUrl,
      member,
      tasks: [],
    });
  }

  groups.set("unassigned", {
    id: "unassigned",
    name: "Sem responsável",
    avatarUrl: null,
    member: null,
    tasks: [],
  });

  for (const task of tasks) {
    const ids = task.assigneeIds?.length
      ? task.assigneeIds
      : task.assigneeId
      ? [task.assigneeId]
      : [];
    if (!ids.length) {
      groups.get("unassigned")!.tasks.push(task);
    }
    for (const id of new Set(ids)) {
      const existing = groups.get(id);
      if (existing) {
        existing.tasks.push(task);
      } else {
        const matchedMember = members.find((m) => m.userId === id) ?? null;
        groups.set(id, {
          id,
          name:
            matchedMember?.user.name ||
            (id === task.assigneeId ? task.assignee : null) ||
            "Responsável",
          avatarUrl: matchedMember?.user.avatarUrl ?? task.assigneeAvatar ?? null,
          member: matchedMember,
          tasks: [task],
        });
      }
    }
  }

  const visibleGroups = Array.from(groups.values()).filter(
    (g) => g.tasks.length > 0 || (g.id !== "unassigned" && members.length > 0)
  );

  function handleWorkloadDrop(e: React.DragEvent, targetMember: CrmProjectMember | null) {
    e.preventDefault();
    setDragOverAssigneeId(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if ((task.assigneeId ?? null) === (targetMember?.userId ?? null)) return;

    if (onChangeAssignee && !task.id.startsWith("task-")) {
      void onChangeAssignee(task.id, targetMember);
    } else if (onUpdateTask) {
      onUpdateTask({
        ...task,
        assigneeId: targetMember?.userId,
        assigneeIds: targetMember ? [targetMember.userId] : [],
        assignee: targetMember?.user.name || targetMember?.user.email || undefined,
        assigneeAvatar: targetMember?.user.avatarUrl || undefined,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Carga de trabalho</h2>
          <p className="text-xs text-muted-foreground">
            Distribuição por responsável. Arraste um card para outro responsável para reatribuir.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span>{visibleGroups.length} colunas</span>
        </Badge>
      </div>

      {visibleGroups.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleGroups.map((group) => {
            const doneCount = group.tasks.filter(
              (t) => normalizeTaskStatus(t.status) === "CONCLUÍDO"
            ).length;
            const overdueCount = group.tasks.filter((t) =>
              isTaskOverdue(t, todayKey)
            ).length;
            const pct =
              group.tasks.length > 0
                ? Math.round((doneCount / group.tasks.length) * 100)
                : 0;
            const isDragTarget = dragOverAssigneeId === group.id;

            return (
              <section
                key={group.id}
                onDragOver={(e) => {
                  if (!onChangeAssignee && !onUpdateTask) return;
                  e.preventDefault();
                  if (dragOverAssigneeId !== group.id) {
                    setDragOverAssigneeId(group.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverAssigneeId(null);
                  }
                }}
                onDrop={(e) => handleWorkloadDrop(e, group.member)}
                className={cn(
                  "space-y-2.5 rounded-xl border bg-card p-3 transition-colors",
                  isDragTarget ? "border-primary bg-primary/5 ring-1 ring-primary/40" : "border-border"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center text-[10px] font-semibold shrink-0">
                      {group.id === "unassigned" ? (
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <MemberAvatarContent
                          name={group.name}
                          src={group.avatarUrl}
                          initialsLength={2}
                        />
                      )}
                    </div>
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {group.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {overdueCount > 0 && (
                      <Badge variant="destructive" className="text-[10px] px-1.5">
                        {overdueCount} atras.
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[11px]">
                      {group.tasks.length} {group.tasks.length === 1 ? "tarefa" : "tarefas"}
                    </Badge>
                  </div>
                </div>

                {group.tasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>
                          {doneCount}/{group.tasks.length} concluídas
                        </span>
                      </span>
                      <span className="font-mono">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  {group.tasks.length > 0 ? (
                    group.tasks.map((task) => (
                      <TaskButton
                        key={task.id}
                        task={task}
                        todayKey={todayKey}
                        onOpen={onOpen}
                        onUpdateTask={onUpdateTask}
                        draggable={Boolean(onChangeAssignee || onUpdateTask)}
                        onDragStart={(e, id) => {
                          e.dataTransfer.setData("text/plain", id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                      />
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border py-4 text-center text-[11px] text-muted-foreground">
                      Nenhuma tarefa atribuída
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada neste filtro.</p>
      )}
    </div>
  );
}
