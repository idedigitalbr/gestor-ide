"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrmProjectTask } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { queryKeys } from "./query-client";

export interface TaskQueryParams {
  projectId?: string;
  status?: string;
  search?: string;
}

/**
 * Consulta tarefas do CRM com suporte a filtro por projeto, status ou termo de busca.
 */
export function useTasks(params?: TaskQueryParams) {
  const query = useQuery({
    queryKey: queryKeys.tasks(params as Record<string, unknown> | undefined),
    queryFn: async (): Promise<CrmProjectTask[]> => {
      const res = await ideCrmClient.listTasks(params);
      return res.tasks || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Mutation para criação de tarefas no CRM.
 */
export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      projectId: string;
      parentTaskId?: string;
      assigneeIds?: string[];
      title: string;
      description?: string | null;
      status?: string;
      priority?: "low" | "medium" | "high" | "urgent";
      startDate?: string | null;
      dueDate?: string | null;
      estimateMinutes?: number | null;
      tags?: string[];
    }) => {
      return ideCrmClient.createTask(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Mutation para atualização de campos da tarefa.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      updates,
    }: {
      taskId: string;
      updates: Record<string, unknown>;
    }) => {
      return ideCrmClient.updateTask(taskId, updates);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.task(variables.taskId),
      });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Mutation para exclusão de uma tarefa.
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      return ideCrmClient.deleteTask(taskId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Mutation para definir responsáveis de uma tarefa.
 */
export function useSetTaskAssignees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      assigneeIds,
    }: {
      taskId: string;
      assigneeIds: string[];
    }) => {
      return ideCrmClient.setTaskAssignees(taskId, assigneeIds);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.task(variables.taskId),
      });
    },
  });
}
