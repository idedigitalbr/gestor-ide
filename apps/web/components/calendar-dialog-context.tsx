"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CrmCalendarEvent } from "@gestor-ide/core";

export interface CalendarDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: CrmCalendarEvent | null;
  setEditing: (event: CrmCalendarEvent | null) => void;
  canCreate: boolean;
  setCanCreate: (canCreate: boolean) => void;
}

export const CalendarDialogContext = createContext<CalendarDialogState | null>(null);

export function CalendarDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmCalendarEvent | null>(null);
  const [canCreate, setCanCreate] = useState(false);

  return (
    <CalendarDialogContext.Provider
      value={{ open, setOpen, editing, setEditing, canCreate, setCanCreate }}
    >
      {children}
    </CalendarDialogContext.Provider>
  );
}

export function useCalendarDialog(): CalendarDialogState {
  const context = useContext(CalendarDialogContext);
  if (!context) throw new Error("Calendário deve estar dentro do layout do aplicativo.");
  return context;
}
