"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Clock3 } from "lucide-react";
import type { CrmNotification } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function HeaderNotifications({ connected }: { connected: boolean }) {
  const [items, setItems] = useState<CrmNotification[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      setItems((current) => current.map((notification) =>
        notification.id === item.id ? { ...notification, readAt: new Date().toISOString() } : notification
      ));
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

  return (
    <Popover
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={`Notificações${count ? `, ${count} não lidas` : ""}`}
        >
          <Bell className="size-4" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 text-[9px] text-destructive-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Notificações</h2>
            <p className="text-xs text-muted-foreground">{count} não lidas</p>
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
        {error && <p role="alert" className="p-4 text-sm text-destructive">{error}</p>}
        <div className="max-h-96 overflow-y-auto">
          {!connected ? (
            <p className="p-4 text-sm text-muted-foreground">
              Conecte-se ao CRM para ver suas notificações.
            </p>
          ) : loading && !items.length ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : !items.length ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhuma notificação.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void markRead(item)}
                className={`flex w-full gap-3 border-b border-border p-3 text-left last:border-0 hover:bg-muted/50 ${item.readAt ? "opacity-60" : ""}`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCheck className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  {item.message && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.message}
                    </span>
                  )}
                  <span className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3" />
                    {new Date(item.createdAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                {!item.readAt && (
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
