"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { setStoredCrmToken } from "@gestor-ide/auth";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeSelector } from "@/components/theme/theme-selector";

interface CrmLoginViewProps {
  onSuccessConnect: () => Promise<void>;
  isApiReachable?: boolean;
}

export function CrmLoginView({
  onSuccessConnect,
  isApiReachable: initialIsApiReachable = false,
}: CrmLoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mcpToken, setMcpToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState(initialIsApiReachable);

  useEffect(() => {
    let cancelled = false;
    void ideCrmClient
      .health()
      .then((res) => {
        if (!cancelled && res.status === "ok") {
          setApiOnline(true);
        }
      })
      .catch(() => {
        if (!cancelled) setApiOnline(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Por favor, preencha seu e-mail e senha.");
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      await ideCrmClient.login(email.trim(), password, "IDE Gestor Web");
      setPassword("");
      await onSuccessConnect();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Não foi possível autenticar no IDE CRM. Verifique suas credenciais."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTokenLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = mcpToken.trim();
    if (!cleaned) {
      setErrorMessage("Por favor, insira o seu token de acesso da API.");
      return;
    }
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
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Falha ao validar o token de acesso no IDE CRM."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background p-4 text-foreground sm:p-8">
      {/* Barra de utilitários no topo direito */}
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-8 sm:top-8">
        <ThemeSelector />
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Cabeçalho / Branding */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl border border-border bg-card shadow-xs">
            <ShieldCheck className="size-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            IDE Gestor
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            Plataforma corporativa integrada nativamente ao{" "}
            <span className="font-medium text-foreground">IDE CRM</span>
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Badge
              variant="outline"
              className={
                apiOnline
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground"
              }
            >
              {apiOnline ? (
                <>
                  <span className="mr-1.5 size-1.5 rounded-full bg-primary" />
                  API do CRM Online
                </>
              ) : (
                <>
                  <span className="mr-1.5 size-1.5 rounded-full bg-muted-foreground" />
                  Verificando API...
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Card de Autenticação */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid h-9 w-full grid-cols-2 bg-muted/60 p-0.5">
              <TabsTrigger value="credentials" className="gap-1.5 text-xs">
                <UserCheck className="size-3.5" />
                <span>Conta CRM</span>
              </TabsTrigger>
              <TabsTrigger value="token" className="gap-1.5 text-xs">
                <KeyRound className="size-3.5" />
                <span>Token de API</span>
              </TabsTrigger>
            </TabsList>

            {errorMessage && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Formulário: E-mail e Senha */}
            <TabsContent value="credentials" className="mt-4 space-y-4">
              <form onSubmit={handleCredentialsLogin} className="space-y-3.5">
                <div className="space-y-1 text-left">
                  <label
                    htmlFor="crm-email"
                    className="text-xs font-medium text-foreground"
                  >
                    E-mail
                  </label>
                  <Input
                    id="crm-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu.email@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label
                    htmlFor="crm-password"
                    className="text-xs font-medium text-foreground"
                  >
                    Senha
                  </label>
                  <Input
                    id="crm-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-9 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 text-xs font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Autenticando no CRM...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="size-3.5" />
                      <span>Entrar e Sincronizar</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
                <p>
                  Utilize as mesmas credenciais de acesso cadastradas na plataforma{" "}
                  <strong className="text-foreground">IDE CRM</strong>. As tarefas,
                  gestões e permissões serão carregadas automaticamente.
                </p>
              </div>
            </TabsContent>

            {/* Formulário: Token MCP / API */}
            <TabsContent value="token" className="mt-4 space-y-4">
              <form onSubmit={handleTokenLogin} className="space-y-3.5">
                <div className="space-y-1 text-left">
                  <label
                    htmlFor="crm-token"
                    className="text-xs font-medium text-foreground"
                  >
                    Token de API / MCP
                  </label>
                  <Input
                    id="crm-token"
                    type="password"
                    placeholder="sp_mcp_..."
                    value={mcpToken}
                    onChange={(e) => setMcpToken(e.target.value)}
                    disabled={loading}
                    required
                    className="h-9 font-mono text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 text-xs font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Validando Token...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="size-3.5" />
                      <span>Acessar com Token</span>
                    </>
                  )}
                </Button>
              </form>

              <div className="space-y-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground">
                  Como obter seu token pessoal:
                </p>
                <ol className="list-inside list-decimal space-y-1 pl-0.5">
                  <li>
                    Acesse o{" "}
                    <a
                      href="https://crm.suporteide.digital"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                    >
                      IDE CRM online
                      <ExternalLink className="size-3" />
                    </a>
                  </li>
                  <li>Vá em seu perfil ou Configurações &gt; Token da API</li>
                  <li>Copie sua chave de acesso e cole no campo acima</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Rodapé informativo */}
        <div className="flex flex-col items-center gap-1.5 text-center text-xs text-muted-foreground">
          <p>
            Não possui uma conta? Solicite acesso ao administrador da sua equipe.
          </p>
          <a
            href="https://crm.suporteide.digital"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <span>Acessar IDE CRM Central</span>
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
