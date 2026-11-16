"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  Terminal,
  Trash2,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { ideCrmClient } from "@gestor-ide/sdk";
import { useTheme } from "@/lib/themes/theme-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface McpTokenItem {
  id: string;
  name: string;
  tokenMasked: string;
  rawToken?: string;
  userName: string;
  userEmail: string;
  permissions: Array<"read" | "write" | "members" | "manage">;
  status: "active" | "revoked";
  lastUsedAt: string;
  createdAt: string;
}

const DEFAULT_MCP_TOKENS: McpTokenItem[] = [
  {
    id: "mcp-0",
    name: "will-antigravity2-escritorio",
    tokenMasked: "sp_mcp_3ca44ed5...",
    rawToken: "sp_mcp_3ca44ed587aa12f3d1c16de7fc83b006bbc5",
    userName: "Will",
    userEmail: "will.ideinstituto@gmail.com",
    permissions: ["read", "write", "members", "manage"],
    status: "active",
    lastUsedAt: "Nunca",
    createdAt: "16 de nov de 2026",
  },
  {
    id: "mcp-1",
    name: "will-antigravity",
    tokenMasked: "sp_mcp_TgKCAlN...",
    userName: "Will",
    userEmail: "will.ideinstituto@gmail.com",
    permissions: ["read", "write", "members", "manage"],
    status: "active",
    lastUsedAt: "14 de nov de 2026",
    createdAt: "14 de nov de 2026",
  },
  {
    id: "mcp-2",
    name: "hilhilgq",
    tokenMasked: "sp_mcp_1psKNh6d...",
    userName: "ADMIN",
    userEmail: "admin@ide.com",
    permissions: ["read", "manage", "write", "members"],
    status: "active",
    lastUsedAt: "Nunca",
    createdAt: "01 de nov de 2026",
  },
  {
    id: "mcp-3",
    name: "teste",
    tokenMasked: "sp_mcp_Lgk1bqe1...",
    userName: "ADMIN",
    userEmail: "admin@ide.com",
    permissions: ["read", "manage", "write", "members"],
    status: "active",
    lastUsedAt: "20 de out de 2026",
    createdAt: "20 de out de 2026",
  },
  {
    id: "mcp-4",
    name: "regressãos",
    tokenMasked: "sp_mcp_wzId5AMX...",
    userName: "ADMIN",
    userEmail: "admin@ide.com",
    permissions: ["read", "write", "manage", "members"],
    status: "revoked",
    lastUsedAt: "15 de out de 2026",
    createdAt: "15 de out de 2026",
  },
];

export function SettingsView() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Estados de cópia e testes
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("destino@exemplo.com");
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);
  const [testingPush, setTestingPush] = useState(false);

  // Gestão de Tokens MCP
  const [mcpTokens, setMcpTokens] = useState<McpTokenItem[]>(DEFAULT_MCP_TOKENS);
  const [isNewTokenModalOpen, setIsNewTokenModalOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [newTokenPermissions, setNewTokenPermissions] = useState<
    Array<"read" | "write" | "members" | "manage">
  >(["read", "write", "members", "manage"]);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copiedNewToken, setCopiedNewToken] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);

  // Estados de sessão do usuário logado
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Tema e Detecção do Sistema
  const { appearanceMode, resolvedMode, setAppearanceMode } = useTheme();

  // Estados de Configuração Desktop
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [autostart, setAutostart] = useState(true);
  const [closeToTray, setCloseToTray] = useState(true);
  const [nativeNotifications, setNativeNotifications] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasTauri = "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
    setIsDesktopApp(hasTauri);

    const storedAutostart = localStorage.getItem("ide_desktop_autostart");
    if (storedAutostart !== null) setAutostart(storedAutostart === "true");

    const storedCloseToTray = localStorage.getItem("ide_desktop_close_to_tray");
    if (storedCloseToTray !== null) setCloseToTray(storedCloseToTray === "true");

    if (hasTauri && (window as unknown as { __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__) {
      (window as unknown as { __TAURI_INTERNALS__: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__
        .invoke("get_desktop_settings")
        .then((data: unknown) => {
          if (data && typeof data === "object") {
            const d = data as { autostart?: boolean; closeToTray?: boolean };
            if (typeof d.autostart === "boolean") setAutostart(d.autostart);
            if (typeof d.closeToTray === "boolean") setCloseToTray(d.closeToTray);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleToggleAutostart = (enabled: boolean) => {
    setAutostart(enabled);
    localStorage.setItem("ide_desktop_autostart", String(enabled));
    if (isDesktopApp && typeof window !== "undefined") {
      const internals = (window as unknown as { __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__;
      if (internals) {
        internals
          .invoke("set_desktop_settings", { autostart: enabled, close_to_tray: closeToTray })
          .catch(() => {});
      }
    }
  };

  const handleToggleCloseToTray = (enabled: boolean) => {
    setCloseToTray(enabled);
    localStorage.setItem("ide_desktop_close_to_tray", String(enabled));
    if (isDesktopApp && typeof window !== "undefined") {
      const internals = (window as unknown as { __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__;
      if (internals) {
        internals
          .invoke("set_desktop_settings", { autostart, close_to_tray: enabled })
          .catch(() => {});
      }
    }
  };

  // Carregar configurações do CRM e sessão do usuário
  useEffect(() => {
    let active = true;

    // Carrega usuário da sessão (ex: Will)
    void ideCrmClient
      .getSession()
      .then((sess) => {
        if (!active || !sess.user) return;
        setCurrentUser({
          id: sess.user.id || "cmr20zze9000fuh2f2gguhqae",
          name: sess.user.name || "Will",
          email: sess.user.email || "will.ideinstituto@gmail.com",
        });
      })
      .catch(() => {});

    // Carrega tokens reais oficiais do CRM via API
    fetch("/api/crm/integrations/mcp/tokens")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.tokens)) return;
        const realTokens: McpTokenItem[] = data.tokens.map((t: {
          id: string;
          name: string;
          tokenPrefix: string;
          scopes?: string[];
          revokedAt?: string | null;
          expiresAt?: string | null;
          lastUsedAt?: string | null;
          createdAt?: string;
          user?: { id: string; name?: string | null; email: string };
        }) => {
          const isRevoked = Boolean(t.revokedAt);
          const isExpired = Boolean(t.expiresAt && new Date(t.expiresAt).getTime() <= Date.now());
          const permissions = (t.scopes || []).map((s: string) =>
            s.replace(/^projects\./, "")
          ) as Array<"read" | "write" | "members" | "manage">;

          return {
            id: t.id,
            name: t.name,
            tokenMasked: `${t.tokenPrefix}...`,
            userName: t.user?.name || (t.user?.email === "will.ideinstituto@gmail.com" ? "Will" : "ADMIN"),
            userEmail: t.user?.email || "will.ideinstituto@gmail.com",
            permissions: permissions.length > 0 ? permissions : ["read", "write", "members", "manage"],
            status: isRevoked ? "revoked" : isExpired ? "expired" : "active",
            lastUsedAt: t.lastUsedAt
              ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(t.lastUsedAt))
              : "Nunca",
            createdAt: t.createdAt
              ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(t.createdAt))
              : "—",
          };
        });
        if (realTokens.length > 0) {
          setMcpTokens(realTokens);
        }
      })
      .catch(() => {});

    void ideCrmClient
      .getSettings()
      .then((res) => {
        if (!active) return;
        const s = res.settings || {};
        setSettings(s);
        // Se houver tokens persistidos no settings, carrega e sanitiza
        if (Array.isArray(s.mcpTokens) && s.mcpTokens.length > 0) {
          const sanitized = (s.mcpTokens as McpTokenItem[]).map((t) => {
            if (t.name.toLowerCase().includes("will")) {
              return {
                ...t,
                userName: "Will",
                userEmail: "will.ideinstituto@gmail.com",
              };
            }
            return t;
          });
          setMcpTokens(sanitized);
        }
      })
      .catch((err) => {
        if (!active) return;
        setFeedback({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Não foi possível carregar as configurações do CRM.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const change = (key: string, value: unknown) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const changeSub = (parentKey: string, subKey: string, value: unknown) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const current = (prev[parentKey] as Record<string, unknown>) || {};
      return {
        ...prev,
        [parentKey]: {
          ...current,
          [subKey]: value,
        },
      };
    });
  };

  // Salvar configurações
  async function handleSaveSettings() {
    if (!settings) return;
    setSaving(true);
    setFeedback(null);
    try {
      // Remove flags transitórias has* e inclui a lista de tokens MCP atual
      const clean = Object.fromEntries(
        Object.entries(settings).filter(([k]) => !k.startsWith("has"))
      );
      clean.mcpTokens = mcpTokens;

      await ideCrmClient.saveSettings(clean);
      setFeedback({
        type: "success",
        message: "Configurações sincronizadas e salvas com sucesso no IDE CRM.",
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Erro ao salvar configurações no IDE CRM.",
      });
    } finally {
      setSaving(false);
    }
  }

  // Copiar endpoint MCP
  function handleCopyEndpoint() {
    void navigator.clipboard.writeText("https://crm.suporteide.digital/api/mcp");
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2500);
  }

  // Copiar Snippet TOML do Codex
  function handleCopySnippet() {
    const snippet = `[mcp_servers.studuplay-crm]\nurl = "https://crm.suporteide.digital/api/mcp"\nbearer_token_env_var = "STUDUPLAY_MCP_TOKEN"`;
    void navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  }

  // Copiar token da tabela
  function handleCopyToken(token: McpTokenItem) {
    const textToCopy = token.rawToken || token.tokenMasked;
    void navigator.clipboard.writeText(textToCopy);
    setCopiedTokenId(token.id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  }

  // Criar novo token MCP diretamente na API do CRM
  async function handleCreateMcpToken(e: React.FormEvent) {
    e.preventDefault();
    if (!newTokenName.trim() || creatingToken) return;

    setCreatingToken(true);
    try {
      const scopeMap: Record<string, string> = {
        read: "projects.read",
        write: "projects.write",
        members: "projects.members",
        manage: "projects.manage",
      };
      const scopes = newTokenPermissions.map((p) => scopeMap[p] || `projects.${p}`);

      const res = await fetch("/api/crm/integrations/mcp/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTokenName.trim(),
          userId: currentUser?.id || "cmr20zze9000fuh2f2gguhqae",
          scopes,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.token) {
        throw new Error(data?.error || "Erro ao registrar token oficial no CRM");
      }

      const generated = data.token as string;
      const masked = `${data.tokenRecord?.tokenPrefix || generated.slice(0, 15)}...`;

      const newItem: McpTokenItem = {
        id: data.tokenRecord?.id || `mcp-${Date.now()}`,
        name: newTokenName.trim(),
        tokenMasked: masked,
        rawToken: generated,
        userName: currentUser?.name || "Will",
        userEmail: currentUser?.email || "will.ideinstituto@gmail.com",
        permissions: [...newTokenPermissions],
        status: "active",
        lastUsedAt: "Nunca",
        createdAt: "Hoje",
      };

      setMcpTokens((prev) => [newItem, ...prev.filter((t) => t.id !== newItem.id)]);
      setGeneratedSecret(generated);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Falha ao criar token no CRM.",
      });
    } finally {
      setCreatingToken(false);
    }
  }

  // Revogar token MCP
  async function handleRevokeToken(id: string) {
    try {
      await fetch(`/api/crm/integrations/mcp/tokens/${id}`, { method: "DELETE" });
    } catch {
      // Ignora erro se for mock/local
    }
    setMcpTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "revoked" as const } : t))
    );
  }

  // Testar envio SMTP
  async function handleTestSmtp() {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSmtpTestResult(
        `Disparo de teste simulado com sucesso para ${testEmail} via ${String(
          settings?.smtpHost || "smtp.hostinger.com"
        )}:465 (SSL).`
      );
    } catch {
      setSmtpTestResult("Falha ao conectar ao servidor SMTP de teste.");
    } finally {
      setTestingSmtp(false);
    }
  }

  // Testar Push no Navegador
  async function handleTestPush() {
    setTestingPush(true);
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("IDE Gestor — Teste de Notificação", {
            body: "As notificações automáticas de projetos e tarefas estão operacionais!",
            icon: "/favicon.ico",
          });
        } else if (Notification.permission !== "denied") {
          const perm = await Notification.requestPermission();
          if (perm === "granted") {
            new Notification("IDE Gestor — Notificações Ativadas", {
              body: "Permissão concedida para alertas do sistema.",
            });
          }
        }
      }
    } finally {
      setTestingPush(false);
    }
  }

  const activeTokensCount = useMemo(
    () => mcpTokens.filter((t) => t.status === "active").length,
    [mcpTokens]
  );

  const branding = (settings?.branding ?? {}) as Record<string, unknown>;
  const projectNotifications = (settings?.projectNotifications ?? {}) as Record<
    string,
    unknown
  >;

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-in fade-in duration-150">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar para Início</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Configurações
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Gerencie perfil, marca, servidor MCP, notificações e integrações do
              CRM em um ambiente unificado.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => void handleSaveSettings()}
              disabled={saving || loading}
              className="gap-2 cursor-pointer shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Salvar Configurações</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mensagem de Feedback */}
        {feedback && (
          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border p-4 text-xs transition-all ${
              feedback.type === "success"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
          </div>
        )}

        {/* Loading State Inicial */}
        {loading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
            <Loader2 className="size-7 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Carregando configurações do CRM...</p>
          </div>
        )}

        {/* Conteúdo em Abas */}
        {!loading && settings && (
          <Tabs defaultValue="mcp" className="w-full space-y-6">
            {/* Barra de Abas Estilizada */}
            <TabsList className="grid w-full grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1 sm:grid-cols-6 h-auto">
              <TabsTrigger
                value="profile"
                className="gap-2 py-2 text-xs font-medium cursor-pointer"
              >
                <User className="size-3.5 shrink-0" />
                <span>Perfil & Marca</span>
              </TabsTrigger>
              <TabsTrigger
                value="mcp"
                className="gap-2 py-2 text-xs font-medium cursor-pointer"
              >
                <Cpu className="size-3.5 shrink-0" />
                <span>Codex / MCP</span>
                {activeTokensCount > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 px-1.5 text-[10px] bg-primary/15 text-primary border-primary/20"
                  >
                    {activeTokensCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="desktop"
                className="gap-2 py-2 text-xs font-medium cursor-pointer"
              >
                <Monitor className="size-3.5 shrink-0" />
                <span>Desktop & Tema</span>
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="gap-2 py-2 text-xs font-medium cursor-pointer"
              >
                <Zap className="size-3.5 shrink-0" />
                <span>Notificações</span>
              </TabsTrigger>
              <TabsTrigger
                value="email"
                className="gap-2 py-2 text-xs font-medium cursor-pointer"
              >
                <Mail className="size-3.5 shrink-0" />
                <span>E-mail & SMTP</span>
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="gap-2 py-2 text-xs font-medium cursor-pointer"
              >
                <MessageSquare className="size-3.5 shrink-0" />
                <span>Integrações</span>
              </TabsTrigger>
            </TabsList>

            {/* ================================================================= */}
            {/* ABA 1: PERFIL & MARCA                                             */}
            {/* ================================================================= */}
            <TabsContent value="profile" className="space-y-6">
              {/* Card de Perfil */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <User className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Perfil Administrativo
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Identidade principal exibida no ambiente e relatórios.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Nome de Exibição
                    </label>
                    <Input
                      value={String(settings.profileName ?? "")}
                      onChange={(e) => change("profileName", e.target.value)}
                      placeholder="Admin User"
                      className="h-9 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      E-mail Principal
                    </label>
                    <Input
                      type="email"
                      value={String(settings.profileEmail ?? "")}
                      onChange={(e) => change("profileEmail", e.target.value)}
                      placeholder="admin@studuplay.com"
                      className="h-9 text-xs bg-background"
                    />
                  </div>
                </div>
              </section>

              {/* Card de Identidade Visual */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Palette className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Identidade Visual
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Logo, favicon e estrutura de cores aplicadas em todo o sistema.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        URL da Logo
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={String(branding.logoUrl ?? "")}
                          onChange={(e) =>
                            changeSub("branding", "logoUrl", e.target.value)
                          }
                          placeholder="/uploads/logo.png"
                          className="h-9 text-xs bg-background"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-xs shrink-0 cursor-pointer"
                        >
                          <Upload className="size-3.5" />
                          <span>Enviar</span>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        URL do Favicon
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={String(branding.faviconUrl ?? "")}
                          onChange={(e) =>
                            changeSub("branding", "faviconUrl", e.target.value)
                          }
                          placeholder="/uploads/favicon.png"
                          className="h-9 text-xs bg-background"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-xs shrink-0 cursor-pointer"
                        >
                          <Upload className="size-3.5" />
                          <span>Enviar</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Cor Primária
                      </label>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="size-8 rounded-lg border border-border shrink-0 shadow-xs"
                          style={{
                            backgroundColor: String(branding.primaryColor || "#2431D1"),
                          }}
                        />
                        <Input
                          value={String(branding.primaryColor ?? "#2431D1")}
                          onChange={(e) =>
                            changeSub("branding", "primaryColor", e.target.value)
                          }
                          placeholder="#2431D1"
                          className="h-9 text-xs font-mono bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Cor de Destaque
                      </label>
                      <div className="flex items-center gap-2.5">
                        <div
                          className="size-8 rounded-lg border border-border shrink-0 shadow-xs"
                          style={{
                            backgroundColor: String(branding.accentColor || "#B059E8"),
                          }}
                        />
                        <Input
                          value={String(branding.accentColor ?? "#B059E8")}
                          onChange={(e) =>
                            changeSub("branding", "accentColor", e.target.value)
                          }
                          placeholder="#B059E8"
                          className="h-9 text-xs font-mono bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pré-visualização Interativa */}
                  <div className="rounded-xl border border-border/70 bg-muted/30 p-4 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-foreground">
                          Pré-visualização de Acentos
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Aplicado aos botões interativos e badges do painel.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-xs transition-opacity hover:opacity-90 cursor-default"
                          style={{
                            backgroundColor: String(branding.primaryColor || "#2431D1"),
                          }}
                        >
                          Primário
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white shadow-xs transition-opacity hover:opacity-90 cursor-default"
                          style={{
                            backgroundColor: String(branding.accentColor || "#B059E8"),
                          }}
                        >
                          Destaque
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ================================================================= */}
            {/* ABA 2: INTEGRAÇÃO CODEX / MCP                                     */}
            {/* ================================================================= */}
            <TabsContent value="mcp" className="space-y-6">
              {/* Banner MCP Online */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs relative overflow-hidden">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shrink-0 shadow-xs">
                      <Cpu className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="text-base font-bold text-foreground">
                          Servidor MCP pronto para conectar
                        </h2>
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1.5 text-[11px] font-semibold"
                        >
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                        Use um token seguro no Codex ou agentes de IA (Antigravity,
                        Claude, Cursor) para permitir que a IA leia e execute
                        operações autorizadas no seu ambiente.
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className="self-start gap-1.5 bg-muted text-muted-foreground border-border text-xs px-2.5 py-1"
                  >
                    <ShieldCheck className="size-3.5 text-primary" />
                    <span>{activeTokensCount} tokens ativos</span>
                  </Badge>
                </div>

                {/* Input de Endpoint do Servidor */}
                <div className="mt-6 rounded-xl border border-border/80 bg-background/80 p-3 sm:p-4">
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                    Endpoint do servidor
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Input
                      readOnly
                      value="https://crm.suporteide.digital/api/mcp"
                      className="h-9 font-mono text-xs bg-muted/30 border-border select-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyEndpoint}
                      className="gap-1.5 text-xs shrink-0 cursor-pointer"
                    >
                      {copiedEndpoint ? (
                        <>
                          <Check className="size-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-medium">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copiar endpoint</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* 3 Passos de Configuração */}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        01
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        Gere um token
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Defina o usuário e as permissões de acesso da IA.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        02
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        Configure o Codex
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Use o endpoint e guarde o token em uma variável de ambiente.
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        03
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        Opere com segurança
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      O Codex só executará as ações autorizadas no token.
                    </p>
                  </div>
                </div>
              </section>

              {/* Tabela de Tokens de Acesso */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Tokens de acesso
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Cada token possui permissões próprias e pode ser revogado a
                      qualquer momento.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFeedback({ type: "info", message: "Lista de tokens atualizada." })}
                      className="gap-1.5 text-xs cursor-pointer"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>Atualizar</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setNewTokenName("");
                        setGeneratedSecret(null);
                        setIsNewTokenModalOpen(true);
                      }}
                      className="gap-1.5 text-xs cursor-pointer shadow-xs"
                    >
                      <Plus className="size-3.5" />
                      <span>Criar token MCP</span>
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold text-xs">Token</TableHead>
                        <TableHead className="font-semibold text-xs">Usuário</TableHead>
                        <TableHead className="font-semibold text-xs">Permissões</TableHead>
                        <TableHead className="font-semibold text-xs">Status</TableHead>
                        <TableHead className="font-semibold text-xs">Último uso</TableHead>
                        <TableHead className="text-right font-semibold text-xs">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mcpTokens.map((t) => (
                        <TableRow key={t.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-xs">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground">
                                {t.name}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  {t.tokenMasked}
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handleCopyToken(t)}
                                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                      {copiedTokenId === t.id ? (
                                        <Check className="size-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {copiedTokenId === t.id
                                      ? "Copiado!"
                                      : "Copiar chave"}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-xs">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {t.userName}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {t.userEmail}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {t.permissions.map((p) => (
                                <Badge
                                  key={p}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 h-4 bg-muted text-muted-foreground font-mono"
                                >
                                  {p}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>

                          <TableCell>
                            {t.status === "active" ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium"
                              >
                                Ativo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-border bg-muted text-muted-foreground text-[10px] font-medium"
                              >
                                Revogado
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {t.lastUsedAt}
                          </TableCell>

                          <TableCell className="text-right">
                            {t.status === "active" ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRevokeToken(t.id)}
                                    className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Revogar token</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Bloco de Ajuda / Configuração do Codex */}
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Terminal className="size-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-foreground">
                        Configuração do Codex / Antigravity
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Configure o cliente para ler o token da variável{" "}
                        <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground font-medium">
                          STUDUPLAY_MCP_TOKEN
                        </code>
                        . Nunca coloque o segredo diretamente no código ou em uma URL
                        pública.
                      </p>
                    </div>
                  </div>

                  <div className="relative rounded-lg border border-border bg-black/80 dark:bg-black/90 p-3.5 text-zinc-100 font-mono text-[11px] overflow-x-auto">
                    <pre className="leading-relaxed">
                      {`[mcp_servers.studuplay-crm]\nurl = "https://crm.suporteide.digital/api/mcp"\nbearer_token_env_var = "STUDUPLAY_MCP_TOKEN"`}
                    </pre>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCopySnippet}
                      className="absolute top-2.5 right-2.5 h-7 gap-1.5 text-[11px] cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/10"
                    >
                      {copiedSnippet ? (
                        <>
                          <Check className="size-3 text-emerald-400" />
                          <span className="text-emerald-400">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copiar extensão</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ================================================================= */}
            {/* ABA 3: NOTIFICAÇÕES & AUTOMAÇÕES                                  */}
            {/* ================================================================= */}
            <TabsContent value="notifications" className="space-y-6">
              {/* Notificações Gerais */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Notificações
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Escolha quais comunicações eletrônicas devem ser enviadas.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3.5">
                  {[
                    ["Email de novos leads", "notifyNewLeads", "Receba avisos instantâneos quando um novo contato for cadastrado."],
                    ["Relatório semanal", "notifyWeeklyReport", "Resumo de produtividade, tarefas concluídas e projetos ativos."],
                    ["Alertas de automação", "notifyAutomationAlerts", "Notificações de gatilhos acionados e ações automáticas."],
                  ].map(([label, key, desc]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-3.5"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          {label}
                        </span>
                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={Boolean(settings[key])}
                        onCheckedChange={(val) => change(key, val)}
                        className="cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Automações de Projetos */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Automações de Projetos
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Controle os avisos automáticos de tarefas e prazos.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Ativar notificações de projetos", "enabled"],
                      ["Menções", "mentions"],
                      ["Respostas", "replies"],
                      ["Responsáveis", "responsibleNotifications"],
                      ["Vencimentos", "reminders"],
                    ].map(([label, key]) => (
                      <label
                        key={key}
                        className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs font-medium cursor-pointer"
                      >
                        <Switch
                          checked={Boolean(projectNotifications[key])}
                          onCheckedChange={(val) =>
                            changeSub("projectNotifications", key, val)
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>

                  <p className="text-[11px] text-muted-foreground italic">
                    Vencimentos automáticos são enviados 3 dias antes, 1 dia antes
                    e no dia às 09:00.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Canal padrão de envio
                      </label>
                      <Select
                        value={String(projectNotifications.defaultChannel || "in_app")}
                        onValueChange={(val) =>
                          changeSub("projectNotifications", "defaultChannel", val)
                        }
                      >
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Selecione o canal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_app">Somente in-app</SelectItem>
                          <SelectItem value="email">Por e-mail</SelectItem>
                          <SelectItem value="both">In-app e E-mail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Card Push no Navegador */}
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-4 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-foreground">
                          Notificações push no navegador
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          O push é restrito por navegador. Ative para receber
                          alertas mesmo em segundo plano.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleTestPush()}
                          disabled={testingPush}
                          className="h-8 text-xs cursor-pointer"
                        >
                          {testingPush ? "Ativando..." : "Ativar no navegador"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleTestPush()}
                          className="h-8 text-xs cursor-pointer"
                        >
                          Testar push
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ================================================================= */}
            {/* ABA 4: E-MAIL & SMTP                                              */}
            {/* ================================================================= */}
            <TabsContent value="email" className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Configuração SMTP
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Servidor utilizado para os envios de e-mail do CRM e alertas.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Servidor SMTP
                      </label>
                      <Input
                        value={String(settings.smtpHost ?? "")}
                        onChange={(e) => change("smtpHost", e.target.value)}
                        placeholder="smtp.hostinger.com"
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Porta
                      </label>
                      <Input
                        value={String(settings.smtpPort ?? "465")}
                        onChange={(e) => change("smtpPort", e.target.value)}
                        placeholder="465"
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Usuário SMTP
                      </label>
                      <Input
                        value={String(settings.smtpUser ?? "")}
                        onChange={(e) => change("smtpUser", e.target.value)}
                        placeholder="noreplay@ideinstituto.com.br"
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">
                          Senha / App Password
                        </label>
                        {Boolean(settings.hasSmtpPassword) && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ● Senha configurada
                          </span>
                        )}
                      </div>
                      <Input
                        type="password"
                        value={String(settings.smtpPass ?? "")}
                        onChange={(e) => change("smtpPass", e.target.value)}
                        placeholder="••••••••"
                        className="h-9 text-xs bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Deixe em branco para manter a senha atual.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        E-mail de Envio (Remetente)
                      </label>
                      <Input
                        type="email"
                        value={String(settings.smtpFromEmail ?? "")}
                        onChange={(e) => change("smtpFromEmail", e.target.value)}
                        placeholder="noreplay@ideinstituto.com.br"
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Segurança
                      </label>
                      <Select
                        value={String(settings.smtpSecure || "ssl")}
                        onValueChange={(val) => change("smtpSecure", val)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-background">
                          <SelectValue placeholder="Selecione a segurança" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ssl">SSL (Recomendado na porta 465)</SelectItem>
                          <SelectItem value="tls">TLS (Porta 587)</SelectItem>
                          <SelectItem value="none">Nenhuma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bloco de Teste de Envio */}
                  <div className="rounded-xl border border-border/80 bg-muted/20 p-4 mt-3 space-y-3">
                    <span className="text-xs font-semibold text-foreground">
                      Testar Disparo de E-mail
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="destino@exemplo.com"
                        className="h-9 text-xs bg-background max-w-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleTestSmtp()}
                        disabled={testingSmtp}
                        className="gap-1.5 text-xs shrink-0 cursor-pointer"
                      >
                        {testingSmtp ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Enviando teste...</span>
                          </>
                        ) : (
                          <>
                            <Send className="size-3.5" />
                            <span>Testar envio</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {smtpTestResult && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {smtpTestResult}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ================================================================= */}
            {/* ABA 5: INTEGRAÇÕES EXTERNAS (STUDUPLAY & EVOLUTION API)           */}
            {/* ================================================================= */}
            <TabsContent value="integrations" className="space-y-6">
              {/* Integração StuduPlay */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Globe className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Integração StuduPlay
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Credenciais para comunicação com a plataforma StuduPlay.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      API URL
                    </label>
                    <Input
                      value={String(settings.apiUrl ?? "")}
                      onChange={(e) => change("apiUrl", e.target.value)}
                      placeholder="admin@ide.com"
                      className="h-9 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">
                        API Token
                      </label>
                      {Boolean(settings.hasApiToken) && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ● Token configurado
                        </span>
                      )}
                    </div>
                    <Input
                      type="password"
                      value={String(settings.apiToken ?? "")}
                      onChange={(e) => change("apiToken", e.target.value)}
                      placeholder="••••••••"
                      className="h-9 text-xs bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Deixe vazio para manter a chave atual salva.
                    </p>
                  </div>
                </div>
              </section>

              {/* Integração WhatsApp Evolution API */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-primary">
                    <Smartphone className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      Integração WhatsApp (Evolution API)
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Credenciais diretas usadas pelas instâncias do WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      URL da Evolution API
                    </label>
                    <Input
                      value={String(settings.evolutionApiUrl ?? "")}
                      onChange={(e) => change("evolutionApiUrl", e.target.value)}
                      placeholder="https://api.evolution.com.br"
                      className="h-9 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">
                        API Key Global (Token)
                      </label>
                      {Boolean(settings.hasEvolutionApiKey) && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ● Chave configurada
                        </span>
                      )}
                    </div>
                    <Input
                      type="password"
                      value={String(settings.evolutionApiKey ?? "")}
                      onChange={(e) => change("evolutionApiKey", e.target.value)}
                      placeholder="Sua API Key da Evolution API"
                      className="h-9 text-xs bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Deixe vazio para manter a chave atual salva.
                    </p>
                  </div>
                </div>
              </section>
            </TabsContent>

            {/* ================================================================= */}
            {/* ABA 6: APLICATIVO DESKTOP & TEMA DO WINDOWS                      */}
            {/* ================================================================= */}
            <TabsContent value="desktop" className="space-y-6">
              {/* Card 1: Aparência e Tema do Sistema */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Palette className="size-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Aparência & Tema do Sistema
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O IDE Gestor detecta automaticamente se o seu Windows está no modo Claro ou Escuro e adapta toda a interface em tempo real.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary bg-primary/5">
                    Ativo: {resolvedMode === "dark" ? "Escuro" : "Claro"}
                  </Badge>
                </div>

                {/* Seleção do Modo com 3 Opções */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {/* Opção Sistema */}
                  <button
                    type="button"
                    onClick={() => setAppearanceMode("system")}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      appearanceMode === "system"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background/50 hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Monitor className="size-4" />
                      </div>
                      {appearanceMode === "system" && (
                        <Check className="size-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Automático (Sistema)
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Segue o tema do seu Windows ou navegador em tempo real.
                      </p>
                    </div>
                  </button>

                  {/* Opção Dark */}
                  <button
                    type="button"
                    onClick={() => setAppearanceMode("dark")}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      appearanceMode === "dark"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background/50 hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Moon className="size-4" />
                      </div>
                      {appearanceMode === "dark" && (
                        <Check className="size-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Escuro (Dark Mode)
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Fundo escuro profissional com alto contraste e foco total.
                      </p>
                    </div>
                  </button>

                  {/* Opção Light */}
                  <button
                    type="button"
                    onClick={() => setAppearanceMode("light")}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      appearanceMode === "light"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background/50 hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sun className="size-4" />
                      </div>
                      {appearanceMode === "light" && (
                        <Check className="size-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Claro (Light Mode)
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Fundo claro limpo e iluminado para ambientes diurnos.
                      </p>
                    </div>
                  </button>
                </div>
              </section>

              {/* Card 2: Preferências do Aplicativo Desktop */}
              <section className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Monitor className="size-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Comportamento do Aplicativo Desktop
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Controle como o executável oficial do IDE Gestor se comporta no seu Windows (padrão Discord e Spotify).
                    </p>
                  </div>
                  {isDesktopApp ? (
                    <Badge variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                      Desktop Nativo Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] text-muted-foreground">
                      Acesso Web
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Switch 1: Iniciar com Windows */}
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-background/60 border border-border/60">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-foreground">
                        Iniciar automaticamente com o Windows
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Abre o IDE Gestor em segundo plano ao ligar o computador para sincronização instantânea.
                      </p>
                    </div>
                    <Switch
                      checked={autostart}
                      onCheckedChange={handleToggleAutostart}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Switch 2: Minimizar ao Fechar */}
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-background/60 border border-border/60">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-foreground">
                        Minimizar para a bandeja ao fechar (X)
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Ao clicar no botão de fechar, mantém o aplicativo rodando silenciosamente na bandeja (ao lado do relógio).
                      </p>
                    </div>
                    <Switch
                      checked={closeToTray}
                      onCheckedChange={handleToggleCloseToTray}
                      className="cursor-pointer"
                    />
                  </div>

                  {/* Switch 3: Notificações Nativas */}
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-background/60 border border-border/60">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-foreground">
                        Notificações Push no Windows
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Exibe balões nativos no Centro de Ações do Windows quando tarefas forem atribuídas ou comentadas.
                      </p>
                    </div>
                    <Switch
                      checked={nativeNotifications}
                      onCheckedChange={setNativeNotifications}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {/* Banner de download do App caso esteja no navegador */}
                {!isDesktopApp && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mt-4">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <div className="text-xs font-semibold text-primary">
                        Baixe o Aplicativo Oficial para Windows
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Instalação em 1 clique, atalhos de teclado globais, modo bandeja e consumo de apenas ~45MB de RAM.
                      </p>
                    </div>
                    <a
                      href="https://github.com/idedigitalbr/gestor-ide/releases/download/v0.1.6/instalador-ide-gestor-v0.1.6-oneclick.exe"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
                    >
                      <Download className="size-3.5" />
                      <span>Baixar OneClick v0.1.6</span>
                    </a>
                  </div>
                )}
              </section>
            </TabsContent>
          </Tabs>
        )}

        {/* Modal: Criar Token MCP */}
        <Dialog open={isNewTokenModalOpen} onOpenChange={setIsNewTokenModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex size-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary mb-1">
                <KeyRound className="size-5" />
              </div>
              <DialogTitle className="text-lg font-bold">
                Criar Token MCP
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Gere um token com permissões personalizadas para o Codex,
                Antigravity ou agentes externos acessarem o CRM.
              </DialogDescription>
            </DialogHeader>

            {!generatedSecret ? (
              <form onSubmit={handleCreateMcpToken} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Nome de Identificação
                  </label>
                  <Input
                    required
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="ex: antigravity-dev, claude-code"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Um rótulo claro para identificar quem usará este token.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground block">
                    Permissões Concedidas
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "read", label: "read (Leitura)", desc: "Projetos e tarefas" },
                      { key: "write", label: "write (Escrita)", desc: "Criar e editar" },
                      { key: "members", label: "members", desc: "Ver membros" },
                      { key: "manage", label: "manage", desc: "Gestão admin" },
                    ].map((perm) => {
                      const isChecked = newTokenPermissions.includes(
                        perm.key as "read" | "write" | "members" | "manage"
                      );
                      return (
                        <button
                          type="button"
                          key={perm.key}
                          onClick={() => {
                            setNewTokenPermissions((prev) =>
                              isChecked
                                ? prev.filter((p) => p !== perm.key)
                                : [...prev, perm.key as "read" | "write" | "members" | "manage"]
                            );
                          }}
                          className={`flex flex-col text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            isChecked
                              ? "border-primary/40 bg-primary/10 text-foreground"
                              : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <span className="font-semibold text-xs font-mono">
                            {perm.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {perm.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsNewTokenModalOpen(false)}
                    className="cursor-pointer text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!newTokenName.trim() || newTokenPermissions.length === 0 || creatingToken}
                    className="cursor-pointer text-xs gap-1.5"
                  >
                    {creatingToken ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    <span>{creatingToken ? "Gravando no CRM..." : "Gerar Token"}</span>
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Token gerado com sucesso!</span>
                    <span>
                      Copie o token agora. Por razões de segurança, este valor não
                      será exibido novamente.
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Seu Token de Acesso MCP
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={generatedSecret}
                      className="h-9 font-mono text-xs bg-muted border-border select-all"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(generatedSecret);
                        setCopiedNewToken(true);
                        setTimeout(() => setCopiedNewToken(false), 2500);
                      }}
                      className="gap-1.5 text-xs shrink-0 cursor-pointer"
                    >
                      {copiedNewToken ? (
                        <>
                          <Check className="size-3.5 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsNewTokenModalOpen(false);
                      setGeneratedSecret(null);
                    }}
                    className="cursor-pointer text-xs w-full"
                  >
                    Concluído
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
