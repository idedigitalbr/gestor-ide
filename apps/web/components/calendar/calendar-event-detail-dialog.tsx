"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  ExternalLink,
  FolderKanban,
  MapPin,
  Pencil,
  Repeat,
  Users,
  Video,
} from "lucide-react";
import type { CrmCalendarEvent, CrmCalendarTaskItem } from "@gestor-ide/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { toInclusiveAllDayEndDate } from "@/lib/calendar-date";
import {
  CALENDAR_EVENT_PRIORITY_LABELS,
  CALENDAR_EVENT_STATUS_LABELS,
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_MEETING_MODE_LABELS,
  formatCalendarRecurrenceSummary,
  formatCalendarReminderLabel,
} from "@/lib/calendar-labels";
import { stripProjectPrefix } from "@/lib/list-view-options";

function formatEventSchedule(event: CrmCalendarEvent): string {
  if (event.isAllDay && event.allDayStartDate) {
    const startKey = event.allDayStartDate.slice(0, 10);
    const endKey = toInclusiveAllDayEndDate(startKey, event.allDayEndDate);
    const startText = new Date(`${startKey}T12:00:00`).toLocaleDateString("pt-BR");
    if (endKey === startKey) return `${startText} · Dia inteiro`;
    const endText = new Date(`${endKey}T12:00:00`).toLocaleDateString("pt-BR");
    return `${startText} até ${endText} · Dia inteiro`;
  }
  if (!event.startsAt) return "Horário não definido";
  const starts = new Date(event.startsAt);
  const ends = event.endsAt ? new Date(event.endsAt) : null;
  const dateText = starts.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const startTime = starts.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = ends
    ? ends.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;
  return endTime ? `${dateText} · ${startTime} – ${endTime}` : `${dateText} · ${startTime}`;
}

export function CalendarEventDetailDialog({
  event,
  task,
  onClose,
  onEditEvent,
}: {
  event: CrmCalendarEvent | null;
  task: CrmCalendarTaskItem | null;
  onClose: () => void;
  onEditEvent: (event: CrmCalendarEvent) => void;
}) {
  const open = Boolean(event || task);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        {event && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5 pr-6">
                <Badge variant="outline">{CALENDAR_EVENT_TYPE_LABELS[event.type]}</Badge>
                <Badge
                  variant={event.status === "CANCELLED" ? "destructive" : "secondary"}
                >
                  {CALENDAR_EVENT_STATUS_LABELS[event.status]}
                </Badge>
                <Badge variant="subtle">
                  Prioridade: {CALENDAR_EVENT_PRIORITY_LABELS[event.priority]}
                </Badge>
                {event.recurrenceRule && (
                  <Badge variant="outline" className="gap-1">
                    <Repeat className="h-3 w-3" />
                    {formatCalendarRecurrenceSummary(event.recurrenceRule)}
                  </Badge>
                )}
              </div>
              <DialogTitle className="pt-1 text-lg">{event.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formatEventSchedule(event)}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {event.project && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FolderKanban className="h-4 w-4 shrink-0" />
                  <span>
                    Projeto:{" "}
                    <strong className="font-medium text-foreground">
                      {event.project.code ? `[${event.project.code}] ` : ""}
                      {stripProjectPrefix(event.project.name)}
                    </strong>
                  </span>
                </div>
              )}

              {(event.meetingMode || event.location || event.meetingUrl) && (
                <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3">
                  {event.meetingMode && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Video className="h-3.5 w-3.5 shrink-0" />
                      <span>Formato: {CALENDAR_MEETING_MODE_LABELS[event.meetingMode]}</span>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.meetingUrl && (
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-4 hover:opacity-80"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir link da reunião
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Lembrete: {formatCalendarReminderLabel(event.reminderMinutes)}</span>
              </div>

              {(event.organizer || event.participants.length > 0) && (
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <Users className="h-3.5 w-3.5 text-primary" />
                    <span>
                      Participantes ({event.participants.length}
                      {event.organizer ? " · incl. organizador" : ""})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {event.organizer && (
                      <Badge variant="secondary" className="gap-1.5 py-1">
                        <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[9px] font-semibold">
                          <MemberAvatarContent
                            name={event.organizer.name}
                            src={event.organizer.avatarUrl}
                          />
                        </span>
                        <span>{event.organizer.name ?? "Organizador"} (org.)</span>
                      </Badge>
                    )}
                    {event.participants
                      .filter((p) => p.user.id !== event.organizer?.id)
                      .map((p) => (
                        <Badge key={p.user.id} variant="outline" className="gap-1.5 py-1">
                          <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-muted text-[9px] font-semibold">
                            <MemberAvatarContent
                              name={p.user.name}
                              src={p.user.avatarUrl}
                            />
                          </span>
                          <span>{p.user.name ?? "Participante"}</span>
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {event.description && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                  <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2.5 text-xs text-foreground">
                    {event.description}
                  </p>
                </div>
              )}

              {event.notes && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Notas</p>
                  <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2.5 text-xs text-foreground">
                    {event.notes}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button
                type="button"
                className="gap-1.5"
                onClick={() => {
                  onClose();
                  onEditEvent(event);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar evento
              </Button>
            </DialogFooter>
          </>
        )}

        {task && (
          <>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5 pr-6">
                <Badge variant="secondary">Tarefa</Badge>
                {task.status && <Badge variant="outline">{task.status}</Badge>}
                {task.priority && <Badge variant="subtle">{task.priority}</Badge>}
              </div>
              <DialogTitle className="pt-1 text-lg">{task.title}</DialogTitle>
              <DialogDescription>
                {task.startDate
                  ? `Início: ${new Date(`${task.startDate.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")}`
                  : ""}
                {task.startDate && task.dueDate ? " · " : ""}
                {task.dueDate
                  ? `Prazo: ${new Date(`${task.dueDate.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")}`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              {task.project && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Projeto:{" "}
                    <strong className="font-medium text-foreground">
                      {task.project.code ? `[${task.project.code}] ` : ""}
                      {stripProjectPrefix(task.project.name)}
                    </strong>
                  </span>
                </div>
              )}

              {task.assignees && task.assignees.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Responsáveis:</span>
                  {task.assignees.map((a) => (
                    <Badge key={a.user.id} variant="outline" className="gap-1 py-0.5 text-xs">
                      <span className="flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-muted text-[9px] font-semibold">
                        <MemberAvatarContent name={a.user.name} src={a.user.avatarUrl} />
                      </span>
                      <span>{a.user.name ?? "Membro"}</span>
                    </Badge>
                  ))}
                </div>
              )}

              {task.description && (
                <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-2.5 text-xs text-foreground">
                  {task.description}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button asChild>
                <Link href="/">Abrir no quadro de tarefas</Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
