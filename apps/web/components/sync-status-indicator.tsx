"use client";

import React from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useOfflineSyncStatus } from "@/lib/query";

export function SyncStatusIndicator({ className = "" }: { className?: string }) {
  const { isOnline, isSyncing, pendingCount, triggerSync } = useOfflineSyncStatus();

  if (!isOnline) {
    return (
      <div
        title="Você está offline. Todas as alterações estão salvas no seu dispositivo."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20 ${className}`}
      >
        <CloudOff className="size-3 shrink-0" />
        <span>Offline</span>
        {pendingCount > 0 && <span className="font-bold">({pendingCount})</span>}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div
        title="Sincronizando alterações locais com o IDE CRM..."
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20 ${className}`}
      >
        <RefreshCw className="size-3 shrink-0 animate-spin" />
        <span>Sincronizando...</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => void triggerSync()}
        title={`${pendingCount} alteração(ões) gravada(s) localmente. Clique para sincronizar agora.`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 cursor-pointer transition-colors ${className}`}
      >
        <RefreshCw className="size-3 shrink-0" />
        <span>{pendingCount} pendente{pendingCount > 1 ? "s" : ""}</span>
      </button>
    );
  }

  return (
    <div
      title="✓ Todas as alterações salvas e sincronizadas com o IDE CRM"
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors ${className}`}
    >
      <Cloud className="size-3.5 shrink-0 text-emerald-500/80" />
      <span className="sr-only md:not-sr-only md:inline text-[10px]">Salvo</span>
    </div>
  );
}
