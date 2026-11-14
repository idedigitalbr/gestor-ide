"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Layers,
  UserCheck,
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
import { Switch } from "@/components/ui/switch";
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
  onlyMyTaskNotifications = false,
  onOnlyMyTaskNotificationsChange,
  onSelectTask,
}: HeaderNotificationsProps) {
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [userTabOverride, setUserTabOverride] = useState<"all" | "mine" | null>(null);
  const filterTab = userTabOverride ?? (onlyMyTaskNotifications ? "mine" : "all");

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

  async function markAllAsRead() {
    const unread = items.filter((i) => !i.readAt);
    if (!unread.length) return;
    setItems((current) =>
      current.map((notification) => ({
        ...notification,
        readAt: notification.readAt || new Date().toISOString(),
      }))
    );
    setCount(0);
    await Promise.allSettled(
      unread.map((notification) => ideCrmClient.markNotificationRead(notification.id))
    );
  }

  // Prepara metadados para cada notificação
  const itemsWithMeta = useMemo(() => {
    return items.map((item) => ({
      item,
      meta: resolveNotificationMeta(item, tasks, projects, currentUser),
    }));
  }, [items, tasks, projects, currentUser]);

  // Contagem de não lidas específicas de tarefas do usuário
  const unreadMineCount = useMemo(() => {
    return itemsWithMeta.filter(({ item, meta }) => !item.readAt && meta.isMyTask).length;
  }, [itemsWithMeta]);

  // Itens filtrados pela aba ativa
  const displayedItems = useMemo(() => {
    if (filterTab === "mine") {
      return itemsWithMeta.filter(({ meta }) => meta.isMyTask);
    }
    return itemsWithMeta;
  }, [itemsWithMeta, filterTab]);

  // Contador de não lidas exibido no sino (respeita preferência do usuário)
  const bellBadgeCount = onlyMyTaskNotifications ? unreadMineCount : count;

  function handleItemClick(item: CrmNotification, meta: NotificationMeta) {
    void markRead(item);
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
          aria-label={`Notificações${bellBadgeCount ? `, ${bellBadgeCount} não lidas` : ""}`}
        >
          <Bell className="size-4" />
          {bellBadgeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {bellBadgeCount > 9 ? "9+" : bellBadgeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(26rem,calc(100vw-1rem))] p-0 shadow-lg">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
            <p className="text-xs text-muted-foreground">
              {bellBadgeCount === 0 ? "Todas em dia" : `${bellBadgeCount} não lida${bellBadgeCount > 1 ? "s" : ""}`}
            </p>
          </div>
          {count > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Abas e Filtro Rápido */}
        <div className="flex flex-col border-b border-border bg-muted/20 px-3 py-2 gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-md bg-muted/60 p-0.5">
              <button
                type="button"
                onClick={() => setUserTabOverride("all")}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  filterTab === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todas ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setUserTabOverride("mine")}
                className={cn(
                  "flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  filterTab === "mine"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>Minhas tarefas</span>
                {unreadMineCount > 0 && (
                  <span className="rounded-full bg-primary/20 px-1 text-[10px] font-semibold text-primary">
                    {unreadMineCount}
                  </span>
                )}
              </button>
            </div>

            {onOnlyMyTaskNotificationsChange && (
              <label
                htmlFor="notif-filter-toggle"
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer select-none"
                title="Ativar filtro padrão para ver apenas notificações de tarefas onde você é responsável"
              >
                <span className="hidden sm:inline">Somente minhas</span>
                <Switch
                  id="notif-filter-toggle"
                  checked={onlyMyTaskNotifications}
                  onCheckedChange={(val) => {
                    onOnlyMyTaskNotificationsChange(val);
                    setUserTabOverride(val ? "mine" : "all");
                  }}
                />
              </label>
            )}
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
              {filterTab === "mine" ? (
                <>
                  <UserCheck className="mx-auto mb-2 size-6 text-muted-foreground/60" />
                  <p className="font-medium text-foreground">Nenhuma notificação das suas tarefas.</p>
                  <p className="text-xs mt-1">Mude para a aba &quot;Todas&quot; para ver os alertas gerais da equipe.</p>
                </>
              ) : (
                <p>Nenhuma notificação no momento.</p>
              )}
            </div>
          ) : (
            displayedItems.map(({ item, meta }) => {
              const isStatus = item.title.toLowerCase().includes("status");
              const isReminder = item.title.toLowerCase().includes("lembrete");

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item, meta)}
                  className={cn(
                    "group flex w-full gap-3 p-3 text-left transition-colors cursor-pointer hover:bg-muted/50",
                    item.readAt ? "opacity-75" : "bg-primary/5"
                  )}
                  title={meta.matchedTask ? "Clique para abrir esta tarefa" : "Clique para marcar como lida"}
                >
                  {/* Ícone contextual */}
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
                      meta.isMyTask
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {meta.isMyTask ? (
                      <UserCheck className="size-4" />
                    ) : isStatus ? (
                      <CheckCircle2 className="size-4" />
                    ) : isReminder ? (
                      <Clock3 className="size-4" />
                    ) : (
                      <CheckCheck className="size-4" />
                    )}
                  </span>

                  {/* Detalhes da notificação */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {item.title}
                      </span>
                      {!item.readAt && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" title="Não lida" />
                      )}
                    </div>

                    {item.message && (
                      <p className="mt-0.5 text-xs font-medium text-foreground/90 line-clamp-2">
                        {item.message}
                      </p>
                    )}

                    {/* Metadados e Tags */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {meta.isMyTask ? (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          Sua tarefa
                        </Badge>
                      ) : (
                        <Badge variant="subtle" className="text-[10px] px-1.5 py-0">
                          Geral do projeto
                        </Badge>
                      )}

                      {meta.projectName && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground truncate max-w-[120px]">
                          <Layers className="size-3 shrink-0" />
                          <span className="truncate">{meta.projectName}</span>
                        </span>
                      )}

                      {meta.status && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
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

                    {/* Ação ao passar o mouse */}
                    {meta.matchedTask && (
                      <div className="mt-1.5 hidden items-center gap-1 text-[11px] font-medium text-primary group-hover:flex">
                        <span>Abrir tarefa</span>
                        <ExternalLink className="size-3" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
