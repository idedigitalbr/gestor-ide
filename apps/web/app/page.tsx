"use client";

import dynamic from "next/dynamic";

const TaskApp = dynamic(
  () => import("@/components/task-app").then((mod) => mod.TaskApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground text-sm">
        Carregando IDE Gestor...
      </div>
    ),
  }
);

export default function Page() {
  return <TaskApp />;
}
