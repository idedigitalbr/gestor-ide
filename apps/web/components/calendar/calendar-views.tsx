"use client";

import {
  Calendar,
  CheckSquare2,
  Clock,
  Plus,
  Repeat,
  Users,
} from "lucide-react";
import type { CrmCalendarEvent, CrmCalendarTaskItem } from "@gestor-ide/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  doesSpanIncludeDay,
  listDateKeys,
  localDateKey,
  type CalendarDaySpan,
} from "@/lib/calendar-date";
import {
  CALENDAR_EVENT_PRIORITY_LABELS,
  CALENDAR_EVENT_STATUS_LABELS,
  CALENDAR_EVENT_TYPE_LABELS,
} from "@/lib/calendar-labels";
import { cn } from "@/lib/utils";

export interface CalendarEntry {
  kind: "event" | "task";
  key: string;
  title: string;
  sortDate: string;
  span: CalendarDaySpan;
  event?: CrmCalendarEvent;
  task?: CrmCalendarTaskItem;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getEntryChipClasses(entry: CalendarEntry): string {
  if (entry.kind === "task") {
    return "border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground";
  }
  const event = entry.event;
  if (!event) return "border-border bg-card text-foreground";
  const cancelled = event.status === "CANCELLED";
  const typeTone =
    event.type === "MEETING"
      ? "border-primary/35 bg-primary/10 text-foreground hover:bg-primary/15"
      : event.type === "DELIVERY"
        ? "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
        : "border-border bg-accent text-accent-foreground hover:bg-accent/80";
  return cn(typeTone, cancelled && "opacity-60 line-through");
}

function getEntryShortTime(entry: CalendarEntry): string | null {
  if (entry.kind === "task") return null;
  const event = entry.event;
  if (!event) return null;
  if (event.isAllDay) return "Dia inteiro";
  if (!event.startsAt) return null;
  const parsed = new Date(event.startsAt);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function EntryPillButton({
  entry,
  onSelectEvent,
  onSelectTask,
}: {
  entry: CalendarEntry;
  onSelectEvent: (event: CrmCalendarEvent) => void;
  onSelectTask: (task: CrmCalendarTaskItem) => void;
}) {
  const shortTime = getEntryShortTime(entry);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (entry.event) onSelectEvent(entry.event);
        else if (entry.task) onSelectTask(entry.task);
      }}
      className={cn(
        "flex w-full items-center gap-1 rounded border px-1.5 py-0.5 text-left text-[11px] leading-tight transition-colors cursor-pointer",
        getEntryChipClasses(entry)
      )}
      title={entry.title}
    >
      {entry.kind === "task" ? (
        <CheckSquare2 className="h-3 w-3 shrink-0 opacity-75" />
      ) : entry.event?.recurrenceRule ? (
        <Repeat className="h-3 w-3 shrink-0 opacity-75" />
      ) : null}
      {shortTime && shortTime !== "Dia inteiro" && (
        <span className="shrink-0 font-medium tabular-nums opacity-80">{shortTime}</span>
      )}
      <span className="truncate font-medium">{entry.title}</span>
    </button>
  );
}

export function CalendarMonthGrid({
  anchorDate,
  gridStartKey,
  entries,
  canCreate,
  onCreateForDay,
  onSelectEvent,
  onSelectTask,
  onOpenDay,
}: {
  anchorDate: Date;
  gridStartKey: string;
  entries: CalendarEntry[];
  canCreate: boolean;
  onCreateForDay: (dayKey: string) => void;
  onSelectEvent: (event: CrmCalendarEvent) => void;
  onSelectTask: (task: CrmCalendarTaskItem) => void;
  onOpenDay: (dayKey: string) => void;
}) {
  const dayKeys = listDateKeys(gridStartKey, 42);
  const activeMonthPrefix = `${anchorDate.getFullYear()}-${String(
    anchorDate.getMonth() + 1
  ).padStart(2, "0")}`;
  const todayKey = localDateKey(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dayKeys.map((dayKey) => {
          const inCurrentMonth = dayKey.slice(0, 7) === activeMonthPrefix;
          const isToday = dayKey === todayKey;
          const dayEntries = entries.filter((entry) => doesSpanIncludeDay(entry.span, dayKey));
          const visibleEntries = dayEntries.slice(0, 3);
          const overflowCount = dayEntries.length - visibleEntries.length;

          return (
            <div
              key={dayKey}
              onClick={() => {
                if (canCreate) onCreateForDay(dayKey);
              }}
              className={cn(
                "group min-h-28 border-b border-r border-border p-1.5 transition-colors [&:nth-child(7n)]:border-r-0 [&:nth-last-child(-n+7)]:border-b-0",
                inCurrentMonth ? "bg-card" : "bg-muted/25 text-muted-foreground",
                canCreate && "cursor-pointer hover:bg-muted/30"
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDay(dayKey);
                  }}
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums transition-colors hover:bg-accent cursor-pointer",
                    isToday &&
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isToday && !inCurrentMonth && "text-muted-foreground"
                  )}
                  title={`Ver dia ${dayKey}`}
                >
                  {Number(dayKey.slice(8, 10))}
                </button>

                {canCreate && (
                  <button
                    type="button"
                    aria-label={`Novo evento em ${dayKey}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateForDay(dayKey);
                    }}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {visibleEntries.map((entry) => (
                  <EntryPillButton
                    key={`${dayKey}-${entry.key}`}
                    entry={entry}
                    onSelectEvent={onSelectEvent}
                    onSelectTask={onSelectTask}
                  />
                ))}
                {overflowCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDay(dayKey);
                    }}
                    className="w-full rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    +{overflowCount} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarWeekGrid({
  gridStartKey,
  entries,
  canCreate,
  onCreateForDay,
  onSelectEvent,
  onSelectTask,
  onOpenDay,
}: {
  gridStartKey: string;
  entries: CalendarEntry[];
  canCreate: boolean;
  onCreateForDay: (dayKey: string) => void;
  onSelectEvent: (event: CrmCalendarEvent) => void;
  onSelectTask: (task: CrmCalendarTaskItem) => void;
  onOpenDay: (dayKey: string) => void;
}) {
  const dayKeys = listDateKeys(gridStartKey, 7);
  const todayKey = localDateKey(new Date());

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
      {dayKeys.map((dayKey) => {
        const dayDate = new Date(`${dayKey}T12:00:00`);
        const isToday = dayKey === todayKey;
        const dayEntries = entries.filter((entry) => doesSpanIncludeDay(entry.span, dayKey));

        return (
          <div
            key={dayKey}
            className={cn(
              "flex min-h-56 flex-col rounded-xl border border-border bg-card p-2.5",
              isToday && "border-primary/50"
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-1 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => onOpenDay(dayKey)}
                className="flex items-center gap-1.5 text-left hover:opacity-80 cursor-pointer"
              >
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {dayDate.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </span>
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}
                >
                  {dayDate.getDate()}
                </span>
              </button>
              {canCreate && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  aria-label={`Novo evento em ${dayKey}`}
                  onClick={() => onCreateForDay(dayKey)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {dayEntries.length === 0 ? (
              <p className="py-4 text-center text-[11px] text-muted-foreground">Livre</p>
            ) : (
              <div className="space-y-1.5">
                {dayEntries.map((entry) => (
                  <EntryPillButton
                    key={`${dayKey}-${entry.key}`}
                    entry={entry}
                    onSelectEvent={onSelectEvent}
                    onSelectTask={onSelectTask}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CalendarDaySchedule({
  anchorDate,
  entries,
  canCreate,
  onCreateForDay,
  onSelectEvent,
  onSelectTask,
  onEditEvent,
}: {
  anchorDate: Date;
  entries: CalendarEntry[];
  canCreate: boolean;
  onCreateForDay: (dayKey: string) => void;
  onSelectEvent: (event: CrmCalendarEvent) => void;
  onSelectTask: (task: CrmCalendarTaskItem) => void;
  onEditEvent: (event: CrmCalendarEvent) => void;
}) {
  const dayKey = localDateKey(anchorDate);
  const dayEntries = entries.filter((entry) => doesSpanIncludeDay(entry.span, dayKey));
  const allDayAndTasks = dayEntries.filter(
    (entry) => entry.kind === "task" || entry.event?.isAllDay
  );
  const timedEvents = dayEntries.filter(
    (entry) => entry.kind === "event" && !entry.event?.isAllDay
  );

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold [&::first-letter]:uppercase">
            {anchorDate.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {dayEntries.length === 0
              ? "Nenhum compromisso ou tarefa para este dia."
              : `${dayEntries.length} item${dayEntries.length === 1 ? "" : "s"} programado${dayEntries.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {canCreate && (
          <Button type="button" size="sm" onClick={() => onCreateForDay(dayKey)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Novo evento neste dia
          </Button>
        )}
      </div>

      {dayEntries.length > 0 && (
        <div className="space-y-5">
          {allDayAndTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Dia inteiro e tarefas
              </h4>
              <div className="space-y-2">
                {allDayAndTasks.map((entry) => (
                  <div
                    key={entry.key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        entry.event
                          ? onSelectEvent(entry.event)
                          : entry.task && onSelectTask(entry.task)
                      }
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left hover:opacity-80 cursor-pointer"
                    >
                      <Badge variant={entry.kind === "task" ? "secondary" : "outline"}>
                        {entry.kind === "task"
                          ? "Tarefa"
                          : entry.event
                            ? CALENDAR_EVENT_TYPE_LABELS[entry.event.type]
                            : "Dia inteiro"}
                      </Badge>
                      <span className="truncate font-medium">{entry.title}</span>
                      {(entry.event?.project ?? entry.task?.project) && (
                        <Badge variant="subtle">
                          {(entry.event?.project ?? entry.task?.project)?.name}
                        </Badge>
                      )}
                    </button>

                    {entry.event && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditEvent(entry.event!)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {timedEvents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Compromissos por horário
              </h4>
              <div className="space-y-2">
                {timedEvents.map((entry) => {
                  const ev = entry.event!;
                  const startLabel = ev.startsAt
                    ? new Date(ev.startsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  const endLabel = ev.endsAt
                    ? new Date(ev.endsAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  return (
                    <div
                      key={entry.key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 text-left hover:opacity-80 cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
                          <Clock className="h-3 w-3" />
                          {startLabel}
                          {endLabel ? ` – ${endLabel}` : ""}
                        </span>
                        <span className="truncate font-medium">{ev.title}</span>
                        <Badge variant="outline">{CALENDAR_EVENT_TYPE_LABELS[ev.type]}</Badge>
                        {ev.project && <Badge variant="subtle">{ev.project.name}</Badge>}
                        {ev.participants.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {ev.participants.length}
                          </span>
                        )}
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => onEditEvent(ev)}>
                        Editar
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CalendarAgendaList({
  entries,
  fallback,
  onSelectEvent,
  onSelectTask,
  onEditEvent,
}: {
  entries: CalendarEntry[];
  fallback: boolean;
  onSelectEvent: (event: CrmCalendarEvent) => void;
  onSelectTask: (task: CrmCalendarTaskItem) => void;
  onEditEvent: (event: CrmCalendarEvent) => void;
}) {
  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {fallback
          ? "Nenhuma tarefa com prazo ou início neste mês."
          : "Nenhum evento ou tarefa neste período."}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {entries.map((entry) => {
        const isTimedEvent = Boolean(
          entry.event && !entry.event.isAllDay && entry.sortDate.includes("T")
        );
        const parsedDate = isTimedEvent
          ? new Date(entry.sortDate)
          : new Date(`${entry.span.startKey}T12:00:00`);
        const formattedDate = Number.isFinite(parsedDate.getTime())
          ? parsedDate.toLocaleDateString("pt-BR")
          : entry.sortDate;
        const formattedTime =
          isTimedEvent && Number.isFinite(parsedDate.getTime())
            ? parsedDate.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : entry.event?.isAllDay
              ? "Dia inteiro"
              : null;
        const project = entry.event?.project ?? entry.task?.project;

        return (
          <div
            key={entry.key}
            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
          >
            <button
              type="button"
              onClick={() =>
                entry.event
                  ? onSelectEvent(entry.event)
                  : entry.task && onSelectTask(entry.task)
              }
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 text-left hover:opacity-80 cursor-pointer"
            >
              <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground tabular-nums">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
                {formattedTime ? ` · ${formattedTime}` : ""}
              </span>
              <span className="truncate font-medium">{entry.title}</span>
              <Badge variant={entry.kind === "task" ? "secondary" : "outline"}>
                {entry.kind === "task"
                  ? "Tarefa"
                  : entry.event
                    ? CALENDAR_EVENT_TYPE_LABELS[entry.event.type]
                    : "Evento"}
              </Badge>
              {entry.event && entry.event.status !== "CONFIRMED" && (
                <Badge
                  variant={entry.event.status === "CANCELLED" ? "destructive" : "subtle"}
                >
                  {CALENDAR_EVENT_STATUS_LABELS[entry.event.status]}
                </Badge>
              )}
              {entry.event && entry.event.priority === "HIGH" && (
                <Badge variant="destructive">
                  {CALENDAR_EVENT_PRIORITY_LABELS[entry.event.priority]}
                </Badge>
              )}
              {project && <Badge variant="subtle">{project.name}</Badge>}
              {entry.event?.recurrenceRule && (
                <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>

            {entry.event && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditEvent(entry.event!)}
              >
                Editar
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
