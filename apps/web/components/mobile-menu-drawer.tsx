"use client";

import React from "react";
import Link from "next/link";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Palette,
  RefreshCw,
  X,
} from "lucide-react";
import type { CrmUserProfile } from "@gestor-ide/core";
import { Button } from "@/components/ui/button";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import { ThemeSelector } from "@/components/theme/theme-selector";
import { useOfflineSyncStatus } from "@/lib/query";
import { useMobileBackButton } from "@/lib/use-mobile-back-button";
import { cn } from "@/lib/utils";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: CrmUserProfile | null;
  onLogout?: () => void;
}

export function MobileMenuDrawer({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}: MobileMenuDrawerProps) {
  useMobileBackButton({ isOpen, onClose, priority: 20 });

  const { isOnline, isSyncing, pendingCount, triggerSync } = useOfflineSyncStatus();

  if (!isOpen) return null;

  const displayName = currentUser?.name || currentUser?.email || "Usuário IDE Gestor";

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div className="relative z-10 w-full max-h-[85dvh] bg-card text-card-foreground border-t border-border rounded-t-2xl p-5 shadow-2xl flex flex-col gap-4 overflow-y-auto pb-safe animate-in slide-in-from-bottom duration-250">
        {/* Header com Avatar e Fechar */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-full bg-primary border border-border flex items-center justify-center text-xs font-bold text-primary-foreground overflow-hidden">
              <MemberAvatarContent
                name={displayName}
                src={currentUser?.avatarUrl}
                initialsLength={2}
              />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{displayName}</h3>
              {currentUser?.email && (
                <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Card de Status de Sincronização Offline */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-muted/40 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  isOnline ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              <span className="text-xs font-semibold text-foreground">
                {isOnline ? "Conexão Ativa (Online)" : "Modo Offline"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} alteração(ões) na fila local`
                : "Todas as tarefas sincronizadas"}
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!isOnline || isSyncing}
            onClick={() => void triggerSync()}
            className="h-9 px-3 text-xs gap-1.5 cursor-pointer shrink-0"
          >
            <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
          </Button>
        </div>

        {/* Links de Acesso Rápido */}
        <div className="space-y-1">
          <Link
            href="/projects/dashboard"
            onClick={onClose}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
          >
            <LayoutDashboard className="size-5 text-muted-foreground" />
            <span>Dashboard Executivo</span>
          </Link>

          <Link
            href="/projects/calendar"
            onClick={onClose}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-muted text-sm font-medium transition-colors"
          >
            <CalendarDays className="size-5 text-muted-foreground" />
            <span>Calendário de Tarefas</span>
          </Link>
        </div>

        {/* Seletor de Temas */}
        <div className="pt-2 border-t border-border/80">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Palette className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Tema Visual</span>
          </div>
          <ThemeSelector />
        </div>

        {/* Logout */}
        {onLogout && (
          <div className="pt-2 border-t border-border/80">
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-destructive hover:bg-destructive/10 text-sm font-medium transition-colors cursor-pointer"
            >
              <LogOut className="size-5" />
              <span>Sair da conta</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
