"use client";

import { useQuery } from "@tanstack/react-query";
import type { CrmProjectsDashboard } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { queryKeys } from "./query-client";

/**
 * Hook reativo para consultar métricas, distribuição e saúde dos projetos do IDE Gestor.
 * Totalmente integrado ao TanStack Query e cache persistente no IndexedDB.
 */
export function useProjectsDashboard() {
  const query = useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: async (): Promise<CrmProjectsDashboard> => {
      const res = await ideCrmClient.getProjectsDashboard();
      return res.dashboard;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de frescor
  });

  return {
    dashboard: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : String(query.error)
      : "",
    refetch: query.refetch,
  };
}
