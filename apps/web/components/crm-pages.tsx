"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Folder,
  Layers,
  ListTodo,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type {
  CrmAccount,
  CrmCalendarEvent,
  CrmCalendarEventType,
  CrmCalendarTaskItem,
  CrmProject,
  CrmProjectsDashboard,
} from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";
import { useCalendarDialog } from "@/components/calendar-dialog-context";
import { CalendarEventDetailDialog } from "@/components/calendar/calendar-event-detail-dialog";
import {
  CalendarAgendaList,
  CalendarDaySchedule,
  CalendarMonthGrid,
  CalendarWeekGrid,
  type CalendarEntry,
} from "@/components/calendar/calendar-views";
import { MemberAvatarContent } from "@/components/member-avatar-content";
import {
  computeCalendarQueryRange,
  formatCalendarPeriodLabel,
  getEventDateSpanKeys,
  getTaskDateSpanKeys,
  type CalendarViewMode,
} from "@/lib/calendar-date";
import { CALENDAR_EVENT_TYPE_LABELS } from "@/lib/calendar-labels";
import { stripManagementPrefix, stripProjectPrefix } from "@/lib/list-view-options";

function Shell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-150">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Início</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Feedback({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">
      {message}
    </p>
  );
}

function ExtraSettings({
  settings,
  change,
}: {
  settings: Record<string, unknown>;
  change: (key: string, value: unknown) => void;
}) {
  const branding = (settings.branding ?? {}) as Record<string, unknown>;
  const notifications = (settings.projectNotifications ?? {}) as Record<string, unknown>;

  return (
    <>
      <Panel title="Identidade visual" description="Logo, favicon e cores do CRM.">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["URL da logo", "logoUrl"],
            ["URL do favicon", "faviconUrl"],
            ["Cor primária", "primaryColor"],
            ["Cor de destaque", "accentColor"],
          ].map(([label, key]) => (
            <Field key={key} label={label}>
              <Input
                value={String(branding[key] ?? "")}
                onChange={(e) => change("branding", { ...branding, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Automações de projetos" description="Controle os avisos automáticos de projetos.">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Ativar notificações", "enabled"],
            ["Menções", "mentions"],
            ["Respostas", "replies"],
            ["Responsáveis", "responsibleNotifications"],
            ["Vencimentos", "reminders"],
          ].map(([label, key]) => (
            <label key={key} className="flex items-center gap-3 text-sm">
              <Switch
                checked={Boolean(notifications[key])}
                onCheckedChange={(value) =>
                  change("projectNotifications", { ...notifications, [key]: value })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </Panel>

      <Panel
        title="Credenciais de integração"
        description="Deixe os campos de senha vazios para manter as credenciais atuais."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Token da API", "apiToken"],
            ["URL Evolution API", "evolutionApiUrl"],
            ["Chave Evolution API", "evolutionApiKey"],
            ["Senha SMTP", "smtpPass"],
          ].map(([label, key]) => (
            <Field key={key} label={label}>
              <Input
                type={key.includes("Url") ? "url" : "password"}
                value={String(settings[key] ?? "")}
                onChange={(e) => change(key, e.target.value)}
                autoComplete="off"
              />
            </Field>
          ))}
        </div>
      </Panel>
    </>
  );
}

export function AccountPage() {
  const [account, setAccount] = useState<CrmAccount | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState({
    currentPassword: "",
    password: "",
    confirmation: "",
  });

  useEffect(() => {
    void ideCrmClient
      .getAccount()
      .then((r) => setAccount(r.account))
      .catch((e) => setMessage(e.message));
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await ideCrmClient.updateAccount({
        name: account.name ?? "",
        email: account.email,
        avatarUrl: account.avatarUrl,
      });
      setAccount(r.account);
      window.dispatchEvent(new CustomEvent("gestor:account-updated", { detail: r.account }));
      setMessage("Perfil atualizado.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao salvar perfil.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.password !== password.confirmation) {
      setMessage("A confirmação da nova senha não confere.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await ideCrmClient.updateAccount({
        currentPassword: password.currentPassword,
        password: password.password,
      });
      setPassword({ currentPassword: "", password: "", confirmation: "" });
      setMessage("Senha atualizada.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao alterar senha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      title="Configurações da conta"
      description="Atualize seus dados pessoais, sua foto e a senha de acesso."
    >
      <Feedback message={message} />
      {!account && !message && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando conta...
        </p>
      )}
      {account && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel
            title="Perfil pessoal"
            description="Esses dados aparecem no cabeçalho e nas áreas de trabalho."
          >
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                  <MemberAvatarContent
                    name={account.name || account.email}
                    src={account.avatarUrl}
                  />
                </span>
                <Field label="Escolher foto">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={busy}
                    onChange={(e) => {
                      const input = e.currentTarget;
                      const file = input.files?.[0];
                      input.value = "";
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) {
                        setMessage("Escolha uma imagem com tamanho máximo de 5 MB.");
                        return;
                      }
                      setBusy(true);
                      setMessage("");
                      void ideCrmClient
                        .uploadAvatar(file)
                        .then((r) => {
                          setAccount(r.account);
                          window.dispatchEvent(
                            new CustomEvent("gestor:account-updated", { detail: r.account })
                          );
                          setMessage("Foto atualizada.");
                        })
                        .catch((err) => setMessage(err.message))
                        .finally(() => setBusy(false));
                    }}
                  />
                </Field>
              </div>
              <Field label="Nome">
                <Input
                  required
                  value={account.name ?? ""}
                  onChange={(e) => setAccount({ ...account, name: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <Input
                  required
                  type="email"
                  value={account.email}
                  onChange={(e) => setAccount({ ...account, email: e.target.value })}
                />
              </Field>
              <Button disabled={busy}>Salvar perfil</Button>
            </form>
          </Panel>

          <Panel title="Segurança" description="Altere sua senha sem sair da conta.">
            <form onSubmit={savePassword} className="space-y-4">
              <Field label="Senha atual">
                <Input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password.currentPassword}
                  onChange={(e) =>
                    setPassword({ ...password, currentPassword: e.target.value })
                  }
                />
              </Field>
              <Field label="Nova senha (mínimo de 12 caracteres)">
                <Input
                  required
                  minLength={12}
                  type="password"
                  autoComplete="new-password"
                  value={password.password}
                  onChange={(e) => setPassword({ ...password, password: e.target.value })}
                />
              </Field>
              <Field label="Confirmar nova senha">
                <Input
                  required
                  minLength={12}
                  type="password"
                  autoComplete="new-password"
                  value={password.confirmation}
                  onChange={(e) =>
                    setPassword({ ...password, confirmation: e.target.value })
                  }
                />
              </Field>
              <Button disabled={busy}>Alterar senha</Button>
            </form>
          </Panel>
        </div>
      )}
    </Shell>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<CrmProjectsDashboard | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    setError("");
    try {
      const r = await ideCrmClient.getProjectsDashboard();
      setData(r.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar indicadores.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ideCrmClient
      .getProjectsDashboard()
      .then((r) => {
        if (!cancelled) setData(r.dashboard);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar indicadores.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar para Início</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard de projetos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão consolidada de métricas, saúde das operações e distribuição de tarefas no IDE Gestor.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData()}
          disabled={isRefreshing}
          className="gap-2 cursor-pointer text-xs"
        >
          <RefreshCw className={isRefreshing ? "size-3.5 animate-spin" : "size-3.5"} />
          <span>{isRefreshing ? "Atualizando..." : "Atualizar dados"}</span>
        </Button>
      </div>

      <Feedback message={error} />

      {!data && !error && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Carregando indicadores do painel...
        </div>
      )}

      {data && (
        <>
          {/* Grid de 4 KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center gap-4">
              <div className="size-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <Folder className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Gestões ativas</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{data.metrics.activeManagements}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center gap-4">
              <div className="size-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                <Layers className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Projetos cadastrados</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{data.metrics.totalProjects}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center gap-4">
              <div className="size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <ListTodo className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Tarefas abertas</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{data.metrics.openTasks}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex items-center gap-4">
              <div className="size-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Tarefas atrasadas</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{data.metrics.overdueTasks}</p>
              </div>
            </div>
          </div>

          {/* Gráficos e Distribuições */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Distribuição por status" description="Proporção das tarefas em cada estágio operacional.">
              {data.statusDistribution.length > 0 ? (
                <div className="space-y-3.5">
                  {data.statusDistribution.map((item) => (
                    <div key={item.status} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.count} {item.count === 1 ? "tarefa" : "tarefas"} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma tarefa contabilizada até o momento.
                </p>
              )}
            </Panel>

            <Panel title="Carga por gestão" description="Progresso médio e tarefas em aberto por núcleo de gestão.">
              {data.managements.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {data.managements.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2.5 text-xs first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground">
                          Gestão
                        </span>
                        <span className="font-semibold text-foreground truncate">
                          {stripManagementPrefix(item.name)}
                        </span>
                      </div>
                      <span className="text-muted-foreground shrink-0 font-medium ml-2">
                        {item.openTasks} {item.openTasks === 1 ? "tarefa" : "tarefas"} ·{" "}
                        <span className="font-bold text-foreground">{item.progress}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhuma gestão ativa cadastrada.
                </p>
              )}
            </Panel>
          </div>

          <Panel title="Insights inteligentes" description="Alertas e oportunidades identificadas automaticamente pelo sistema.">
            {data.insights.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.insights.map((item) => (
                  <div key={item.title} className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-xs text-foreground">{item.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground/70 pt-1">Critério: {item.rule}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Nenhum alerta ou gargalo crítico identificado. Todas as operações estão dentro do fluxo esperado!</span>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ideCrmClient
      .getSettings()
      .then((r) => setSettings(r.settings))
      .catch((e) => setMessage(e.message));
  }, []);

  const change = (key: string, value: unknown) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s));

  async function save() {
    if (!settings) return;
    setBusy(true);
    setMessage("");
    try {
      const clean = Object.fromEntries(
        Object.entries(settings).filter(([key]) => !key.startsWith("has"))
      );
      await ideCrmClient.saveSettings(clean);
      setMessage("Configurações salvas.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell
      title="Configurações"
      description="Gerencie perfil, integrações, notificações e canais de envio do CRM."
    >
      <Feedback message={message} />
      {!settings && !message && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando configurações...
        </p>
      )}
      {settings && (
        <>
          <Panel title="Perfil">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["Nome", "profileName"],
                ["Email", "profileEmail"],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <Input
                    value={String(settings[key] ?? "")}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </Panel>

          <Panel title="Notificações">
            <div className="space-y-3">
              {[
                ["Email de novos leads", "notifyNewLeads"],
                ["Relatório semanal", "notifyWeeklyReport"],
                ["Alertas de automação", "notifyAutomationAlerts"],
              ].map(([label, key]) => (
                <label key={key} className="flex items-center gap-3 text-sm">
                  <Switch
                    checked={Boolean(settings[key])}
                    onCheckedChange={(value) => change(key, value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="Integrações e email">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["API URL", "apiUrl"],
                ["SMTP host", "smtpHost"],
                ["SMTP porta", "smtpPort"],
                ["SMTP usuário", "smtpUser"],
                ["Email de envio", "smtpFromEmail"],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <Input
                    value={String(settings[key] ?? "")}
                    onChange={(e) => change(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
          </Panel>

          <ExtraSettings settings={settings} change={change} />

          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Salvando..." : "Salvar configurações"}
            </Button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </>
      )}
    </Shell>
  );
}

const ALL_PROJECTS_VALUE = "__all__";
type CalendarTypeFilter = "ALL" | "TASK" | CrmCalendarEventType;

export function CalendarPage() {
  const [date, setDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<CalendarTypeFilter>("ALL");
  const [projects, setProjects] = useState<CrmProject[]>([]);
  const [rawEvents, setRawEvents] = useState<CrmCalendarEvent[]>([]);
  const [rawTasks, setRawTasks] = useState<CrmCalendarTaskItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CrmCalendarEvent | null>(null);
  const [selectedTask, setSelectedTask] = useState<CrmCalendarTaskItem | null>(null);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const {
    open: dialog,
    setOpen: setDialog,
    editing,
    setEditing,
    initialDate,
    defaultProjectId,
    setDefaultProjectId,
    canCreate,
    setCanCreate,
    openCreateDialog,
  } = useCalendarDialog();

  useEffect(() => {
    let cancelled = false;
    void ideCrmClient
      .listProjects()
      .then((res) => {
        if (!cancelled) setProjects(res.projects ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const queryRange = useMemo(
    () => computeCalendarQueryRange(date, viewMode),
    [date, viewMode]
  );

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    setFallback(false);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    try {
      const r = await ideCrmClient.getCalendar(
        queryRange.start.toISOString(),
        queryRange.end.toISOString(),
        projectFilter || null
      );
      if (version !== requestVersion.current) return;
      setRawEvents(r.events ?? []);
      setRawTasks(r.tasks ?? []);
    } catch {
      if (version !== requestVersion.current) return;
      try {
        const result = await ideCrmClient.listCalendarFallbackTasks(projectFilter || null);
        if (version !== requestVersion.current) return;
        setRawEvents([]);
        setRawTasks(
          result.tasks
            .filter((task) => (task.dueDate ?? task.startDate)?.slice(0, 7) === month)
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
            }))
        );
        setFallback(true);
      } catch (reason) {
        if (version !== requestVersion.current) return;
        setRawEvents([]);
        setRawTasks([]);
        setError(
          reason instanceof Error ? reason.message : "Não foi possível carregar as tarefas."
        );
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [date, queryRange, projectFilter]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  useEffect(() => {
    setCanCreate(!loading && !fallback && !error);
    return () => setCanCreate(false);
  }, [loading, fallback, error, setCanCreate]);

  const entries = useMemo<CalendarEntry[]>(() => {
    const eventEntries: CalendarEntry[] =
      typeFilter === "TASK"
        ? []
        : rawEvents
            .filter((ev) => typeFilter === "ALL" || ev.type === typeFilter)
            .flatMap((ev) => {
              const span = getEventDateSpanKeys(ev);
              if (!span) return [];
              const sortDate = ev.startsAt ?? `${span.startKey}T00:00:00`;
              return [
                {
                  kind: "event" as const,
                  key: `e-${ev.id}`,
                  title: ev.title,
                  sortDate,
                  span,
                  event: ev,
                },
              ];
            });

    const taskEntries: CalendarEntry[] =
      typeFilter === "ALL" || typeFilter === "TASK"
        ? rawTasks.flatMap((task) => {
            const span = getTaskDateSpanKeys(task);
            if (!span) return [];
            const sortDate = task.dueDate ?? task.startDate ?? span.startKey;
            return [
              {
                kind: "task" as const,
                key: `t-${task.id}`,
                title: task.title,
                sortDate,
                span,
                task,
              },
            ];
          })
        : [];

    return [...eventEntries, ...taskEntries].sort((a, b) =>
      a.sortDate.localeCompare(b.sortDate)
    );
  }, [rawEvents, rawTasks, typeFilter]);

  function stepPeriod(direction: -1 | 1) {
    if (viewMode === "day") {
      setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + direction));
      return;
    }
    if (viewMode === "week") {
      setDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + direction * 7));
      return;
    }
    setDate(new Date(date.getFullYear(), date.getMonth() + direction, 1));
  }

  function handleOpenDay(dayKey: string) {
    const [y, m, d] = dayKey.split("-").map(Number);
    if (y && m && d) setDate(new Date(y, m - 1, d));
    setViewMode("day");
  }

  function handleCreateForDay(dayKey: string) {
    openCreateDialog({
      dateKey: dayKey,
      projectId: projectFilter || null,
    });
  }

  function handleEditEvent(ev: CrmCalendarEvent) {
    setEditing(ev);
    setDialog(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 animate-in fade-in duration-150">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Início</span>
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Período anterior"
            onClick={() => stepPeriod(-1)}
          >
            <ChevronLeft />
          </Button>
          <h2 className="min-w-44 text-center font-semibold [&::first-letter]:uppercase">
            {formatCalendarPeriodLabel(date, viewMode)}
          </h2>
          <Button
            variant="outline"
            size="icon"
            aria-label="Próximo período"
            onClick={() => stepPeriod(1)}
          >
            <ChevronRight />
          </Button>
          <Button variant="outline" onClick={() => setDate(new Date())}>
            Hoje
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Atualizar agenda"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(value) => setViewMode(value as CalendarViewMode)}
          >
            <TabsList>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="day">Dia</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select
            value={projectFilter || ALL_PROJECTS_VALUE}
            onValueChange={(value) => {
              const next = value === ALL_PROJECTS_VALUE ? "" : value;
              setProjectFilter(next);
              setDefaultProjectId(next || null);
            }}
          >
            <SelectTrigger className="w-48" aria-label="Filtrar por projeto">
              <SelectValue placeholder="Todos os projetos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROJECTS_VALUE}>Todos os projetos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.code
                    ? `[${project.code}] ${stripProjectPrefix(project.name)}`
                    : stripProjectPrefix(project.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as CalendarTypeFilter)}
          >
            <SelectTrigger className="w-40" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tudo</SelectItem>
              <SelectItem value="TASK">Tarefas</SelectItem>
              {(Object.keys(CALENDAR_EVENT_TYPE_LABELS) as CrmCalendarEventType[]).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {CALENDAR_EVENT_TYPE_LABELS[key]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Feedback message={error} />

      {fallback && (
        <div
          role="status"
          className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground"
        >
          O calendário do CRM está indisponível. Exibindo as tarefas com prazo ou início neste
          mês; eventos não estão disponíveis.{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => void load()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loading ? (
        <Panel title="Carregando calendário">
          <p role="status" className="text-sm text-muted-foreground">
            Carregando agenda...
          </p>
        </Panel>
      ) : error ? (
        <Panel title="Calendário">
          <p className="text-sm text-muted-foreground">A agenda não pôde ser carregada.</p>
        </Panel>
      ) : viewMode === "month" ? (
        <CalendarMonthGrid
          anchorDate={date}
          gridStartKey={queryRange.gridStartKey}
          entries={entries}
          canCreate={canCreate}
          onCreateForDay={handleCreateForDay}
          onSelectEvent={setSelectedEvent}
          onSelectTask={setSelectedTask}
          onOpenDay={handleOpenDay}
        />
      ) : viewMode === "week" ? (
        <CalendarWeekGrid
          gridStartKey={queryRange.gridStartKey}
          entries={entries}
          canCreate={canCreate}
          onCreateForDay={handleCreateForDay}
          onSelectEvent={setSelectedEvent}
          onSelectTask={setSelectedTask}
          onOpenDay={handleOpenDay}
        />
      ) : viewMode === "day" ? (
        <CalendarDaySchedule
          anchorDate={date}
          entries={entries}
          canCreate={canCreate}
          onCreateForDay={handleCreateForDay}
          onSelectEvent={setSelectedEvent}
          onSelectTask={setSelectedTask}
          onEditEvent={handleEditEvent}
        />
      ) : (
        <Panel title="Agenda do mês">
          <CalendarAgendaList
            entries={entries}
            fallback={fallback}
            onSelectEvent={setSelectedEvent}
            onSelectTask={setSelectedTask}
            onEditEvent={handleEditEvent}
          />
        </Panel>
      )}

      <CalendarEventDetailDialog
        event={selectedEvent}
        task={selectedTask}
        onClose={() => {
          setSelectedEvent(null);
          setSelectedTask(null);
        }}
        onEditEvent={handleEditEvent}
      />

      <CalendarEventDialog
        event={editing}
        initialDate={initialDate}
        defaultProjectId={defaultProjectId}
        projects={projects}
        open={dialog}
        onOpenChange={setDialog}
        onSaved={load}
      />
    </div>
  );
}
