"use client";

import { useEffect, useState } from "react";
import type { CrmCalendarEvent } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function localDateTimeInput(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function localDateInput(date: Date) {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
}

export function CalendarEventDialog({
  event,
  open,
  onOpenChange,
  onSaved,
}: {
  event: CrmCalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [allDayStart, setAllDayStart] = useState("");
  const [allDayEnd, setAllDayEnd] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const initial = event?.startsAt ? new Date(event.startsAt) : new Date();
      const initialEnd = event?.endsAt
        ? new Date(event.endsAt)
        : new Date(initial.getTime() + 3_600_000);
      const allDayFlag = Boolean(event?.isAllDay);
      const startDay =
        event?.allDayStartDate?.slice(0, 10) ||
        (event?.startsAt ? localDateInput(initial) : localDateInput(new Date()));
      const endDay =
        event?.allDayEndDate?.slice(0, 10) ||
        event?.allDayStartDate?.slice(0, 10) ||
        startDay;

      setTitle(event?.title ?? "");
      setIsAllDay(allDayFlag);
      setStart(localDateTimeInput(initial));
      setEnd(localDateTimeInput(initialEnd));
      setAllDayStart(startDay);
      setAllDayEnd(endDay);
      setDescription(event?.description ?? "");
      setError("");
      setConfirmingDelete(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [event, open]);

  function handleToggleAllDay(checked: boolean) {
    setIsAllDay(checked);
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
        if (!allDayStart || !allDayEnd || allDayEnd < allDayStart) {
          throw new Error("Informe uma data final igual ou posterior à inicial.");
        }
        payloadDates = {
          isAllDay: true,
          startsAt: null,
          endsAt: null,
          allDayStartDate: allDayStart,
          allDayEndDate: allDayEnd,
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

      await ideCrmClient.saveCalendarEvent(
        {
          title,
          description: description || null,
          type: event?.type ?? "MEETING",
          status: event?.status ?? "CONFIRMED",
          priority: event?.priority ?? "MEDIUM",
          projectId: event?.projectId ?? null,
          participantIds: event?.participants?.map((p) => p.user.id) ?? [],
          ...payloadDates,
          timeZone: event?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
          meetingMode: event?.meetingMode ?? null,
          location: event?.location ?? null,
          meetingUrl: event?.meetingUrl ?? null,
          notes: event?.notes ?? null,
          reminderMinutes: event?.reminderMinutes ?? null,
          ...(event?.seriesId ? { scope: "OCCURRENCE" } : {}),
        },
        event?.id
      );
      await onSaved();
      onOpenChange(false);
    } catch (err) {
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
        event.seriesId ? "OCCURRENCE" : undefined
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle>
          <DialogDescription>
            Informe os dados do evento. Horários usam o fuso deste dispositivo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <label className="block space-y-1 text-sm">
            Título
            <Input
              required
              maxLength={191}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
            <span>Evento de dia inteiro</span>
            <Switch checked={isAllDay} onCheckedChange={handleToggleAllDay} />
          </label>

          {isAllDay ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                Data inicial
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
              <label className="block space-y-1 text-sm">
                Data final
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
              <label className="block space-y-1 text-sm">
                Início
                <Input
                  required
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                Fim
                <Input
                  required
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
          )}

          <label className="block space-y-1 text-sm">
            Descrição
            <Textarea
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="flex-wrap items-center justify-between gap-2 sm:justify-between">
            <div>
              {event?.id &&
                (confirmingDelete ? (
                  <div className="flex items-center gap-2">
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
                      Cancelar
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
