"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
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
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
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

  useEffect(() => {
    void ideCrmClient
      .getProjectsDashboard()
      .then((r) => setData(r.dashboard))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard de projetos</h1>
      <Feedback message={error} />
      {!data && !error && (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando indicadores...
        </p>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Gestões ativas", data.metrics.activeManagements],
              ["Projetos", data.metrics.totalProjects],
              ["Tarefas abertas", data.metrics.openTasks],
              ["Tarefas atrasadas", data.metrics.overdueTasks],
            ].map(([label, value]) => (
              <Panel key={label} title={String(label)}>
                <p className="text-3xl font-semibold">{value}</p>
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Distribuição por status">
              {data.statusDistribution.length > 0 ? (
                data.statusDistribution.map((item) => (
                  <div key={item.status} className="mb-3">
                    <div className="flex justify-between text-sm">
                      <span>{item.label}</span>
                      <span>
                        {item.count} · {item.percentage}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa contabilizada até o momento.
                </p>
              )}
            </Panel>

            <Panel title="Carga por gestão">
              {data.managements.length > 0 ? (
                data.managements.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between border-b border-border py-2 text-sm last:border-0"
                  >
                    <span>{item.name}</span>
                    <span>
                      {item.openTasks} {item.openTasks === 1 ? "tarefa" : "tarefas"} ·{" "}
                      {item.progress}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma gestão ativa cadastrada.
                </p>
              )}
            </Panel>
          </div>

          <Panel title="Insights inteligentes">
            {data.insights.length > 0 ? (
              data.insights.map((item) => (
                <div key={item.title} className="mb-3 rounded-lg border border-border p-3 last:mb-0">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Regra: {item.rule}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum alerta ou insight crítico identificado no momento.
              </p>
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
    <div className="mx-auto max-w-6xl space-y-4">
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
                  {project.code ? `[${project.code}] ${project.name}` : project.name}
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
