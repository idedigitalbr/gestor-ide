"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Clock,
  Loader2,
  MapPin,
  Repeat,
  Search,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import type {
  CrmCalendarAvailabilityResult,
  CrmCalendarEvent,
  CrmCalendarEventPriority,
  CrmCalendarEventStatus,
  CrmCalendarEventType,
  CrmCalendarMeetingMode,
  CrmCalendarMutationScope,
  CrmCalendarPerson,
  CrmCalendarRecurrenceFrequency,
  CrmCalendarSuggestedSlot,
  CrmProject,
} from "@gestor-ide/core";
import { IdeCrmApiError, ideCrmClient } from "@gestor-ide/sdk";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import {
  toExclusiveAllDayEndDate,
  toInclusiveAllDayEndDate,
} from "@/lib/calendar-date";
import {
  CALENDAR_EVENT_PRIORITY_LABELS,
  CALENDAR_EVENT_STATUS_LABELS,
  CALENDAR_EVENT_TYPE_LABELS,
  CALENDAR_MEETING_MODE_LABELS,
  CALENDAR_MUTATION_SCOPE_LABELS,
  CALENDAR_RECURRENCE_LABELS,
  CALENDAR_REMINDER_OPTIONS,
} from "@/lib/calendar-labels";
import { cn } from "@/lib/utils";

const PERSONAL_PROJECT_VALUE = "__personal__";
const NONE_VALUE = "NONE";

function localDateTimeInput(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function localDateInput(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatConflictWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (!Number.isFinite(+start) || !Number.isFinite(+end)) return "";
  const sameDay = start.toDateString() === end.toDateString();
  const sDate = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const sTime = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const eTime = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `${sDate} ${sTime}–${eTime}` : `${sDate} ${sTime}`;
}

export function CalendarEventDialog({
  event,
  initialDate = null,
  defaultProjectId = null,
  projects = [],
  open,
  onOpenChange,
  onSaved,
}: {
  event: CrmCalendarEvent | null;
  initialDate?: string | null;
  defaultProjectId?: string | null;
  projects?: CrmProject[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CrmCalendarEventType>("MEETING");
  const [status, setStatus] = useState<CrmCalendarEventStatus>("CONFIRMED");
  const [priority, setPriority] = useState<CrmCalendarEventPriority>("MEDIUM");
  const [projectId, setProjectId] = useState<string>("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDayStart, setAllDayStart] = useState("");
  const [allDayEnd, setAllDayEnd] = useState("");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<
    CrmCalendarRecurrenceFrequency | typeof NONE_VALUE
  >(NONE_VALUE);
  const [recurrenceInterval, setRecurrenceInterval] = useState("1");
  const [recurrenceCount, setRecurrenceCount] = useState("4");
  const [scope, setScope] = useState<CrmCalendarMutationScope>("OCCURRENCE");
  const [deleteScope, setDeleteScope] = useState<CrmCalendarMutationScope>("OCCURRENCE");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [availableParticipants, setAvailableParticipants] = useState<CrmCalendarPerson[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, CrmCalendarAvailabilityResult>
  >({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [suggestedSlots, setSuggestedSlots] = useState<CrmCalendarSuggestedSlot[]>([]);
  const [suggestingSlots, setSuggestingSlots] = useState(false);
  const [suggestionHint, setSuggestionHint] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState<string>(NONE_VALUE);
  const [meetingMode, setMeetingMode] = useState<CrmCalendarMeetingMode | typeof NONE_VALUE>(
    NONE_VALUE
  );
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isRecurringEdit = Boolean(event?.seriesId);
  const isOccurrenceLocked = isRecurringEdit && scope === "OCCURRENCE";

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const fallbackStart = initialDate
        ? new Date(`${initialDate}T09:00:00`)
        : new Date();
      const initial = event?.startsAt ? new Date(event.startsAt) : fallbackStart;
      const initialEnd = event?.endsAt
        ? new Date(event.endsAt)
        : new Date(initial.getTime() + 3_600_000);
      const allDayFlag = Boolean(event?.isAllDay);
      const startDay =
        event?.allDayStartDate?.slice(0, 10) ||
        initialDate ||
        (event?.startsAt ? localDateInput(initial) : localDateInput(new Date()));
      const endDay = event?.isAllDay
        ? toInclusiveAllDayEndDate(startDay, event.allDayEndDate)
        : startDay;

      setTitle(event?.title ?? "");
      setType(event?.type ?? "MEETING");
      setStatus(event?.status ?? "CONFIRMED");
      setPriority(event?.priority ?? "MEDIUM");
      setProjectId(event ? event.projectId ?? "" : defaultProjectId ?? "");
      setIsAllDay(allDayFlag);
      setStart(localDateTimeInput(initial));
      setEnd(localDateTimeInput(initialEnd));
      setAllDayStart(startDay);
      setAllDayEnd(endDay);
      setRecurrenceFrequency(event?.recurrenceRule?.frequency ?? NONE_VALUE);
      setRecurrenceInterval(String(event?.recurrenceRule?.interval ?? 1));
      setRecurrenceCount(String(event?.recurrenceRule?.count ?? 4));
      setScope("OCCURRENCE");
      setDeleteScope("OCCURRENCE");
      setParticipantIds(event?.participants?.map((p) => p.user.id) ?? []);
      setParticipantSearch("");
      setAvailabilityMap({});
      setSuggestedSlots([]);
      setSuggestionHint("");
      setReminderMinutes(event?.reminderMinutes ? String(event.reminderMinutes) : NONE_VALUE);
      setMeetingMode(event?.meetingMode ?? NONE_VALUE);
      setLocation(event?.location ?? "");
      setMeetingUrl(event?.meetingUrl ?? "");
      setDescription(event?.description ?? "");
      setNotes(event?.notes ?? "");
      setError("");
      setConfirmingDelete(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [event, initialDate, defaultProjectId, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoadingParticipants(true);
      void ideCrmClient
        .listCalendarParticipants(projectId || null)
        .then((res) => {
          if (cancelled) return;
          const byId = new Map<string, CrmCalendarPerson>();
          for (const person of res.participants ?? []) {
            byId.set(person.id, person);
          }
          for (const participant of event?.participants ?? []) {
            if (!byId.has(participant.user.id)) {
              byId.set(participant.user.id, participant.user);
            }
          }
          setAvailableParticipants(Array.from(byId.values()));
        })
        .catch(() => {
          if (cancelled) return;
          setAvailableParticipants(event?.participants?.map((p) => p.user) ?? []);
        })
        .finally(() => {
          if (!cancelled) setLoadingParticipants(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, projectId, event]);

  const timeZone = event?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const builtDates = useMemo(() => {
    try {
      if (isAllDay) {
        if (!allDayStart || !allDayEnd) return null;
        return {
          isAllDay: true as const,
          startsAt: null,
          endsAt: null,
          allDayStartDate: allDayStart,
          allDayEndDate: toExclusiveAllDayEndDate(allDayStart, allDayEnd),
        };
      }
      const begins = new Date(start);
      const finishes = new Date(end);
      if (!Number.isFinite(+begins) || !Number.isFinite(+finishes) || +finishes <= +begins) {
        return null;
      }
      return {
        isAllDay: false as const,
        startsAt: begins.toISOString(),
        endsAt: finishes.toISOString(),
        allDayStartDate: null,
        allDayEndDate: null,
      };
    } catch {
      return null;
    }
  }, [isAllDay, allDayStart, allDayEnd, start, end]);

  useEffect(() => {
    if (!open || !builtDates || participantIds.length === 0 || status === "CANCELLED") {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setCheckingAvailability(true);
      void ideCrmClient
        .checkCalendarAvailability({
          title: title.trim() || "Verificação de disponibilidade",
          type,
          status,
          priority,
          projectId: projectId || null,
          participantIds,
          ...builtDates,
          timeZone,
          ...(event?.seriesId || event?.id
            ? { excludeEventId: event.seriesId ?? event.id }
            : {}),
        })
        .then((res) => {
          if (cancelled) return;
          const nextMap: Record<string, CrmCalendarAvailabilityResult> = {};
          for (const item of res.results ?? []) {
            nextMap[item.userId] = item;
          }
          setAvailabilityMap(nextMap);
        })
        .catch(() => {
          if (!cancelled) setAvailabilityMap({});
        })
        .finally(() => {
          if (!cancelled) setCheckingAvailability(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    open,
    builtDates,
    participantIds,
    status,
    title,
    type,
    priority,
    projectId,
    timeZone,
    event?.seriesId,
    event?.id,
  ]);

  function handleToggleAllDay(checked: boolean) {
    setIsAllDay(checked);
    setAvailabilityMap({});
    if (checked) {
      const sDay = start ? start.slice(0, 10) : localDateInput(new Date());
      const eDay = end ? end.slice(0, 10) : sDay;
      if (!allDayStart) setAllDayStart(sDay);
      if (!allDayEnd) setAllDayEnd(eDay < sDay ? sDay : eDay);
    } else {
      const sDay = allDayStart || localDateInput(new Date());
      const eDay = allDayEnd && allDayEnd >= sDay ? allDayEnd : sDay;
      if (!start) setStart(`${sDay}T09:00`);
      if (!end) setEnd(`${eDay}T10:00`);
    }
  }

  function handleScopeChange(nextScope: CrmCalendarMutationScope) {
    setScope(nextScope);
    if (!event?.seriesId) return;

    if (nextScope === "SERIES") {
      if (event.seriesAllDayStartDate && event.isAllDay) {
        const anchorStart = event.seriesAllDayStartDate.slice(0, 10);
        setAllDayStart(anchorStart);
        setAllDayEnd(toInclusiveAllDayEndDate(anchorStart, event.seriesAllDayEndDate));
      } else if (event.seriesStartsAt && !event.isAllDay) {
        const s = new Date(event.seriesStartsAt);
        const e = event.seriesEndsAt
          ? new Date(event.seriesEndsAt)
          : new Date(s.getTime() + 3_600_000);
        setStart(localDateTimeInput(s));
        setEnd(localDateTimeInput(e));
      }
      setRecurrenceFrequency(event.recurrenceRule?.frequency ?? NONE_VALUE);
      setRecurrenceInterval(String(event.recurrenceRule?.interval ?? 1));
      setRecurrenceCount(String(event.recurrenceRule?.count ?? 4));
      return;
    }

    if (event.isAllDay && event.allDayStartDate) {
      const occStart = event.allDayStartDate.slice(0, 10);
      setAllDayStart(occStart);
      setAllDayEnd(toInclusiveAllDayEndDate(occStart, event.allDayEndDate));
    } else if (event.startsAt) {
      const s = new Date(event.startsAt);
      const e = event.endsAt ? new Date(event.endsAt) : new Date(s.getTime() + 3_600_000);
      setStart(localDateTimeInput(s));
      setEnd(localDateTimeInput(e));
    }

    if (nextScope === "OCCURRENCE") {
      setProjectId(event.projectId ?? "");
      setParticipantIds(event.participants?.map((p) => p.user.id) ?? []);
    }
  }

  function toggleParticipant(userId: string) {
    if (isOccurrenceLocked) return;
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleSuggestSlots() {
    setSuggestingSlots(true);
    setSuggestionHint("");
    setSuggestedSlots([]);
    try {
      const anchor = start ? new Date(start) : new Date();
      const windowStart = new Date(
        anchor.getFullYear(),
        anchor.getMonth(),
        anchor.getDate(),
        0,
        0,
        0,
        0
      );
      const windowEnd = new Date(windowStart.getTime() + 5 * 24 * 60 * 60_000);
      const currentEnd = end ? new Date(end) : new Date(anchor.getTime() + 3_600_000);
      const diffMinutes = Math.round((currentEnd.getTime() - anchor.getTime()) / 60_000);
      const durationMinutes =
        Number.isFinite(diffMinutes) && diffMinutes >= 15 && diffMinutes <= 480
          ? diffMinutes
          : 60;

      const res = await ideCrmClient.suggestCalendarSlots({
        start: windowStart.toISOString(),
        end: windowEnd.toISOString(),
        durationMinutes,
        projectId: projectId || null,
        participants: participantIds,
      });

      const slots = (res.suggestions ?? []).slice(0, 4);
      setSuggestedSlots(slots);
      if (!slots.length) {
        setSuggestionHint("Nenhum horário livre encontrado nos próximos 5 dias.");
      }
    } catch (err) {
      setSuggestionHint(
        err instanceof Error
          ? err.message
          : "Não foi possível sugerir horários disponíveis."
      );
    } finally {
      setSuggestingSlots(false);
    }
  }

  function applySuggestedSlot(slot: CrmCalendarSuggestedSlot) {
    const begins = new Date(slot.start);
    const finishes = new Date(slot.end);
    if (!Number.isFinite(+begins) || !Number.isFinite(+finishes)) return;
    setIsAllDay(false);
    setStart(localDateTimeInput(begins));
    setEnd(localDateTimeInput(finishes));
    setSuggestedSlots([]);
  }

  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    if (!q) return availableParticipants;
    return availableParticipants.filter((p) =>
      (p.name ?? p.id).toLowerCase().includes(q)
    );
  }, [availableParticipants, participantSearch]);

  const busyCount = useMemo(
    () =>
      participantIds.filter((id) => availabilityMap[id]?.status === "BUSY").length,
    [participantIds, availabilityMap]
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let payloadDates: {
        isAllDay: boolean;
        startsAt: string | null;
        endsAt: string | null;
        allDayStartDate: string | null;
        allDayEndDate: string | null;
      };

      if (isAllDay) {
        const exclusiveEndDate = toExclusiveAllDayEndDate(allDayStart, allDayEnd);
        payloadDates = {
          isAllDay: true,
          startsAt: null,
          endsAt: null,
          allDayStartDate: allDayStart,
          allDayEndDate: exclusiveEndDate,
        };
      } else {
        const begins = new Date(start);
        const finishes = new Date(end);
        if (!Number.isFinite(+begins) || !Number.isFinite(+finishes) || +finishes <= +begins) {
          throw new Error("Informe um horário final posterior ao inicial.");
        }
        payloadDates = {
          isAllDay: false,
          startsAt: begins.toISOString(),
          endsAt: finishes.toISOString(),
          allDayStartDate: null,
          allDayEndDate: null,
        };
      }

      const trimmedUrl = meetingUrl.trim();
      if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
        throw new Error("Informe um link de reunião começando com http:// ou https://.");
      }

      const shouldIncludeRecurrence = !isRecurringEdit || scope !== "OCCURRENCE";
      const recurrenceRule = shouldIncludeRecurrence
        ? recurrenceFrequency !== NONE_VALUE
          ? {
              frequency: recurrenceFrequency,
              interval: clampInt(recurrenceInterval, 1, 30, 1),
              count: clampInt(recurrenceCount, 2, 100, 4),
            }
          : null
        : undefined;

      await ideCrmClient.saveCalendarEvent(
        {
          title: title.trim(),
          description: description.trim() || null,
          type,
          status,
          priority,
          projectId: projectId || null,
          participantIds,
          ...payloadDates,
          timeZone,
          meetingMode: meetingMode === NONE_VALUE ? null : meetingMode,
          location: location.trim() || null,
          meetingUrl: trimmedUrl || null,
          notes: notes.trim() || null,
          reminderMinutes:
            reminderMinutes === NONE_VALUE ? null : Number(reminderMinutes),
          ...(recurrenceRule !== undefined ? { recurrenceRule } : {}),
          ...(isRecurringEdit ? { scope } : {}),
        },
        event?.id
      );
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof IdeCrmApiError && err.status === 409) {
        const conflicts = (
          err.payload as {
            conflicts?: Array<{ userId: string; start: string; end: string }>;
          } | null
        )?.conflicts;
        if (conflicts?.length) {
          const names = new Map(
            availableParticipants.map((person) => [person.id, person.name ?? "Participante"])
          );
          const summary = conflicts
            .slice(0, 3)
            .map(
              (c) =>
                `${names.get(c.userId) ?? "Participante"} (${formatConflictWindow(c.start, c.end)})`
            )
            .join(", ");
          setError(`Conflito de agenda detectado: ${summary}.`);
          return;
        }
      }
      setError(err instanceof Error ? err.message : "Não foi possível salvar o evento.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!event?.id) return;
    setBusy(true);
    setError("");
    try {
      await ideCrmClient.deleteCalendarEvent(
        event.id,
        event.seriesId ? deleteScope : undefined
      );
      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o evento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>
            Configure horário, projeto, recorrência, lembrete e participantes no fuso deste
            dispositivo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4">
          {isRecurringEdit && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Repeat className="h-3.5 w-3.5 text-primary" />
                <span>Evento recorrente · Escopo da edição</span>
              </div>
              <Select
                value={scope}
                onValueChange={(value) => handleScopeChange(value as CrmCalendarMutationScope)}
              >
                <SelectTrigger aria-label="Escopo da edição">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CALENDAR_MUTATION_SCOPE_LABELS) as CrmCalendarMutationScope[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {CALENDAR_MUTATION_SCOPE_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <label className="block space-y-1.5 text-sm font-medium">
            <span>Título</span>
            <Input
              required
              maxLength={191}
              placeholder="Ex.: Alinhamento de sprint, entrega de marco..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Tipo</span>
              <Select
                value={type}
                onValueChange={(val) => setType(val as CrmCalendarEventType)}
              >
                <SelectTrigger aria-label="Tipo do evento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CALENDAR_EVENT_TYPE_LABELS) as CrmCalendarEventType[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {CALENDAR_EVENT_TYPE_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </label>

            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Status</span>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as CrmCalendarEventStatus)}
              >
                <SelectTrigger aria-label="Status do evento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CALENDAR_EVENT_STATUS_LABELS) as CrmCalendarEventStatus[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {CALENDAR_EVENT_STATUS_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </label>

            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Prioridade</span>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as CrmCalendarEventPriority)}
              >
                <SelectTrigger aria-label="Prioridade do evento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CALENDAR_EVENT_PRIORITY_LABELS) as CrmCalendarEventPriority[]).map(
                    (key) => (
                      <SelectItem key={key} value={key}>
                        {CALENDAR_EVENT_PRIORITY_LABELS[key]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </label>

            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Projeto</span>
              <Select
                disabled={isOccurrenceLocked}
                value={projectId || PERSONAL_PROJECT_VALUE}
                onValueChange={(val) =>
                  setProjectId(val === PERSONAL_PROJECT_VALUE ? "" : val)
                }
              >
                <SelectTrigger aria-label="Projeto vinculado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value={PERSONAL_PROJECT_VALUE}
                    disabled={Boolean(event?.projectId)}
                  >
                    Pessoal (sem projeto)
                  </SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.code ? `[${proj.code}] ${proj.name}` : proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer">
                <Switch checked={isAllDay} onCheckedChange={handleToggleAllDay} />
                <span>Evento de dia inteiro</span>
              </label>

              {!isAllDay && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={suggestingSlots}
                  onClick={() => void handleSuggestSlots()}
                  className="h-7 gap-1.5 text-xs"
                >
                  {suggestingSlots ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  )}
                  Sugerir horário livre
                </Button>
              )}
            </div>

            {isAllDay ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  <span>Data inicial</span>
                  <Input
                    required
                    type="date"
                    value={allDayStart}
                    onChange={(e) => {
                      setAllDayStart(e.target.value);
                      if (!allDayEnd || allDayEnd < e.target.value) {
                        setAllDayEnd(e.target.value);
                      }
                    }}
                  />
                </label>
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  <span>Data final</span>
                  <Input
                    required
                    type="date"
                    min={allDayStart || undefined}
                    value={allDayEnd}
                    onChange={(e) => setAllDayEnd(e.target.value)}
                  />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  <span>Início</span>
                  <Input
                    required
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                  <span>Fim</span>
                  <Input
                    required
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </div>
            )}

            {suggestedSlots.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-muted-foreground">
                  Horários livres encontrados (clique para aplicar):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSlots.map((slot) => (
                    <Button
                      key={slot.start}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => applySuggestedSlot(slot)}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {formatConflictWindow(slot.start, slot.end)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {suggestionHint && (
              <p className="text-xs text-muted-foreground">{suggestionHint}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Repetição</span>
              <Select
                disabled={isOccurrenceLocked}
                value={recurrenceFrequency}
                onValueChange={(val) =>
                  setRecurrenceFrequency(
                    val as CrmCalendarRecurrenceFrequency | typeof NONE_VALUE
                  )
                }
              >
                <SelectTrigger aria-label="Recorrência">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Não se repete</SelectItem>
                  {(
                    Object.keys(CALENDAR_RECURRENCE_LABELS) as CrmCalendarRecurrenceFrequency[]
                  ).map((key) => (
                    <SelectItem key={key} value={key}>
                      {CALENDAR_RECURRENCE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {recurrenceFrequency !== NONE_VALUE ? (
              <>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  <span>Intervalo (ciclos)</span>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    disabled={isOccurrenceLocked}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  <span>Quantidade de ocorrências</span>
                  <Input
                    type="number"
                    min={2}
                    max={100}
                    disabled={isOccurrenceLocked}
                    value={recurrenceCount}
                    onChange={(e) => setRecurrenceCount(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  <span>Lembrete</span>
                  <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                    <SelectTrigger aria-label="Lembrete">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CALENDAR_REMINDER_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                  <span>Formato</span>
                  <Select
                    value={meetingMode}
                    onValueChange={(val) =>
                      setMeetingMode(val as CrmCalendarMeetingMode | typeof NONE_VALUE)
                    }
                  >
                    <SelectTrigger aria-label="Formato do encontro">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Não definido</SelectItem>
                      {(
                        Object.keys(CALENDAR_MEETING_MODE_LABELS) as CrmCalendarMeetingMode[]
                      ).map((key) => (
                        <SelectItem key={key} value={key}>
                          {CALENDAR_MEETING_MODE_LABELS[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </>
            )}
          </div>

          {recurrenceFrequency !== NONE_VALUE && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>Lembrete</span>
                <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                  <SelectTrigger aria-label="Lembrete">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALENDAR_REMINDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
                <span>Formato</span>
                <Select
                  value={meetingMode}
                  onValueChange={(val) =>
                    setMeetingMode(val as CrmCalendarMeetingMode | typeof NONE_VALUE)
                  }
                >
                  <SelectTrigger aria-label="Formato do encontro">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Não definido</SelectItem>
                    {(
                      Object.keys(CALENDAR_MEETING_MODE_LABELS) as CrmCalendarMeetingMode[]
                    ).map((key) => (
                      <SelectItem key={key} value={key}>
                        {CALENDAR_MEETING_MODE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Local
              </span>
              <Input
                maxLength={512}
                placeholder="Sala, endereço ou referência"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Video className="h-3 w-3" /> Link da reunião
              </span>
              <Input
                type="url"
                maxLength={2048}
                placeholder="https://meet.google.com/..."
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
            </label>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-card p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                Participantes ({participantIds.length} selecionado{participantIds.length === 1 ? "" : "s"})
              </span>
              <div className="flex items-center gap-2">
                {checkingAvailability && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Verificando agenda...
                  </span>
                )}
                {!checkingAvailability && busyCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {busyCount} conflito{busyCount === 1 ? "" : "s"}
                  </Badge>
                )}
              </div>
            </div>

            {isOccurrenceLocked && (
              <p className="text-xs text-muted-foreground">
                Para adicionar ou remover participantes, altere o escopo para &ldquo;Esta e as
                próximas&rdquo; ou &ldquo;Toda a série&rdquo;.
              </p>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Buscar membro..."
                className="h-7 pl-8 text-xs"
              />
            </div>

            <ScrollArea className="h-32 pr-2">
              {loadingParticipants ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Carregando participantes...
                </p>
              ) : filteredParticipants.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Nenhum participante encontrado.
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredParticipants.map((person) => {
                    const selected = participantIds.includes(person.id);
                    const avail = selected ? availabilityMap[person.id] : undefined;
                    const firstConflict = avail?.conflicts?.[0];
                    return (
                      <button
                        key={person.id}
                        type="button"
                        disabled={isOccurrenceLocked}
                        onClick={() => toggleParticipant(person.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                          selected
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-transparent hover:bg-muted/60 text-foreground",
                          isOccurrenceLocked && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background"
                            )}
                          >
                            {selected && <Check className="h-3 w-3" />}
                          </span>
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
                            <MemberAvatarContent
                              name={person.name}
                              src={person.avatarUrl}
                            />
                          </span>
                          <span className="truncate font-medium">
                            {person.name ?? "Usuário"}
                          </span>
                          {person.role && (
                            <span className="hidden text-[10px] text-muted-foreground sm:inline">
                              · {person.role}
                            </span>
                          )}
                        </div>

                        {avail?.status === "BUSY" && (
                          <Badge variant="destructive" className="shrink-0 text-[10px]">
                            Ocupado
                            {firstConflict
                              ? ` (${formatConflictWindow(firstConflict.start, firstConflict.end)})`
                              : ""}
                          </Badge>
                        )}
                        {avail?.status === "AVAILABLE" && (
                          <Badge variant="subtle" className="shrink-0 text-[10px]">
                            <CalendarClock className="mr-1 h-2.5 w-2.5" />
                            Livre
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Descrição</span>
              <Textarea
                rows={3}
                maxLength={20_000}
                placeholder="Pauta, objetivos ou links úteis..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5 text-xs font-medium text-muted-foreground">
              <span>Notas e encaminhamentos</span>
              <Textarea
                rows={3}
                maxLength={20_000}
                placeholder="Anotações de acompanhamento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <DialogFooter className="flex-wrap items-center justify-between gap-2 sm:justify-between">
            <div>
              {event?.id &&
                (confirmingDelete ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {isRecurringEdit && (
                      <Select
                        value={deleteScope}
                        onValueChange={(value) =>
                          setDeleteScope(value as CrmCalendarMutationScope)
                        }
                      >
                        <SelectTrigger className="h-8 w-44 text-xs" aria-label="Escopo da exclusão">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.keys(CALENDAR_MUTATION_SCOPE_LABELS) as CrmCalendarMutationScope[]
                          ).map((key) => (
                            <SelectItem key={key} value={key}>
                              {CALENDAR_MUTATION_SCOPE_LABELS[key]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={busy}
                      onClick={() => void handleDelete()}
                    >
                      Confirmar exclusão
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Voltar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Excluir evento
                  </Button>
                ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button disabled={busy}>{busy ? "Salvando..." : "Salvar evento"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
