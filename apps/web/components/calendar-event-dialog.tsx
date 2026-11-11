"use client";

import { useEffect, useState } from "react";
import type { CrmCalendarEvent } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function localInput(date: Date) { const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }

export function CalendarEventDialog({ event, open, onOpenChange, onSaved }: { event: CrmCalendarEvent | null; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(""); const [start, setStart] = useState(""); const [end, setEnd] = useState(""); const [description, setDescription] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) return; const timer = setTimeout(() => { const initial = event?.startsAt ? new Date(event.startsAt) : new Date(); setTitle(event?.title ?? ""); setStart(localInput(initial)); setEnd(localInput(event?.endsAt ? new Date(event.endsAt) : new Date(initial.getTime() + 3600000))); setDescription(event?.description ?? ""); setError(""); }, 0); return () => clearTimeout(timer); }, [event, open]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const begins = new Date(start); const finishes = new Date(end);
      if (!Number.isFinite(+begins) || !Number.isFinite(+finishes) || +finishes <= +begins) throw new Error("Informe um horário final posterior ao inicial.");
      await ideCrmClient.saveCalendarEvent({ title, description: description || null, type: event?.type ?? "MEETING", status: event?.status ?? "CONFIRMED", priority: event?.priority ?? "MEDIUM", projectId: event?.projectId ?? null, participantIds: event?.participants?.map(p => p.user.id) ?? [], isAllDay: false, startsAt: begins.toISOString(), endsAt: finishes.toISOString(), allDayStartDate: null, allDayEndDate: null, timeZone: event?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, meetingMode: event?.meetingMode ?? null, location: event?.location ?? null, meetingUrl: event?.meetingUrl ?? null, notes: event?.notes ?? null, reminderMinutes: event?.reminderMinutes ?? null, ...(event?.seriesId ? { scope: "OCCURRENCE" } : {}) }, event?.id);
      await onSaved(); onOpenChange(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o evento."); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{event ? "Editar evento" : "Novo evento"}</DialogTitle><DialogDescription>Informe os dados do evento. Horários usam o fuso deste dispositivo.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-3"><label className="block space-y-1 text-sm">Título<Input required maxLength={191} value={title} onChange={e => setTitle(e.target.value)} /></label><label className="block space-y-1 text-sm">Início<Input required type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></label><label className="block space-y-1 text-sm">Fim<Input required type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label><label className="block space-y-1 text-sm">Descrição<Textarea value={description} onChange={e => setDescription(e.target.value)} /></label>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={busy}>{busy ? "Salvando..." : "Salvar evento"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
