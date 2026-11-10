# @planw — contexto compartilhado atual

**Atualizado:** 17/10/2026. Resumo manual para handoff entre ChatGPT e Antigravity; não é memória automática.

## Identidade do produto — decisão antiga, recuperada

**North star:** recriar progressivamente a experiência **completa do It's a Plan** como alternativa própria. Ele é a referência nº 1 para capacidades, telas, navegação, UX e fluxos; Notion, ClickUp, Linear, Plane e Twenty são secundários. **Não confundir a primeira Tabela + Kanban com a visão inteira.** O fork PLANW1 foi descontinuado como código, não como objetivo de produto.

**Independência:** código/estilo/arquitetura próprios; não copiar/adaptar código AGPL, CSS, assets ou identidade do It's a Plan. Requisitos podem partir de comportamentos legitimamente observados. Política e prova histórica em [provenance/README.md](../provenance/README.md). Sem garantia jurídica absoluta.

## Estado de execução confirmado

- **DEV SOLO OFFLINE:** Will decide produto e riscos significativos; ChatGPT planeja/revisa/edita GitHub; Antigravity programa no notebook. Muse, Hermes, VPS, OpenCode e ai-memory estão inativos.

- **Issue #1:** planejamento da primeira entrega visual aprovado/fechado. **Issue #18:** Tabela + Kanban em React/shadcn foi integrada à `main` no commit `301be90` ([PR #19](https://github.com/victorwilliames/planw/pull/19) mesclada); **Issue ainda aberta para aceite visual**. **Issue #20:** paridade comportamental do Kanban do It's a Plan implementada em frontend-only (colunas colapsáveis em trilhos verticais, ocultar/restaurar colunas, metas de estimativa e contadores de subtarefas nos cartões). Subentrega 1 (commit `a70f5e9`) e Subentrega 2 concluídas: lacunas pontuais da revisão técnica sanadas (isDirty abrangente com status/prioridade e rascunhos de comentário/subtarefa, banner sticky visível independente de scroll, preservação estrita de comentários e checklist via patch funcional no salvamento de campos); menu de ações rápidas compacto e acessível implementado no `KanbanCard` (`DropdownMenu` shadcn/Radix com MoreHorizontal) suportando abrir detalhes, alterar status, alterar prioridade e excluir com confirmação, sincronizado instantaneamente com Kanban e Tabela. Issues #18 e #20 permanecem abertas. Não fazer backend, autenticação nem persistência sem nova decisão.

- **Issue #4:** projeto GitHub/Sprints organizado e fechado. **PR #17:** correção do Drizzle integrada em main; **Issue #16** segue aberta para alertas de ferramentas transitivas; **Issue #2** registra auditoria/decisão arquitetural ainda aberta.

- **Project oficial:** views Backlog (Pendências) / Sprint (Atual) / Arquivados | Próximos Sprints; status Backlog, A Fazer, Em Andamento, Em Revisão, Bloqueado, Concluído. Prioridade e Tipo ocultos; Sprint histórica preservada.

- **App:** Bun/Turborepo/Next.js/React/Tailwind com scaffolds Elysia/Drizzle/PostgreSQL (Issue #22: Hono substituído por Elysia sobre Bun); smoke tests básicos positivos; Tabela + Kanban com paridade implementada no código da `main`; testes locais foram validados (typecheck, lint, build Turbopack 100% aprovados), aguardando aceite visual da UX por Will.

**Regra Git simplificada por Will em 15/10:** somente `main` no fluxo de trabalho; 9 branches legadas arquivadas em tags de backup e removidas do remoto/local; sem novas PRs/branches rotineiras. Para UI, seguir referência observável, especificação autoral, implementação, comparação e refinamento; `docs/ITSAPLAN_REFERENCE.md` registra observações da referência. Frontend-only até aprovação de todo o protótipo.

## Fontes e sincronização

**Leia:** [AGENTS.md](../../AGENTS.md) → [PLAN.md](../PLAN.md) → [provenance](../provenance/README.md) quando houver UI/licença → Issue atual. Os registros [chatgpt-chats.md](chatgpt-chats.md) e [antigravity-chats.md](antigravity-chats.md) servem de histórico, não se sobrepõem ao plano nem ao código. O antigo [PLANO TIME/](../../PLANO%20TIME/) é história; não reativar operação antiga.

Sincronizar main antes de editar arquivos compartilhados. Registrar só fatos testados, decisões aprovadas, links e limitações. Nunca registrar segredos ou fingir que chat entre agentes é sincronizado automaticamente.
