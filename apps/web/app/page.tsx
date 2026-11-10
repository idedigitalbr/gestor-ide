import { Suspense } from "react";
import { TaskApp } from "@/components/task-app";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground text-sm">
          Carregando IDE Gestor...
        </div>
      }
    >
      <TaskApp />
    </Suspense>
  );
}
