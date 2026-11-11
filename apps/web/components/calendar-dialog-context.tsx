"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { CrmCalendarEvent } from "@gestor-ide/core";

export interface CalendarDialogState {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: CrmCalendarEvent | null;
  setEditing: (event: CrmCalendarEvent | null) => void;
  initialDate: string | null;
  setInitialDate: (dateKey: string | null) => void;
  defaultProjectId: string | null;
  setDefaultProjectId: (projectId: string | null) => void;
  canCreate: boolean;
  setCanCreate: (canCreate: boolean) => void;
  openCreateDialog: (options?: {
    dateKey?: string | null;
    projectId?: string | null;
  }) => void;
}

export const CalendarDialogContext = createContext<CalendarDialogState | null>(null);

export function CalendarDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrmCalendarEvent | null>(null);
  const [initialDate, setInitialDate] = useState<string | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [canCreate, setCanCreate] = useState(false);

  const openCreateDialog = useCallback(
    (options?: { dateKey?: string | null; projectId?: string | null }) => {
      setEditing(null);
      setInitialDate(options?.dateKey ?? null);
      if (options?.projectId !== undefined) {
        setDefaultProjectId(options.projectId);
      }
      setOpen(true);
    },
    []
  );

  return (
    <CalendarDialogContext.Provider
      value={{
        open,
        setOpen,
        editing,
        setEditing,
        initialDate,
        setInitialDate,
        defaultProjectId,
        setDefaultProjectId,
        canCreate,
        setCanCreate,
        openCreateDialog,
      }}
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
