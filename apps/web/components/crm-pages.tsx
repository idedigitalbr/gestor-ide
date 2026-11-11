"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CrmAccount, CrmCalendarEvent, CrmProjectsDashboard } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CalendarEventDialog } from "@/components/calendar-event-dialog";
import { useCalendarDialog } from "@/components/calendar-dialog-context";

function Shell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl space-y-6"><div><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>{children}</div>;
}
function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) { return <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">{title}</h2>{description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}<div className="mt-5">{children}</div></section>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium"><span>{label}</span>{children}</label>; }
function Feedback({ message }: { message: string }) { return message ? <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">{message}</p> : null; }

function ExtraSettings({ settings, change }: { settings: Record<string, unknown>; change: (key: string, value: unknown) => void }) {
  const branding = (settings.branding ?? {}) as Record<string, unknown>;
  const notifications = (settings.projectNotifications ?? {}) as Record<string, unknown>;
  return <><Panel title="Identidade visual" description="Logo, favicon e cores do CRM."><div className="grid gap-4 sm:grid-cols-2">{[["URL da logo", "logoUrl"], ["URL do favicon", "faviconUrl"], ["Cor primária", "primaryColor"], ["Cor de destaque", "accentColor"]].map(([label, key]) => <Field key={key} label={label}><Input value={String(branding[key] ?? "")} onChange={e => change("branding", { ...branding, [key]: e.target.value })} /></Field>)}</div></Panel><Panel title="Automações de projetos" description="Controle os avisos automáticos de projetos."><div className="grid gap-3 sm:grid-cols-2">{[["Ativar notificações", "enabled"], ["Menções", "mentions"], ["Respostas", "replies"], ["Responsáveis", "responsibleNotifications"], ["Vencimentos", "reminders"]].map(([label, key]) => <label key={key} className="flex items-center gap-3 text-sm"><Switch checked={Boolean(notifications[key])} onCheckedChange={value => change("projectNotifications", { ...notifications, [key]: value })} />{label}</label>)}</div></Panel><Panel title="Credenciais de integração" description="Deixe os campos de senha vazios para manter as credenciais atuais."><div className="grid gap-4 sm:grid-cols-2">{[["Token da API", "apiToken"], ["URL Evolution API", "evolutionApiUrl"], ["Chave Evolution API", "evolutionApiKey"], ["Senha SMTP", "smtpPass"]].map(([label, key]) => <Field key={key} label={label}><Input type={key.includes("Url") ? "url" : "password"} value={String(settings[key] ?? "")} onChange={e => change(key, e.target.value)} autoComplete="off" /></Field>)}</div></Panel></>;
}

export function AccountPage() {
  const [account, setAccount] = useState<CrmAccount | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", password: "", confirmation: "" });
  useEffect(() => { void ideCrmClient.getAccount().then(r => setAccount(r.account)).catch(e => setMessage(e.message)); }, []);
  async function saveProfile(e: React.FormEvent) { e.preventDefault(); if (!account) return; setBusy(true); setMessage(""); try { const r = await ideCrmClient.updateAccount({ name: account.name ?? "", email: account.email, avatarUrl: account.avatarUrl }); setAccount(r.account); setMessage("Perfil atualizado."); } catch (e) { setMessage(e instanceof Error ? e.message : "Erro ao salvar perfil."); } finally { setBusy(false); } }
  async function savePassword(e: React.FormEvent) { e.preventDefault(); if (password.password !== password.confirmation) { setMessage("A confirmação da nova senha não confere."); return; } setBusy(true); setMessage(""); try { await ideCrmClient.updateAccount({ currentPassword: password.currentPassword, password: password.password }); setPassword({ currentPassword: "", password: "", confirmation: "" }); setMessage("Senha atualizada."); } catch (e) { setMessage(e instanceof Error ? e.message : "Erro ao alterar senha."); } finally { setBusy(false); } }
  return <Shell title="Configurações da conta" description="Atualize seus dados pessoais, sua foto e a senha de acesso."><Feedback message={message} />{account && <div className="grid gap-5 lg:grid-cols-2"><Panel title="Perfil pessoal" description="Esses dados aparecem no cabeçalho e nas áreas de trabalho."><form onSubmit={saveProfile} className="space-y-4"><div className="flex items-center gap-4">{account.avatarUrl ? <img src={account.avatarUrl} alt="Foto do perfil" className="size-16 rounded-full object-cover" /> : <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">{(account.name || account.email).slice(0, 2).toUpperCase()}</span>}<Field label="Escolher foto"><Input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); void ideCrmClient.uploadAvatar(file).then(r => { setAccount(r.account); setMessage("Foto atualizada."); }).catch(err => setMessage(err.message)).finally(() => setBusy(false)); }} /></Field></div><Field label="Nome"><Input required value={account.name ?? ""} onChange={e => setAccount({ ...account, name: e.target.value })} /></Field><Field label="Email"><Input required type="email" value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })} /></Field><Button disabled={busy}>Salvar perfil</Button></form></Panel><Panel title="Segurança" description="Altere sua senha sem sair da conta."><form onSubmit={savePassword} className="space-y-4"><Field label="Senha atual"><Input required type="password" autoComplete="current-password" value={password.currentPassword} onChange={e => setPassword({ ...password, currentPassword: e.target.value })} /></Field><Field label="Nova senha (mínimo de 12 caracteres)"><Input required minLength={12} type="password" autoComplete="new-password" value={password.password} onChange={e => setPassword({ ...password, password: e.target.value })} /></Field><Field label="Confirmar nova senha"><Input required minLength={12} type="password" autoComplete="new-password" value={password.confirmation} onChange={e => setPassword({ ...password, confirmation: e.target.value })} /></Field><Button disabled={busy}>Alterar senha</Button></form></Panel></div>}</Shell>;
}

export function DashboardPage() {
  const [data, setData] = useState<CrmProjectsDashboard | null>(null); const [error, setError] = useState("");
  useEffect(() => { void ideCrmClient.getProjectsDashboard().then(r => setData(r.dashboard)).catch(e => setError(e.message)); }, []);
  return <div className="space-y-4"><h1 className="text-xl font-semibold">Dashboard de projetos</h1><Feedback message={error} />{!data && !error && <p role="status" className="text-sm text-muted-foreground">Carregando indicadores...</p>}{data && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Gestões ativas", data.metrics.activeManagements], ["Projetos", data.metrics.totalProjects], ["Tarefas abertas", data.metrics.openTasks], ["Tarefas atrasadas", data.metrics.overdueTasks]].map(([label, value]) => <Panel key={label} title={String(label)}><p className="text-3xl font-semibold">{value}</p></Panel>)}</div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Distribuição por status">{data.statusDistribution.map(item => <div key={item.status} className="mb-3"><div className="flex justify-between text-sm"><span>{item.label}</span><span>{item.count} · {item.percentage}%</span></div><div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${item.percentage}%` }} /></div></div>)}</Panel><Panel title="Carga por gestão">{data.managements.map(item => <div key={item.id} className="flex justify-between border-b border-border py-2 text-sm"><span>{item.name}</span><span>{item.openTasks} tarefas · {item.progress}%</span></div>)}</Panel></div><Panel title="Insights inteligentes">{data.insights.map(item => <div key={item.title} className="mb-3 rounded-lg border border-border p-3"><h3 className="font-medium">{item.title}</h3><p className="text-sm text-muted-foreground">{item.description}</p><p className="mt-1 text-xs text-muted-foreground">Regra: {item.rule}</p></div>)}</Panel></>}</div>;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { void ideCrmClient.getSettings().then(r => setSettings(r.settings)).catch(e => setMessage(e.message)); }, []);
  const change = (key: string, value: unknown) => setSettings(s => s ? { ...s, [key]: value } : s);
  async function save() { if (!settings) return; setBusy(true); try { const clean = Object.fromEntries(Object.entries(settings).filter(([key]) => !key.startsWith("has"))); await ideCrmClient.saveSettings(clean); setMessage("Configurações salvas."); } catch (e) { setMessage(e instanceof Error ? e.message : "Erro ao salvar."); } finally { setBusy(false); } }
  return <Shell title="Configurações" description="Gerencie perfil, integrações, notificações e canais de envio do CRM."><Feedback message={message} />{settings && <><Panel title="Perfil"><div className="grid gap-4 sm:grid-cols-2">{[["Nome", "profileName"], ["Email", "profileEmail"]].map(([label, key]) => <Field key={key} label={label}><Input value={String(settings[key] ?? "")} onChange={e => change(key, e.target.value)} /></Field>)}</div></Panel><Panel title="Notificações"><div className="space-y-3">{[["Email de novos leads", "notifyNewLeads"], ["Relatório semanal", "notifyWeeklyReport"], ["Alertas de automação", "notifyAutomationAlerts"]].map(([label, key]) => <label key={key} className="flex items-center gap-3 text-sm"><Switch checked={Boolean(settings[key])} onCheckedChange={value => change(key, value)} />{label}</label>)}</div></Panel><Panel title="Integrações e email"><div className="grid gap-4 sm:grid-cols-2">{[["API URL", "apiUrl"], ["SMTP host", "smtpHost"], ["SMTP porta", "smtpPort"], ["SMTP usuário", "smtpUser"], ["Email de envio", "smtpFromEmail"]].map(([label, key]) => <Field key={key} label={label}><Input value={String(settings[key] ?? "")} onChange={e => change(key, e.target.value)} /></Field>)}</div></Panel><ExtraSettings settings={settings} change={change} /><Button onClick={() => void save()} disabled={busy}>{busy ? "Salvando..." : "Salvar configurações"}</Button></>}</Shell>;
}

export function CalendarPage() {
  const [date, setDate] = useState(() => new Date());
  const [items, setItems] = useState<Array<{ id: string; title: string; date: string; event?: CrmCalendarEvent }>>([]);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestVersion = useRef(0);
  const { open: dialog, setOpen: setDialog, editing, setEditing, setCanCreate } = useCalendarDialog();
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    setFallback(false);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    try {
      const r = await ideCrmClient.getCalendar(start.toISOString(), end.toISOString());
      if (version !== requestVersion.current) return;
      setItems([...(r.events ?? []).map(e => ({ id: `e${e.id}`, title: e.title, date: e.allDayStartDate ?? e.startsAt ?? "", event: e })), ...(r.tasks ?? []).map(t => ({ id: `t${t.id}`, title: t.title, date: t.dueDate ?? t.startDate ?? "" }))].filter(i => i.date).sort((a, b) => a.date.localeCompare(b.date)));
    } catch {
      if (version !== requestVersion.current) return;
      try {
        const result = await ideCrmClient.listCalendarFallbackTasks();
        if (version !== requestVersion.current) return;
        setItems(result.tasks.flatMap(task => {
          const taskDate = task.dueDate ?? task.startDate;
          return taskDate?.slice(0, 7) === month ? [{ id: `t${task.id}`, title: task.title, date: taskDate }] : [];
        }).sort((a, b) => a.date.localeCompare(b.date)));
        setFallback(true);
      } catch (reason) {
        if (version !== requestVersion.current) return;
        setItems([]);
        setError(reason instanceof Error ? reason.message : "Não foi possível carregar as tarefas.");
      }
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [date]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  useEffect(() => { setCanCreate(!loading && !fallback && !error); return () => setCanCreate(false); }, [loading, fallback, error, setCanCreate]);
  return <div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="icon" aria-label="Mês anterior" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft /></Button><h2 className="min-w-40 text-center font-semibold capitalize">{date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</h2><Button variant="outline" size="icon" aria-label="Próximo mês" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight /></Button><Button variant="outline" onClick={() => setDate(new Date())}>Hoje</Button></div><Feedback message={error} />{fallback && <div role="status" className="rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">O calendário do CRM está indisponível. Exibindo as tarefas com prazo ou início neste mês; eventos não estão disponíveis. <button type="button" className="text-primary underline" onClick={() => void load()}>Tentar novamente</button></div>}<Panel title="Agenda do mês">{loading ? <p role="status" className="text-sm text-muted-foreground">Carregando agenda...</p> : error ? <p className="text-sm text-muted-foreground">A agenda não pôde ser carregada.</p> : items.length ? items.map(item => <div key={item.id} className="flex flex-wrap items-center gap-4 border-b border-border py-3 text-sm"><span className="shrink-0 text-muted-foreground">{new Date(`${item.date.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR")}</span><span className="flex-1">{item.title}</span>{item.event && !item.event.isAllDay && <Button size="sm" variant="ghost" onClick={() => { setEditing(item.event!); setDialog(true); }}>Editar</Button>}</div>) : <p className="text-sm text-muted-foreground">{fallback ? "Nenhuma tarefa com prazo ou início neste mês." : "Nenhum evento ou tarefa neste mês."}</p>}</Panel><CalendarEventDialog event={editing} open={dialog} onOpenChange={setDialog} onSaved={load} /></div>;
}
