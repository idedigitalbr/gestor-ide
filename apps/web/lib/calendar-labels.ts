import type {
  CrmCalendarEventPriority,
  CrmCalendarEventStatus,
  CrmCalendarEventType,
  CrmCalendarMeetingMode,
  CrmCalendarMutationScope,
  CrmCalendarRecurrenceFrequency,
  CrmCalendarRecurrenceRule,
} from "@gestor-ide/core";

export const CALENDAR_EVENT_TYPE_LABELS: Record<CrmCalendarEventType, string> = {
  MEETING: "Reunião",
  DELIVERY: "Entrega / Marco",
  OTHER: "Outro",
};

export const CALENDAR_EVENT_STATUS_LABELS: Record<CrmCalendarEventStatus, string> = {
  CONFIRMED: "Confirmado",
  TENTATIVE: "Provisório",
  CANCELLED: "Cancelado",
};

export const CALENDAR_EVENT_PRIORITY_LABELS: Record<CrmCalendarEventPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

export const CALENDAR_MEETING_MODE_LABELS: Record<CrmCalendarMeetingMode, string> = {
  ONLINE: "Online",
  IN_PERSON: "Presencial",
};

export const CALENDAR_RECURRENCE_LABELS: Record<CrmCalendarRecurrenceFrequency, string> = {
  DAILY: "Diária",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
};

export const CALENDAR_MUTATION_SCOPE_LABELS: Record<CrmCalendarMutationScope, string> = {
  OCCURRENCE: "Somente esta ocorrência",
  FOLLOWING: "Esta e as próximas",
  SERIES: "Toda a série",
};

export const CALENDAR_REMINDER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "NONE", label: "Sem lembrete" },
  { value: "5", label: "5 minutos antes" },
  { value: "15", label: "15 minutos antes" },
  { value: "30", label: "30 minutos antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 dia antes" },
];

export function formatCalendarReminderLabel(minutes: number | null | undefined): string {
  if (!minutes) return "Sem lembrete";
  const match = CALENDAR_REMINDER_OPTIONS.find((item) => item.value === String(minutes));
  return match ? match.label : `${minutes} minutos antes`;
}

export function formatCalendarRecurrenceSummary(
  rule: CrmCalendarRecurrenceRule | null | undefined
): string {
  if (!rule) return "";
  const unitLabel = CALENDAR_RECURRENCE_LABELS[rule.frequency] ?? rule.frequency;
  const intervalPart = rule.interval > 1 ? ` · a cada ${rule.interval} ciclos` : "";
  return `${unitLabel}${intervalPart} · ${rule.count}x`;
}
