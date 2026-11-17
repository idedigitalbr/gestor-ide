"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomProjectView, CustomViewOpenMode } from "@gestor-ide/core";
import { getDefaultProjectViews } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { queryKeys } from "./query-client";

export interface SaveCustomViewInput {
  id?: string;
  name: string;
  icon: string;
  url: string;
  openMode: CustomViewOpenMode;
}

/**
 * Hook para carregar as visualizações (predefinidas e customizadas) de um projeto.
 */
export function useProjectCustomViews(projectId: string | null | undefined) {
  const query = useQuery({
    queryKey: queryKeys.customViews(projectId),
    queryFn: async (): Promise<CustomProjectView[]> => {
      if (!projectId) return [];
      const res = await ideCrmClient.listProjectCustomViews(projectId);
      return res.views || getDefaultProjectViews(projectId);
    },
    enabled: Boolean(projectId),
    initialData: projectId ? getDefaultProjectViews(projectId) : [],
    staleTime: 1000 * 60 * 5,
  });

  return {
    views: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Mutation otimista para salvar (criar ou editar) uma visualização customizada.
 */
export function useSaveCustomView(projectId: string | null | undefined) {
  const queryClient = useQueryClient();
  const key = queryKeys.customViews(projectId);

  return useMutation({
    mutationFn: async (viewData: SaveCustomViewInput) => {
      if (!projectId) throw new Error("projectId é obrigatório");

      const current = queryClient.getQueryData<CustomProjectView[]>(key) ?? getDefaultProjectViews(projectId);

      let nextList: CustomProjectView[];
      if (viewData.id) {
        nextList = current.map((v) =>
          v.id === viewData.id
            ? {
                ...v,
                name: viewData.name,
                icon: viewData.icon,
                url: viewData.url,
                openMode: viewData.openMode,
                updatedAt: new Date().toISOString(),
              }
            : v
        );
      } else {
        const newView: CustomProjectView = {
          id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          name: viewData.name,
          icon: viewData.icon,
          url: viewData.url,
          openMode: viewData.openMode,
          order: current.length,
          type: "custom",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        nextList = [...current, newView];
      }

      await ideCrmClient.saveProjectCustomViews(projectId, nextList);
      return nextList;
    },
    onMutate: async (viewData) => {
      if (!projectId) return;
      await queryClient.cancelQueries({ queryKey: key });

      const previousViews = queryClient.getQueryData<CustomProjectView[]>(key) ?? [];

      let optimisticViews: CustomProjectView[];
      if (viewData.id) {
        optimisticViews = previousViews.map((v) =>
          v.id === viewData.id
            ? {
                ...v,
                name: viewData.name,
                icon: viewData.icon,
                url: viewData.url,
                openMode: viewData.openMode,
                updatedAt: new Date().toISOString(),
              }
            : v
        );
      } else {
        const tempView: CustomProjectView = {
          id: `view_temp_${Date.now()}`,
          projectId,
          name: viewData.name,
          icon: viewData.icon,
          url: viewData.url,
          openMode: viewData.openMode,
          order: previousViews.length,
          type: "custom",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        optimisticViews = [...previousViews, tempView];
      }

      queryClient.setQueryData<CustomProjectView[]>(key, optimisticViews);
      return { previousViews };
    },
    onError: (_err, _viewData, context) => {
      if (context?.previousViews) {
        queryClient.setQueryData<CustomProjectView[]>(key, context.previousViews);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Mutation otimista para excluir uma visualização customizada.
 */
export function useDeleteCustomView(projectId: string | null | undefined) {
  const queryClient = useQueryClient();
  const key = queryKeys.customViews(projectId);

  return useMutation({
    mutationFn: async (viewId: string) => {
      if (!projectId) throw new Error("projectId é obrigatório");
      await ideCrmClient.deleteProjectCustomView(projectId, viewId);
      return viewId;
    },
    onMutate: async (viewId) => {
      if (!projectId) return;
      await queryClient.cancelQueries({ queryKey: key });

      const previousViews = queryClient.getQueryData<CustomProjectView[]>(key) ?? [];
      const optimisticViews = previousViews.filter((v) => v.id !== viewId);

      queryClient.setQueryData<CustomProjectView[]>(key, optimisticViews);
      return { previousViews };
    },
    onError: (_err, _viewId, context) => {
      if (context?.previousViews) {
        queryClient.setQueryData<CustomProjectView[]>(key, context.previousViews);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

/**
 * Mutation otimista para reordenar visualizações de um projeto.
 */
export function useReorderCustomViews(projectId: string | null | undefined) {
  const queryClient = useQueryClient();
  const key = queryKeys.customViews(projectId);

  return useMutation({
    mutationFn: async (newViews: CustomProjectView[]) => {
      if (!projectId) throw new Error("projectId é obrigatório");
      await ideCrmClient.saveProjectCustomViews(projectId, newViews);
      return newViews;
    },
    onMutate: async (newViews) => {
      if (!projectId) return;
      await queryClient.cancelQueries({ queryKey: key });

      const previousViews = queryClient.getQueryData<CustomProjectView[]>(key) ?? [];
      queryClient.setQueryData<CustomProjectView[]>(key, newViews);

      return { previousViews };
    },
    onError: (_err, _newViews, context) => {
      if (context?.previousViews) {
        queryClient.setQueryData<CustomProjectView[]>(key, context.previousViews);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
