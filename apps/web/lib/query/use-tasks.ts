"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CrmProjectComment, CrmProjectTask } from "@gestor-ide/core";
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
 * Mutation otimista para atualização de status (ideal para Drag and Drop no Kanban).
 */
export function useUpdateTaskStatus(params?: TaskQueryParams) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.tasks(params as Record<string, unknown> | undefined);

  return useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
    }: {
      taskId: string;
      newStatus: string;
    }) => {
      return ideCrmClient.updateTask(taskId, { status: newStatus });
    },
    onMutate: async ({ taskId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: listKey });

      const previousTasks = queryClient.getQueryData<CrmProjectTask[]>(listKey) ?? [];
      const optimisticTasks = previousTasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );

      queryClient.setQueryData<CrmProjectTask[]>(listKey, optimisticTasks);
      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData<CrmProjectTask[]>(listKey, context.previousTasks);
      }
    },
    onSettled: (_data, _err, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.task(vars.taskId) });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
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

/**
 * Consulta comentários de uma tarefa.
 */
export function useTaskComments(taskId: string | null | undefined) {
  const query = useQuery({
    queryKey: queryKeys.taskComments(taskId),
    queryFn: async (): Promise<CrmProjectComment[]> => {
      if (!taskId) return [];
      const res = await ideCrmClient.listTaskComments(taskId);
      return res.comments || [];
    },
    enabled: Boolean(taskId),
    staleTime: 1000 * 60 * 2,
  });

  return {
    comments: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

/**
 * Mutation para adicionar comentário a uma tarefa.
 */
export function useCreateTaskComment(taskId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      if (!taskId) throw new Error("taskId é obrigatório");
      return ideCrmClient.createTaskComment(taskId, content);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(taskId),
      });
    },
  });
}

/**
 * Mutation para criar item de checklist em uma tarefa.
 */
export function useCreateChecklistItem(taskId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title: string) => {
      if (!taskId) throw new Error("taskId é obrigatório");
      return ideCrmClient.createChecklistItem(taskId, title);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    },
  });
}

/**
 * Mutation para alternar conclusão ou título de item de checklist.
 */
export function useUpdateChecklistItem(taskId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      updates,
    }: {
      itemId: string;
      updates: { completed?: boolean; title?: string };
    }) => {
      if (!taskId) throw new Error("taskId é obrigatório");
      return ideCrmClient.updateChecklistItem(taskId, itemId, updates);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    },
  });
}

/**
 * Mutation para excluir item de checklist.
 */
export function useDeleteChecklistItem(taskId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      if (!taskId) throw new Error("taskId é obrigatório");
      return ideCrmClient.deleteChecklistItem(taskId, itemId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.task(taskId) });
    },
  });
}
