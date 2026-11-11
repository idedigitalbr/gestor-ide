# Instruções para agentes — IDE Gestor (`gestor-ide`)

## Visão Geral e Ecossistema

- **IDE Gestor (`https://gestor.suporteide.digital`):** Plataforma moderna de gestão empresarial (Projetos, Tarefas, Clientes, CRM Comercial, Financeiro e Membros), construída sobre a base tecnológica e visual do PlanW.
- **IDE CRM (`https://crm.suporteide.digital` / repo `idedigitalbr/idecrm`):** Fonte única de dados (MySQL/Prisma), autenticação, permissões RBAC e regras de negócio centralizadas. Fica hospedado online na VPS (não existe pasta local do CRM no PC). Toda integração ocorre via API remota.
- **Proibição de duplicação:** Não criar banco de dados paralelo, tabelas duplicadas ou cadastros independentes no IDE Gestor. Toda persistência deve consumir a API do IDE CRM via `@gestor-ide/sdk` e `@gestor-ide/core`.

## Runtime e Stack Oficial

- **Bun (`bun@1.4.3+`):** Único runtime e gerenciador de pacotes oficial do monorepo (`bunfig.toml`, `bun.lock`).
- **Turborepo:** Orquestração dos pacotes `apps/web`, `@gestor-ide/core`, `@gestor-ide/sdk`, `@gestor-ide/auth` e `@gestor-ide/ui`.
- **Frontend (`apps/web`):** Next.js 16.4, React 19.3, Tailwind CSS 4, Radix UI + shadcn/ui, Lucide Icons, rodando localmente na porta `3005` (`http://localhost:3005`) com proxy integrado `/api/crm/*` apontando para o IDE CRM online (`https://crm.suporteide.digital/api/*`).

## LEI Nº 1 — PADRONIZAÇÃO E REUTILIZAÇÃO OBRIGATÓRIAS

**REGRA MAIS IMPORTANTE DO FRONTEND:** **REUTILIZAR SEMPRE**. A ordem obrigatória é **shadcn/ui → Radix → Tailwind CSS 4 → tokens semânticos centralizados → componentes e variantes compartilhados**.

1. **Antes de criar JSX, procurar** em `apps/web/components/ui/`, `apps/web/components/`, `apps/web/lib/themes/`, `apps/web/app/globals.css` e `apps/web/components.json`.
2. **Controles padronizados:** Button, Input, Dialog, Popover, Switch, Select, DropdownMenu, Tabs, Tooltip, ScrollArea, Table e Badge vêm de `components/ui/`.
3. **Token-first:** Proibido introduzir cores HEX/RGB/HSL hardcoded em JSX, `className` ou CSS de páginas. Usar exclusivamente tokens semânticos (`bg-background`, `bg-card`, `bg-popover`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`).
4. **Validação obrigatória:** Revisar entregas contra Dark/Light e os 24 temas do catálogo (`bun run test:themes`, `bun run typecheck`, `bun run lint`, `bun run build`).
