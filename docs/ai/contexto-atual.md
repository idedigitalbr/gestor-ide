# IDE Gestor (`gestor-ide`) — contexto compartilhado atual

**Atualizado:** 17/11/2026. Resumo consolidado para alinhamento contínuo entre Will, ChatGPT e Antigravity.

## Identidade do produto & Arquitetura Oficial

- **Ecossistema:** IDE Gestor (`gestor-ide`) é a plataforma de gestão empresarial do ecossistema IDE Digital, consumindo o IDE CRM (`https://crm.suporteide.digital`) como fonte única da verdade via `@gestor-ide/sdk` e `@gestor-ide/core`.
- **Sem duplicação de banco:** Proibido SQLite local ou bancos paralelos. Persistência local ocorre via **IndexedDB + TanStack Query** (Issue #1 fechada com sucesso na `main`).
- **Resiliência Local-First:** Fila offline com Outbox em IndexedDB (`offline-outbox.ts`) armazena mutações locais (tarefas, status, checklists, comentários) em modo avião ou sem rede, sincronizando automaticamente de forma sequencial ao restabelecer a conexão.
- **Multiplataforma:** Aplicação web responsiva (`apps/web`), desktop nativo (`apps/desktop` com Tauri v2 para Windows, macOS, Linux) e mobile Android APK assinado (v0.1.7).

## Estado de execução confirmado

- **Issue #1 (Fechada):** Migração do estado do servidor para TanStack Query + persistência IndexedDB com hooks tipados (`useManagements`, `useProjects`, `useTasks`, `useProjectMembers`, `useProjectCustomViews`).
- **Kanban Completo & Tabela:** Colunas colapsáveis em trilho vertical (~48px), ocultação e restauração de colunas, ghost card com dwell de 2s, menu rápido `...` nos cards (abrir, mover status, prioridade, excluir), tabela agrupada por status/prioridade com campos configuráveis.
- **Modal de Tarefas:** Subtarefas/checklists interativos com barra de progresso segmentada, comentários com menções (@), anexos e persistência offline.
- **Distribuição Multi-plataforma:** Seletor de download inteligente na Home com detecção automática do SO do usuário, balão de dicas animado e downloads diretos (Windows OneClick, macOS, Linux, APK Android oficial assinado).
- **Qualidade & Auditoria:** 70/70 testes passando (`bun test`), 7 pacotes com typecheck estrito (`turbo typecheck`), 0 erros/0 avisos no ESLint, 24 temas oficiais validados, e build de produção Turbopack Next.js concluído com sucesso. Vulnerabilidade Zod sanada via `bun audit fix`.

**Regra Git simplificada por Will em 15/10:** somente `main` no fluxo de trabalho; 9 branches legadas arquivadas em tags de backup e removidas do remoto/local; sem novas PRs/branches rotineiras. Para UI, seguir referência observável, especificação autoral, implementação, comparação e refinamento; `docs/ITSAPLAN_REFERENCE.md` registra observações da referência. Frontend-only até aprovação de todo o protótipo.

## Fontes e sincronização

**Leia:** [AGENTS.md](../../AGENTS.md) → [PLAN.md](../PLAN.md) → [provenance](../provenance/README.md) quando houver UI/licença → Issue atual. Os registros [chatgpt-chats.md](chatgpt-chats.md) e [antigravity-chats.md](antigravity-chats.md) servem de histórico, não se sobrepõem ao plano nem ao código. O antigo [PLANO TIME/](../../PLANO%20TIME/) é história; não reativar operação antiga.

Sincronizar main antes de editar arquivos compartilhados. Registrar só fatos testados, decisões aprovadas, links e limitações. Nunca registrar segredos ou fingir que chat entre agentes é sincronizado automaticamente.
