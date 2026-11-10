"use client";

import React, { useState } from "react";
import type { CrmUserProfile } from "@gestor-ide/core";
import { setStoredCrmToken } from "@gestor-ide/auth";
import { ideCrmClient } from "@gestor-ide/sdk";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle2,
  CloudOff,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

interface CrmConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  isApiReachable: boolean;
  currentUser: CrmUserProfile | null;
  onSuccessConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function CrmConnectionDialog({
  isOpen,
  onClose,
  isConnected,
  isApiReachable,
  currentUser,
  onSuccessConnect,
  onDisconnect,
}: CrmConnectionDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mcpToken, setMcpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      await ideCrmClient.login(email.trim(), password, "IDE Gestor Web");
      setPassword("");
      await onSuccessConnect();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível autenticar na API do IDE CRM."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTokenLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = mcpToken.trim();
    if (!cleaned) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      setStoredCrmToken(cleaned);
      const session = await ideCrmClient.getSession();
      if (!session.authenticated) {
        setStoredCrmToken(null);
        throw new Error("Token inválido ou expirado no IDE CRM.");
      }
      setMcpToken("");
      await onSuccessConnect();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Falha ao validar token MCP."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await onDisconnect();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-popover text-popover-foreground border-border p-5">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Integração IDE CRM</span>
            </DialogTitle>
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 border-border bg-secondary text-secondary-foreground"
            >
              {isConnected
                ? "Sincronizado"
                : isApiReachable
                  ? "API Online · Aguardando Login"
                  : "Modo Local"}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            O IDE Gestor compartilha usuários, permissões, projetos, tarefas,
            clientes e financeiro diretamente com a API central do IDE CRM.
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-border my-2" />

        {isConnected && currentUser ? (
          <div className="flex flex-col gap-3 py-1 text-xs">
            <div className="p-3 rounded-md border border-border bg-card flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-md bg-secondary text-secondary-foreground border border-border flex items-center justify-center font-semibold text-xs shrink-0">
                  {(currentUser.name || currentUser.email || "U")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                    <span>{currentUser.name || "Usuário IDE"}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] uppercase border-border text-muted-foreground shrink-0"
              >
                {currentUser.role}
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Módulos Habilitados na Conta
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={currentUser.modules?.projects ? "default" : "outline"}
                  className="text-[10px]"
                >
                  Projetos & Tarefas
                </Badge>
                <Badge
                  variant={currentUser.modules?.crm ? "default" : "outline"}
                  className="text-[10px]"
                >
                  CRM & Clientes
                </Badge>
                <Badge
                  variant={currentUser.modules?.finance ? "default" : "outline"}
                  className="text-[10px]"
                >
                  Financeiro
                </Badge>
              </div>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={loading}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Desconectar</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await onSuccessConnect();
                    onClose();
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar Agora</span>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-8 bg-muted/60">
              <TabsTrigger value="credentials" className="text-xs gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Conta IDE CRM</span>
              </TabsTrigger>
              <TabsTrigger value="token" className="text-xs gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Token MCP</span>
              </TabsTrigger>
            </TabsList>

            {errorMessage && (
              <div className="mt-2.5 p-2.5 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <CloudOff className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <TabsContent value="credentials" className="mt-3">
              <form onSubmit={handleCredentialsLogin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    E-mail do Usuário (IDE CRM)
                  </label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@suporteide.digital"
                    className="h-8 text-xs bg-background border-border"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Senha
                  </label>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-8 text-xs bg-background border-border"
                  />
                </div>
                <DialogFooter className="pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Continuar em Modo Demo
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{loading ? "Conectando..." : "Entrar e Sincronizar"}</span>
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="token" className="mt-3">
              <form onSubmit={handleTokenLogin} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Token de Acesso do IDE CRM (`sp_mcp_...`)
                  </label>
                  <Input
                    type="password"
                    required
                    value={mcpToken}
                    onChange={(e) => setMcpToken(e.target.value)}
                    placeholder="sp_mcp_..."
                    className="h-8 text-xs bg-background border-border font-mono"
                  />
                </div>
                <DialogFooter className="pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{loading ? "Validando..." : "Validar Token"}</span>
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
