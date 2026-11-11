"use client";

import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import { TaskApp } from "@/components/task-app";
import { CalendarDialogProvider } from "@/components/calendar-dialog-context";

const emptySubscribe = () => () => {};

function AppShellFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted-foreground">
      Carregando IDE Gestor...
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <CalendarDialogProvider>
      {!isClient ? (
        <div className="relative h-full w-full">
          <AppShellFallback />
          <div hidden aria-hidden="true">
            {children}
          </div>
        </div>
      ) : (
        <Suspense fallback={<AppShellFallback />}>
          <TaskApp>{children}</TaskApp>
        </Suspense>
      )}
    </CalendarDialogProvider>
  );
}
