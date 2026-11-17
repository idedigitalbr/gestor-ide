"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Next.js App Router Error:", error);
  }, [error]);

  function handleResetViewMode() {
    try {
      localStorage.setItem("gestor_task_view_mode", "table");
    } catch {}
    reset();
  }

  function handleGoHome() {
    try {
      localStorage.setItem("gestor_task_view_mode", "table");
    } catch {}
    router.push("/");
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6 text-foreground">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-foreground">
            Algo não carregou corretamente
          </h2>
          <p className="text-xs text-muted-foreground">
            {error.message || "Ocorreu uma falha inesperada na visualização atual."}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleResetViewMode}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="size-3.5" />
            Recarregar visualização
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoHome}
            className="gap-1.5 text-xs"
          >
            <Home className="size-3.5" />
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  );
}
