"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrmProject, CrmProjectMember } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { queryKeys } from "./query-client";

/**
 * Consulta todos os projetos da organização ou filtra por busca.
 */
export function useProjects(search?: string) {
  const query = useQuery({
    queryKey: ["projects", "list", search ?? ""],
    queryFn: async (): Promise<CrmProject[]> => {
      const res = await ideCrmClient.listProjects(search);
      return res.projects || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Mutation para criar um novo projeto em uma gestão.
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      managementId,
      input,
    }: {
      managementId: string;
      input: { name: string; description?: string };
    }) => {
      return ideCrmClient.createProject(managementId, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
    },
  });
}

/**
 * Mutation para atualizar dados de um projeto.
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      updates,
    }: {
      projectId: string;
      updates: {
        name?: string;
        description?: string;
        color?: string;
        coverPath?: string | null;
        visibility?: string;
        status?: string;
      };
    }) => {
      return ideCrmClient.updateProject(projectId, updates);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.project(variables.projectId),
      });
    },
  });
}

/**
 * Mutation para excluir um projeto.
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      return ideCrmClient.deleteProject(projectId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.managements() });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/**
 * Consulta membros de um projeto ou todos os membros da organização.
 */
export function useProjectMembers(projectId?: string | null) {
  const query = useQuery({
    queryKey: queryKeys.projectMembers(projectId),
    queryFn: async (): Promise<CrmProjectMember[]> => {
      const res = await ideCrmClient.listProjectMembers(projectId ?? undefined);
      return res.members || [];
    },
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
 * Mutation para adicionar membro ao projeto.
 */
export function useAddProjectMember(projectId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { userId?: string; email?: string; role?: string }) => {
      if (!projectId) throw new Error("projectId é obrigatório");
      return ideCrmClient.addProjectMember(projectId, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectMembers(projectId),
      });
    },
  });
}

/**
 * Mutation para alterar papel de membro no projeto.
 */
export function useUpdateProjectMemberRole(projectId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      if (!projectId) throw new Error("projectId é obrigatório");
      return ideCrmClient.updateProjectMemberRole(projectId, userId, role);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectMembers(projectId),
      });
    },
  });
}

/**
 * Mutation para remover membro do projeto.
 */
export function useRemoveProjectMember(projectId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!projectId) throw new Error("projectId é obrigatório");
      return ideCrmClient.removeProjectMember(projectId, userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.projectMembers(projectId),
      });
    },
  });
}
