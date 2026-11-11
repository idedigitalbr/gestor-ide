/**
 * Notion Date Utilities & Formatter (pt-BR)
 * 
 * Rules:
 * - Idioma português brasileiro (pt-BR).
 * - Dias da semana abreviados: seg, ter, qua, qui, sex, sáb, dom.
 * - Meses abreviados: jan, fev, mar, abr, mai, jun, jul, ago, set, out, nov, dez.
 * - Separar início e término com →.
 * - Omitir o ano quando a data pertencer ao ano atual.
 * - Exibir o ano quando for diferente do ano atual.
 * - Quando o intervalo atravessar anos diferentes, exibir o ano nas datas necessárias.
 * - Calcular corretamente o dia da semana de acordo com a data real.
 * - Compacto e legível.
 */

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
const MONTHS_FULL = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function parseIsoOrDateString(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // DD/MM/YYYY or DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) {
    const parts = trimmed.split(/[/ -]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    return new Date(year, month, day);
  }

  // YYYY-MM-DD
  const datePart = trimmed.slice(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    return new Date(year, month, day);
  }

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function formatSingleDateNotion(
  date: Date,
  referenceYear: number = new Date().getFullYear(),
  options?: { includeTime?: boolean; time?: string }
): string {
  const weekday = WEEKDAYS_SHORT[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT[date.getMonth()];
  const year = date.getFullYear();

  let inside = `${day}/${month}`;
  if (year !== referenceYear) {
    inside = `${day}/${month}/${year}`;
  }

  if (options?.includeTime && options.time) {
    inside += `, ${options.time}`;
  }

  return `${weekday} (${inside})`;
}

/**
 * Format date or date range in Notion style:
 * Single: `qui (01/out)` or `seg (01/out/2029)`
 * Range: `qui (01/out) → sáb (31/out)` or `seg (01/out/2029) → qua (31/out/2029)`
 */
export function formatNotionDate(
  startDateStr: string | null | undefined,
  endDateStr?: string | null | undefined,
  options?: {
    currentYear?: number;
    includeTime?: boolean;
    startTime?: string;
    endTime?: string;
  }
): string {
  const currentYear = options?.currentYear ?? new Date().getFullYear();
  const startDate = parseIsoOrDateString(startDateStr);
  const endDate = parseIsoOrDateString(endDateStr);

  if (!startDate && !endDate) return "";
  if (startDate && !endDate) {
    return formatSingleDateNotion(startDate, currentYear, {
      includeTime: options?.includeTime,
      time: options?.startTime,
    });
  }
  if (!startDate && endDate) {
    return formatSingleDateNotion(endDate, currentYear, {
      includeTime: options?.includeTime,
      time: options?.endTime,
    });
  }

  // Both exist
  if (startDate && endDate) {
    let s = startDate;
    let e = endDate;
    if (s.getTime() > e.getTime()) {
      s = endDate;
      e = startDate;
    }

    const startFormatted = formatSingleDateNotion(s, currentYear, {
      includeTime: options?.includeTime,
      time: options?.startTime,
    });
    const endFormatted = formatSingleDateNotion(e, currentYear, {
      includeTime: options?.includeTime,
      time: options?.endTime,
    });

    return `${startFormatted} → ${endFormatted}`;
  }

  return "";
}

export function formatMonthYearPtBr(date: Date): string {
  const month = MONTHS_SHORT[date.getMonth()];
  return `${month}. de ${date.getFullYear()}`;
}

export function formatFullMonthYearPtBr(date: Date): string {
  const month = MONTHS_FULL[date.getMonth()];
  return `${month} de ${date.getFullYear()}`;
}

export function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toPtBrDisplayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
