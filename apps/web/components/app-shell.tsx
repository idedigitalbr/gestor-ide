"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const TaskApp = dynamic(
  () => import("@/components/task-app").then((module) => module.TaskApp),
  {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center bg-background text-sm text-muted-foreground">Carregando IDE Gestor...</div>,
  }
);

export function AppShell({ children }: { children: ReactNode }) {
  return <TaskApp>{children}</TaskApp>;
}
