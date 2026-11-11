import type { CrmCalendarEvent, CrmCalendarTaskItem } from "@gestor-ide/core";

const ISO_DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarViewMode = "month" | "week" | "day" | "agenda";

export interface CalendarDaySpan {
  startKey: string;
  inclusiveEndKey: string;
}

/**
 * Formata um Date no fuso local como chave `YYYY-MM-DD`.
 */
export function localDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Desloca uma chave de data `YYYY-MM-DD` em `deltaDays` dias no calendário UTC.
 */
export function shiftIsoDateKey(dateKey: string, deltaDays: number): string | null {
  const match = ISO_DATE_KEY_RE.exec(dateKey.trim().slice(0, 10));
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, monthIndex, day));

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== monthIndex ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  probe.setUTCDate(probe.getUTCDate() + deltaDays);
  const y = String(probe.getUTCFullYear()).padStart(4, "0");
  const m = String(probe.getUTCMonth() + 1).padStart(2, "0");
  const d = String(probe.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Converte a data final exclusiva (`allDayEndDate`) vinda do IDE CRM para o último dia inclusivo no formulário.
 */
export function toInclusiveAllDayEndDate(
  startDateKey: string,
  exclusiveEndDate?: string | null
): string {
  if (!exclusiveEndDate) return startDateKey;
  const previousDay = shiftIsoDateKey(exclusiveEndDate, -1);
  if (!previousDay) return startDateKey;
  return previousDay < startDateKey ? startDateKey : previousDay;
}

/**
 * Valida o intervalo inclusivo e retorna a data final exclusiva (`+1` dia) aceita pelo IDE CRM.
 */
export function toExclusiveAllDayEndDate(
  startDateKey: string,
  inclusiveEndDate: string
): string {
  const startKey = shiftIsoDateKey(startDateKey, 0);
  const endKey = shiftIsoDateKey(inclusiveEndDate, 0);
  if (!startKey || !endKey || endKey < startKey) {
    throw new Error("Informe uma data final igual ou posterior à inicial.");
  }
  return shiftIsoDateKey(endKey, 1)!;
}

/**
 * Gera `count` chaves consecutivas (`YYYY-MM-DD`) a partir de `startKey`.
 */
export function listDateKeys(startKey: string, count: number): string[] {
  const keys: string[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const key = shiftIsoDateKey(startKey, offset);
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * Calcula a janela de consulta e as chaves da grade respeitando o teto de 62 dias da API.
 */
export function computeCalendarQueryRange(
  anchorDate: Date,
  mode: CalendarViewMode
): { start: Date; end: Date; gridStartKey: string; daysCount: number } {
  if (mode === "day") {
    const start = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      anchorDate.getDate(),
      0,
      0,
      0,
      0
    );
    const end = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 1,
      0,
      0,
      0,
      0
    );
    return { start, end, gridStartKey: localDateKey(start), daysCount: 1 };
  }

  if (mode === "week") {
    const dayOfWeek = anchorDate.getDay();
    const start = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      anchorDate.getDate() - dayOfWeek,
      0,
      0,
      0,
      0
    );
    const end = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + 7,
      0,
      0,
      0,
      0
    );
    return { start, end, gridStartKey: localDateKey(start), daysCount: 7 };
  }

  if (mode === "agenda") {
    const start = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1, 0, 0, 0, 0);
    const daysCount = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    return { start, end, gridStartKey: localDateKey(start), daysCount };
  }

  const firstOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1, 0, 0, 0, 0);
  const start = new Date(
    firstOfMonth.getFullYear(),
    firstOfMonth.getMonth(),
    1 - firstOfMonth.getDay(),
    0,
    0,
    0,
    0
  );
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 42, 0, 0, 0, 0);
  return { start, end, gridStartKey: localDateKey(start), daysCount: 42 };
}

/**
 * Converte um evento de calendário em intervalo inclusivo de datas `YYYY-MM-DD`.
 */
export function getEventDateSpanKeys(event: CrmCalendarEvent): CalendarDaySpan | null {
  if (event.isAllDay && event.allDayStartDate) {
    const startKey = event.allDayStartDate.slice(0, 10);
    return {
      startKey,
      inclusiveEndKey: toInclusiveAllDayEndDate(startKey, event.allDayEndDate),
    };
  }

  if (!event.startsAt) return null;
  const starts = new Date(event.startsAt);
  if (!Number.isFinite(starts.getTime())) return null;
  const startKey = localDateKey(starts);

  if (!event.endsAt) {
    return { startKey, inclusiveEndKey: startKey };
  }
  const ends = new Date(event.endsAt);
  if (!Number.isFinite(ends.getTime()) || ends.getTime() <= starts.getTime()) {
    return { startKey, inclusiveEndKey: startKey };
  }

  const rawEndKey = localDateKey(ends);
  const endsAtLocalMidnight =
    ends.getHours() === 0 &&
    ends.getMinutes() === 0 &&
    ends.getSeconds() === 0 &&
    ends.getMilliseconds() === 0;

  const inclusiveEndKey =
    endsAtLocalMidnight && rawEndKey > startKey
      ? shiftIsoDateKey(rawEndKey, -1) ?? rawEndKey
      : rawEndKey;

  return {
    startKey,
    inclusiveEndKey: inclusiveEndKey < startKey ? startKey : inclusiveEndKey,
  };
}

/**
 * Converte uma tarefa com início/prazo em intervalo inclusivo de datas `YYYY-MM-DD`.
 */
export function getTaskDateSpanKeys(
  task: Pick<CrmCalendarTaskItem, "startDate" | "dueDate">
): CalendarDaySpan | null {
  const first = (task.startDate ?? task.dueDate)?.slice(0, 10) ?? "";
  const last = (task.dueDate ?? task.startDate)?.slice(0, 10) ?? "";
  if (!ISO_DATE_KEY_RE.test(first) || !ISO_DATE_KEY_RE.test(last)) return null;
  return first <= last
    ? { startKey: first, inclusiveEndKey: last }
    : { startKey: last, inclusiveEndKey: first };
}

export function doesSpanIncludeDay(span: CalendarDaySpan, dayKey: string): boolean {
  return dayKey >= span.startKey && dayKey <= span.inclusiveEndKey;
}

export function formatCalendarPeriodLabel(anchorDate: Date, mode: CalendarViewMode): string {
  if (mode === "day") {
    return anchorDate.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (mode === "week") {
    const start = new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      anchorDate.getDate() - anchorDate.getDay()
    );
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    const sameMonth =
      start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      const monthLabel = end.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return `${start.getDate()} – ${end.getDate()} de ${monthLabel}`;
    }
    const startLabel = start.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
    const endLabel = end.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startLabel} – ${endLabel}`;
  }

  return anchorDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
