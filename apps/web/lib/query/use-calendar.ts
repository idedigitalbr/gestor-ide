"use client";

import { useQuery } from "@tanstack/react-query";
import type { CrmCalendarEvent, CrmCalendarTaskItem } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { queryKeys } from "./query-client";

export interface CalendarQueryParams {
  start: string;
  end: string;
  projectId?: string | null;
}

export interface CalendarQueryResult {
  events: CrmCalendarEvent[];
  tasks: CrmCalendarTaskItem[];
  isFallback: boolean;
}

/**
 * Hook reativo para consultar eventos e tarefas no calendário corporativo do IDE Gestor.
 * Totalmente integrado ao TanStack Query, com suporte a fallback de tarefas e cache persistente no IndexedDB.
 */
export function useCalendarEvents(params: CalendarQueryParams) {
  const query = useQuery({
    queryKey: queryKeys.calendar(params as unknown as Record<string, unknown>),
    queryFn: async (): Promise<CalendarQueryResult> => {
      try {
        const r = await ideCrmClient.getCalendar(
          params.start,
          params.end,
          params.projectId || null
        );
        return {
          events: r.events ?? [],
          tasks: r.tasks ?? [],
          isFallback: false,
        };
      } catch {
        const result = await ideCrmClient.listCalendarFallbackTasks(
          params.projectId || null
        );
        const month = params.start.slice(0, 7);
        const fallbackTasks: CrmCalendarTaskItem[] = result.tasks
          .filter(
            (task) =>
              (task.dueDate ?? task.startDate)?.slice(0, 7) === month
          )
          .map((task) => ({
            id: task.id,
            projectId: task.projectId,
            title: task.title,
            description: task.description ?? null,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate ?? null,
            dueDate: task.dueDate ?? null,
            project: task.project ?? null,
            assignees: task.assignees?.flatMap((a) =>
              a.user
                ? [
                    {
                      user: {
                        id: a.user.id,
                        name: a.user.name,
                        avatarUrl: a.user.avatarUrl,
                      },
                    },
                  ]
                : []
            ),
          }));

        return {
          events: [],
          tasks: fallbackTasks,
          isFallback: true,
        };
      }
    },
    staleTime: 1000 * 60 * 2, // 2 minutos de frescor
  });

  return {
    events: query.data?.events ?? [],
    tasks: query.data?.tasks ?? [],
    isFallback: query.data?.isFallback ?? false,
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
