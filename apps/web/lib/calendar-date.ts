const ISO_DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

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
