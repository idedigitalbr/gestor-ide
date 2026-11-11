"use client";

import { createContext, useContext } from "react";
import type { CrmCalendarEvent } from "@gestor-ide/core";

export interface CalendarDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: CrmCalendarEvent | null;
  setEditing: (event: CrmCalendarEvent | null) => void;
  setCanCreate: (canCreate: boolean) => void;
}

export const CalendarDialogContext = createContext<CalendarDialogState | null>(null);

export function useCalendarDialog(): CalendarDialogState {
  const context = useContext(CalendarDialogContext);
  if (!context) throw new Error("Calendário deve estar dentro do layout do aplicativo.");
  return context;
}
