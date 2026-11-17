import { useState, useEffect } from "react";
import {
  getOutboxSyncStatus,
  subscribeOutboxStatus,
  processOfflineOutbox,
  type OutboxSyncStatus,
} from "./offline-outbox";

/**
 * Hook para monitorar o status de sincronização offline (Outbox) do Gestor IDE.
 * Informa se o dispositivo está online, quantos itens estão pendentes e permite forçar re-sincronismo.
 */
export function useOfflineSyncStatus(): OutboxSyncStatus & {
  triggerSync: () => Promise<void>;
} {
  const [status, setStatus] = useState<OutboxSyncStatus>(() => getOutboxSyncStatus());

  useEffect(() => {
    const unsubscribe = subscribeOutboxStatus(setStatus);

    const handleOnline = () => {
      void processOfflineOutbox();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", () => {
      setStatus(getOutboxSyncStatus());
    });

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const triggerSync = async () => {
    await processOfflineOutbox();
  };

  return {
    ...status,
    triggerSync,
  };
}
