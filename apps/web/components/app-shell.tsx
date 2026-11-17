"use client";

import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import { TaskApp } from "@/components/task-app";
import { CalendarDialogProvider } from "@/components/calendar-dialog-context";
import { ErrorBoundary } from "@/components/error-boundary";

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
        <ErrorBoundary
          title="Erro ao carregar a aplicação"
          description="Ocorreu uma falha inesperada. Clique abaixo para recarregar com a visualização padrão."
          onReset={() => {
            try {
              localStorage.setItem("gestor_task_view_mode", "table");
            } catch {}
          }}
        >
          <Suspense fallback={<AppShellFallback />}>
            <TaskApp>{children}</TaskApp>
          </Suspense>
        </ErrorBoundary>
      )}
    </CalendarDialogProvider>
  );
}
