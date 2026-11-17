"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrmProjectManagement } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { queryKeys } from "./query-client";

/**
 * Consulta todas as gestões da organização através da API remota do IDE CRM.
 */
export function useManagements() {
  const query = useQuery({
    queryKey: queryKeys.managements(),
    queryFn: async (): Promise<CrmProjectManagement[]> => {
      const res = await ideCrmClient.listManagements();
      return res.managements || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    managements: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Mutation para criar uma nova gestão.
 */
export function useCreateManagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      ownerUserId?: string;
      memberIds?: string[];
    }) => {
      return ideCrmClient.createManagement(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
    },
  });
}

/**
 * Mutation para atualizar uma gestão existente.
 */
export function useUpdateManagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      managementId,
      updates,
    }: {
      managementId: string;
      updates: {
        name?: string;
        description?: string;
        color?: string;
        coverPath?: string | null;
        visibility?: string;
        status?: string;
      };
    }) => {
      return ideCrmClient.updateManagement(managementId, updates);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.management(variables.managementId),
      });
    },
  });
}

/**
 * Mutation para excluir uma gestão.
 */
export function useDeleteManagement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (managementId: string) => {
      return ideCrmClient.deleteManagement(managementId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
    },
  });
}

/**
 * Consulta membros de uma gestão específica.
 */
export function useManagementMembers(managementId: string | null | undefined) {
  const query = useQuery({
    queryKey: queryKeys.managementMembers(managementId),
    queryFn: async () => {
      if (!managementId) return [];
      const res = await ideCrmClient.listManagementMembers(managementId);
      return res.members || [];
    },
    enabled: Boolean(managementId),
    staleTime: 1000 * 60 * 5,
  });

  return {
    members: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

/**
 * Mutation para adicionar membro a uma gestão.
 */
export function useAddManagementMember(managementId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { userId?: string; email?: string; role?: string }) => {
      if (!managementId) throw new Error("managementId é obrigatório");
      return ideCrmClient.addManagementMember(managementId, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.managementMembers(managementId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
    },
  });
}

/**
 * Mutation para alterar papel de membro em uma gestão.
 */
export function useUpdateManagementMemberRole(managementId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!managementId) throw new Error("managementId é obrigatório");
      return ideCrmClient.updateManagementMemberRole(managementId, userId, role);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.managementMembers(managementId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
    },
  });
}

/**
 * Mutation para remover membro de uma gestão.
 */
export function useRemoveManagementMember(managementId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!managementId) throw new Error("managementId é obrigatório");
      return ideCrmClient.removeManagementMember(managementId, userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.managementMembers(managementId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
    },
  });
}
