"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Layers,
} from "lucide-react";
import {
  normalizeTaskStatus,
  type CrmNotification,
  type CrmProject,
  type CrmUserProfile,
  type Task,
} from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface HeaderNotificationsProps {
  connected: boolean;
  currentUser?: CrmUserProfile | null;
  tasks?: Task[];
  projects?: CrmProject[];
  onlyMyTaskNotifications?: boolean;
  onOnlyMyTaskNotificationsChange?: (value: boolean) => void;
  onSelectTask?: (task: Task) => void;
}

interface NotificationMeta {
  matchedTask?: Task;
  projectName?: string;
  isMyTask: boolean;
  status?: string | null;
}

function resolveNotificationMeta(
  item: CrmNotification,
  tasks: Task[] = [],
  projects: CrmProject[] = [],
  currentUser?: CrmUserProfile | null
): NotificationMeta {
  let matchedTask: Task | undefined;

  // 1. Busca por taskId ou code
  if (item.taskId) {
    matchedTask = tasks.find((t) => t.id === item.taskId || t.code === item.taskId);
  }

  // 2. Busca por mensagem (no CRM o nome da tarefa vem frequentemente na mensagem)
  if (!matchedTask && item.message) {
    const cleanMsg = item.message.trim().toLowerCase();
    matchedTask = tasks.find((t) => {
      const cleanTitle = t.title.trim().toLowerCase();
      return (
        cleanTitle === cleanMsg ||
        cleanMsg.includes(cleanTitle) ||
        cleanTitle.includes(cleanMsg)
      );
    });
  }

  // 3. Busca por título
  if (!matchedTask && item.title) {
    const cleanTitle = item.title.trim().toLowerCase();
    matchedTask = tasks.find((t) => {
      const tTitle = t.title.trim().toLowerCase();
      return tTitle === cleanTitle || cleanTitle.includes(tTitle);
    });
  }

  // Nome do projeto
  let projectName = item.projectName ?? undefined;
  if (!projectName && matchedTask) {
    projectName =
      matchedTask.projectName ||
      projects.find((p) => p.id === matchedTask?.projectId)?.name;
  }

  // Verifica se o usuário logado é participante/responsável da tarefa
  let isMyTask = false;
  if (currentUser?.id && matchedTask) {
    const userIds =
      matchedTask.assigneeIds ??
      (matchedTask.assigneeId ? [matchedTask.assigneeId] : []);
    const isDirectAssignee = userIds.includes(currentUser.id);
    const isNameAssignee = Boolean(
      matchedTask.assignee &&
        (matchedTask.assignee.toLowerCase() === currentUser.name?.toLowerCase() ||
          matchedTask.assignee.toLowerCase() === currentUser.email?.toLowerCase())
    );
    isMyTask = isDirectAssignee || isNameAssignee;
  }

  return {
    matchedTask,
    projectName,
    isMyTask,
    status: matchedTask?.status ? normalizeTaskStatus(matchedTask.status) : null,
  };
}

export function HeaderNotifications({
  connected,
  currentUser,
  tasks = [],
  projects = [],
  onlyMyTaskNotifications = true,
  onSelectTask,
}: HeaderNotificationsProps) {
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [, setCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "read">("unread");

  const pendingIds = useRef(new Set<string>());
  const revision = useRef(0);

  const load = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    const startedAt = revision.current;
    try {
      const result = await ideCrmClient.listNotifications();
      if (startedAt !== revision.current) return;
      setItems(result.notifications);
      setCount(result.unreadCount);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível carregar as notificações."
      );
    } finally {
      setLoading(false);
    }
  }, [connected]);

  useEffect(() => {
    if (!connected) return;
    void Promise.resolve().then(load);
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [connected, load]);

  async function markRead(item: CrmNotification) {
    if (item.readAt || pendingIds.current.has(item.id)) return;
    pendingIds.current.add(item.id);
    try {
      await ideCrmClient.markNotificationRead(item.id);
      revision.current += 1;
      setItems((current) =>
        current.map((notification) =>
          notification.id === item.id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        )
      );
      setCount((current) => Math.max(0, current - 1));
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível atualizar a notificação."
      );
    } finally {
      pendingIds.current.delete(item.id);
    }
  }

  // Prepara metadados para cada notificação
  const itemsWithMeta = useMemo(() => {
    return items.map((item) => ({
      item,
      meta: resolveNotificationMeta(item, tasks, projects, currentUser),
    }));
  }, [items, tasks, projects, currentUser]);

  // Filtra por "Somente minhas tarefas" quando a preferência estiver ativa (padrão true)
  const filteredItems = useMemo(() => {
    if (onlyMyTaskNotifications) {
      return itemsWithMeta.filter(({ meta }) => meta.isMyTask);
    }
    return itemsWithMeta;
  }, [itemsWithMeta, onlyMyTaskNotifications]);

  const unreadItems = useMemo(
    () => filteredItems.filter(({ item }) => !item.readAt),
    [filteredItems]
  );

  const readItems = useMemo(
    () => filteredItems.filter(({ item }) => Boolean(item.readAt)),
    [filteredItems]
  );

  const displayedItems = tab === "unread" ? unreadItems : readItems;
  const unreadCount = unreadItems.length;
  const readCount = readItems.length;

  async function markAllAsRead() {
    if (!unreadItems.length) return;
    const idsToMark = unreadItems.map(({ item }) => item.id);
    setItems((current) =>
      current.map((notification) =>
        idsToMark.includes(notification.id)
          ? { ...notification, readAt: notification.readAt || new Date().toISOString() }
          : notification
      )
    );
    setCount((prev) => Math.max(0, prev - idsToMark.length));
    await Promise.allSettled(
      idsToMark.map((id) => ideCrmClient.markNotificationRead(id))
    );
  }

  function handleCardClick(item: CrmNotification, meta: NotificationMeta) {
    if (!item.readAt) {
      void markRead(item);
    }
    if (meta.matchedTask && onSelectTask) {
      onSelectTask(meta.matchedTask);
      setIsOpen(false);
    }
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 cursor-pointer"
          aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`}
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-0 shadow-lg">
        {/* Cabeçalho Limpo */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="text-xs font-medium text-primary hover:underline cursor-pointer"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Abas Limpas: Não Lidas | Lidas */}
        <div className="border-b border-border bg-muted/20 px-3 py-2">
          <div className="flex rounded-md bg-muted/60 p-0.5">
            <button
              type="button"
              onClick={() => setTab("unread")}
              className={cn(
                "flex-1 rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer text-center",
                tab === "unread"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Não Lidas {unreadCount > 0 ? `(${unreadCount})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setTab("read")}
              className={cn(
                "flex-1 rounded px-3 py-1 text-xs font-medium transition-colors cursor-pointer text-center",
                tab === "read"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Lidas {readCount > 0 ? `(${readCount})` : ""}
            </button>
          </div>
        </div>

        {error && <p role="alert" className="p-4 text-sm text-destructive">{error}</p>}

        {/* Lista de Notificações */}
        <div className="max-h-[22rem] overflow-y-auto divide-y divide-border">
          {!connected ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Conecte-se ao CRM para ver suas notificações.
            </p>
          ) : loading && !items.length ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : !displayedItems.length ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {tab === "unread" ? (
                <p>Nenhuma notificação não lida.</p>
              ) : (
                <p>Nenhuma notificação lida.</p>
              )}
            </div>
          ) : (
            displayedItems.map(({ item, meta }) => {
              const isStatus = item.title.toLowerCase().includes("status");

              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item, meta)}
                  className={cn(
                    "group flex w-full items-start gap-3 p-3 text-left transition-colors cursor-pointer hover:bg-muted/50",
                    item.readAt ? "opacity-75" : "bg-primary/5"
                  )}
                  title={meta.matchedTask ? "Clique para abrir a tarefa" : undefined}
                >
                  {/* Ícone discreto */}
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground mt-0.5">
                    {isStatus ? (
                      <CheckCircle2 className="size-3.5" />
                    ) : (
                      <Bell className="size-3.5" />
                    )}
                  </span>

                  {/* Conteúdo textual */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-muted-foreground truncate">
                      {item.title}
                    </p>

                    {item.message && (
                      <p className="mt-0.5 text-xs font-semibold text-foreground line-clamp-2">
                        {item.message}
                      </p>
                    )}

                    {/* Metadados: Projeto, Status e Hora */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {meta.projectName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground truncate max-w-[130px]">
                          <Layers className="size-3 shrink-0" />
                          <span className="truncate">{meta.projectName}</span>
                        </span>
                      )}

                      {meta.status && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                          {meta.status}
                        </Badge>
                      )}

                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock3 className="size-3" />
                        {new Date(item.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Checkzinho na direita */}
                  <div className="shrink-0 self-center pl-1">
                    {!item.readAt ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void markRead(item);
                        }}
                        className="flex size-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        title="Marcar como lida"
                        aria-label="Marcar como lida"
                      >
                        <Check className="size-3" />
                      </button>
                    ) : (
                      <span
                        className="flex size-6 items-center justify-center text-muted-foreground/60"
                        title="Lida"
                      >
                        <CheckCheck className="size-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
