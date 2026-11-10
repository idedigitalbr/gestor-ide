"use client";

import React, { useState, useMemo } from "react";
import type {
  AppModuleSection,
  CrmCompany,
  CrmContact,
  CrmFinancialEntry,
  CrmFinancialSummary,
  CrmLead,
  CrmProjectMember,
} from "@gestor-ide/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Building2,
  DollarSign,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

interface EnterpriseModulesViewProps {
  section: Exclude<AppModuleSection, "tasks">;
  isConnected: boolean;
  contacts: CrmContact[];
  companies: CrmCompany[];
  leads: CrmLead[];
  financeSummary: CrmFinancialSummary | null;
  financeEntries: CrmFinancialEntry[];
  members: CrmProjectMember[];
  onRefresh: () => void;
  onOpenConnectModal: () => void;
}

const DEMO_CONTACTS: CrmContact[] = [
  {
    id: "ct-1",
    fullName: "Mariana Costa",
    email: "mariana@auroratech.com.br",
    phone: "(11) 99812-4410",
    jobTitle: "Diretora de Operações",
    status: "active",
    company: { id: "cp-1", name: "Aurora Tech" },
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "ct-2",
    fullName: "Rafael Albuquerque",
    email: "rafael@grupovanguard.com.br",
    phone: "(11) 98420-1190",
    jobTitle: "Head de Produto",
    status: "active",
    company: { id: "cp-2", name: "Grupo Vanguard" },
    createdAt: "2026-10-05T14:30:00.000Z",
  },
  {
    id: "ct-3",
    fullName: "Camila Nogueira",
    email: "camila@horizonte.digital",
    phone: "(21) 99210-3300",
    jobTitle: "CEO",
    status: "active",
    company: { id: "cp-3", name: "Horizonte Digital" },
    createdAt: "2026-10-12T09:15:00.000Z",
  },
];

const DEMO_COMPANIES: CrmCompany[] = [
  {
    id: "cp-1",
    name: "Aurora Tech",
    legalName: "Aurora Tecnologia e Sistemas Ltda",
    industry: "SaaS & Tecnologia",
    email: "contato@auroratech.com.br",
    _count: { contacts: 4, leads: 2 },
  },
  {
    id: "cp-2",
    name: "Grupo Vanguard",
    legalName: "Vanguard Participações S.A.",
    industry: "Consultoria Empresarial",
    email: "corporativo@grupovanguard.com.br",
    _count: { contacts: 3, leads: 1 },
  },
];

const DEMO_LEADS: CrmLead[] = [
  {
    id: "ld-1",
    title: "Implantação Plataforma Enterprise",
    value: 48000,
    temperature: "quente",
    status: "open",
    stage: { id: "st-1", name: "Proposta Comercial" },
    contact: { id: "ct-1", fullName: "Mariana Costa" },
    company: { id: "cp-1", name: "Aurora Tech" },
    createdAt: "2026-10-10T10:00:00.000Z",
  },
  {
    id: "ld-2",
    title: "Expansão de Squad & Automação",
    value: 24500,
    temperature: "morno",
    status: "open",
    stage: { id: "st-2", name: "Qualificação Técnica" },
    contact: { id: "ct-2", fullName: "Rafael Albuquerque" },
    company: { id: "cp-2", name: "Grupo Vanguard" },
    createdAt: "2026-10-14T15:00:00.000Z",
  },
];

const DEMO_FINANCE_ENTRIES: CrmFinancialEntry[] = [
  {
    id: "fe-1",
    type: "RECEIVABLE",
    status: "PAID",
    description: "Mensalidade Contrato Enterprise — Aurora Tech",
    amount: 12500,
    dueDate: "2026-10-15",
    category: { id: "cat-1", name: "Receita Recorrente" },
    contactProfile: { id: "fp-1", displayName: "Aurora Tech" },
  },
  {
    id: "fe-2",
    type: "RECEIVABLE",
    status: "PENDING",
    description: "Setup Integração Corporativa — Grupo Vanguard",
    amount: 8400,
    dueDate: "2026-10-25",
    category: { id: "cat-2", name: "Projetos & Setup" },
    contactProfile: { id: "fp-2", displayName: "Grupo Vanguard" },
  },
  {
    id: "fe-3",
    type: "PAYABLE",
    status: "PAID",
    description: "Infraestrutura Cloud & Licenciamento",
    amount: 2150,
    dueDate: "2026-10-10",
    category: { id: "cat-3", name: "Infraestrutura" },
    contactProfile: { id: "fp-3", displayName: "Provedor Cloud" },
  },
];

const DEMO_MEMBERS: CrmProjectMember[] = [
  {
    id: "pm-1",
    userId: "u-1",
    projectId: "p-1",
    role: "admin",
    user: { id: "u-1", name: "Will", email: "will@suporteide.digital" },
    project: { id: "p-1", name: "IDE Gestor Core" },
  },
  {
    id: "pm-2",
    userId: "u-2",
    projectId: "p-1",
    role: "member",
    user: { id: "u-2", name: "Equipe IDE Digital", email: "equipe@suporteide.digital" },
    project: { id: "p-1", name: "IDE CRM Integrado" },
  },
];

function formatCurrencyBRL(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function EnterpriseModulesView({
  section,
  isConnected,
  contacts,
  companies,
  leads,
  financeSummary,
  financeEntries,
  members,
  onRefresh,
  onOpenConnectModal,
}: EnterpriseModulesViewProps) {
  const [search, setSearch] = useState("");

  const activeContacts = isConnected && contacts.length > 0 ? contacts : DEMO_CONTACTS;
  const activeCompanies = isConnected && companies.length > 0 ? companies : DEMO_COMPANIES;
  const activeLeads = isConnected && leads.length > 0 ? leads : DEMO_LEADS;
  const activeEntries =
    isConnected && financeEntries.length > 0 ? financeEntries : DEMO_FINANCE_ENTRIES;
  const activeMembers = isConnected && members.length > 0 ? members : DEMO_MEMBERS;

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeContacts;
    return activeContacts.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.company?.name ?? "").toLowerCase().includes(q)
    );
  }, [activeContacts, search]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeLeads;
    return activeLeads.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.company?.name ?? "").toLowerCase().includes(q) ||
        (l.contact?.fullName ?? "").toLowerCase().includes(q)
    );
  }, [activeLeads, search]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeEntries;
    return activeEntries.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.contactProfile?.displayName ?? "").toLowerCase().includes(q)
    );
  }, [activeEntries, search]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeMembers;
    return activeMembers.filter(
      (m) =>
        (m.user.name ?? "").toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q) ||
        (m.project?.name ?? "").toLowerCase().includes(q)
    );
  }, [activeMembers, search]);

  return (
    <div className="flex flex-col gap-4 w-full text-xs">
      {/* Banner superior de contexto de integração com o IDE CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-secondary text-primary border border-border flex items-center justify-center shrink-0">
            {section === "clients" && <Building2 className="w-4 h-4" />}
            {section === "crm" && <TrendingUp className="w-4 h-4" />}
            {section === "finance" && <Wallet className="w-4 h-4" />}
            {section === "members" && <Users className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-foreground">
                {section === "clients" && "Clientes & Empresas"}
                {section === "crm" && "CRM Comercial & Pipeline"}
                {section === "finance" && "Gestão Financeira"}
                {section === "members" && "Membros & Equipes de Projeto"}
              </h2>
              <Badge
                variant="outline"
                className="text-[10px] border-border bg-secondary text-secondary-foreground"
              >
                {isConnected ? "Dados Reais IDE CRM" : "Visualização Integrada"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Base de dados compartilhada com o IDE CRM — sem duplicação de cadastros.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar registros..."
              className="h-7 w-44 pl-7 pr-2 text-xs bg-background border-border"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={isConnected ? onRefresh : onOpenConnectModal}
            className="h-7 text-xs gap-1.5 cursor-pointer"
          >
            {isConnected ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Atualizar</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>Conectar IDE CRM</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Visão: Clientes & Empresas */}
      {section === "clients" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Contatos Cadastrados
              </div>
              <div className="text-lg font-semibold text-foreground mt-1">
                {activeContacts.length}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Empresas Ativas
              </div>
              <div className="text-lg font-semibold text-foreground mt-1">
                {activeCompanies.length}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Fonte de Dados
              </div>
              <div className="text-xs font-medium text-primary mt-2">
                /api/contacts · /api/companies
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs">Nome do Contato</TableHead>
                  <TableHead className="text-xs">Empresa</TableHead>
                  <TableHead className="text-xs">Cargo</TableHead>
                  <TableHead className="text-xs">E-mail</TableHead>
                  <TableHead className="text-xs">Telefone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {contact.fullName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.company?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.jobTitle ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.phone ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Visão: CRM Comercial & Pipeline */}
      {section === "crm" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Oportunidades no Funil
              </div>
              <div className="text-lg font-semibold text-foreground mt-1">
                {activeLeads.length}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Volume em Negociação
              </div>
              <div className="text-lg font-semibold text-foreground mt-1">
                {formatCurrencyBRL(
                  activeLeads.reduce((acc, l) => acc + Number(l.value ?? 0), 0)
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Leads Quentes
              </div>
              <div className="text-lg font-semibold text-primary mt-1">
                {activeLeads.filter((l) => l.temperature === "quente").length}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs">Oportunidade</TableHead>
                  <TableHead className="text-xs">Empresa / Cliente</TableHead>
                  <TableHead className="text-xs">Etapa do Funil</TableHead>
                  <TableHead className="text-xs">Temperatura</TableHead>
                  <TableHead className="text-xs text-right">Valor Estimado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {lead.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {lead.company?.name || lead.contact?.fullName || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border">
                        {lead.stage?.name ?? "Qualificação"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={lead.temperature === "quente" ? "default" : "secondary"}
                        className="text-[10px] uppercase"
                      >
                        {lead.temperature ?? "normal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {formatCurrencyBRL(lead.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Visão: Financeiro */}
      {section === "finance" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3 h-3 text-primary" />
                <span>Total a Receber</span>
              </div>
              <div className="text-lg font-semibold text-foreground mt-1">
                {formatCurrencyBRL(
                  financeSummary?.totalReceivable ??
                    activeEntries
                      .filter((e) => e.type === "RECEIVABLE")
                      .reduce((acc, e) => acc + Number(e.amount ?? 0), 0)
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total a Pagar
              </div>
              <div className="text-lg font-semibold text-foreground mt-1">
                {formatCurrencyBRL(
                  financeSummary?.totalPayable ??
                    activeEntries
                      .filter((e) => e.type === "PAYABLE")
                      .reduce((acc, e) => acc + Number(e.amount ?? 0), 0)
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Lançamentos Listados
              </div>
              <div className="text-lg font-semibold text-primary mt-1">
                {activeEntries.length}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Categoria</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Vencimento</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {typeof entry.category === "string"
                        ? entry.category
                        : entry.category?.name ??
                          entry.categoryName ??
                          entry.financialCategory?.name ??
                          "Geral"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={entry.type === "RECEIVABLE" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {entry.type === "RECEIVABLE" ? "Receita" : "Despesa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] border-border">
                        {entry.status === "PAID" ? "Liquidado" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono">
                      {entry.dueDate.slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-foreground">
                      {formatCurrencyBRL(entry.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Visão: Membros & Equipes */}
      {section === "members" && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs">Membro</TableHead>
                <TableHead className="text-xs">E-mail</TableHead>
                <TableHead className="text-xs">Projeto Vinculado</TableHead>
                <TableHead className="text-xs">Papel no Projeto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="border-border">
                  <TableCell className="font-medium text-foreground">
                    {member.user.name || "Membro IDE"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.project?.name ?? "Acesso Global"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] uppercase border-border">
                      {member.role}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
