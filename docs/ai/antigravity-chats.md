# @planw — notas de sessões do Antigravity

**Natureza:** memória manual. **Editor preferencial:** Antigravity. Não integra ai-memory.
**Atualizado:** 2026-10-13.

## Instruções para atualizações

- Ler AGENTS.md e docs/ai/contexto-atual.md antes de iniciar trabalho relevante.
- Após tarefas importantes, registrar **data, objetivo, resultado real, testes, arquivos/commits alterados e pendências**.
- Nunca inventar testes ou afirmar que código está pronto sem evidência.
- Não transcrever chats inteiros; resumir fatos úteis. Corrigir informação vencida e usar histórico Git para detalhes antigos.
- Verificar mudanças recentes do ChatGPT e sincronizar repositório antes de sobrescrever arquivos de contexto.
- DEV OFFLINE (decisão atualizada em 13/10/2026): **Issues e GitHub Project são obrigatórios para entregas acompanháveis; PR é opcional para mudanças pequenas.** Antigravity programa no notebook; commits pequenos e seguros podem ir à main referenciando a Issue. Não fazer push forçado nem ampliar escopo.

## 2026-10-13 — Sincronização inicial, assimilação do DEV OFFLINE e Blindagem Clean Room

- **Objetivo:** Clonar repositório no notebook local, assimilar o modelo DEV OFFLINE aprovado por Will e incorporar as diretrizes de blindagem jurídica Clean Room do documento `HANDOFF_REA_ITSAPLAN_PLANW.md`.
- **Ações e resultados:**
  1. **Repositório local:** Clonado e atualizado diretamente de `origin/main` (commit `db9b5f6`, PR #13 integrada). PRs antigas sobrepostas (#11 e #12) encerradas com status limpo.
  2. **Modo DEV OFFLINE assimilado:** Confirmado fluxo solo simplificado (Antigravity no notebook HP, ChatGPT no planejamento/docs, Will na direção). Sem VPS, sem Muse, sem serviços 24/7. Commits pequenos podem ir direto na `main`.
  3. **Blindagem Jurídica e Clean Room (It's a Plan -> @planw):**
     - O *It's a Plan* serve **exclusivamente como especificação de experiência/funcionalidades** (Tabela Notion-like, Kanban ágil compartilhando a mesma base de dados).
     - **Zero contaminação AGPL-3.0:** proibido fork, cópia de arquivos ou reescrita direta de código. Código 100% original e autoral escrito do zero pelo Antigravity para permitir SaaS proprietário e comercialização futura.
     - Stack sugerida na sessão, ainda sujeita à validação de compatibilidade e licenças (não aprovada formalmente): Next.js App Router, React, Tailwind CSS, `shadcn/ui`, `@tanstack/react-table`, `@dnd-kit` ou `@hello-pangea/dnd`, Drizzle ORM.
     - Proposta para avaliar: SQLite local (via Drizzle), visando poupar RAM/CPU do notebook; ainda não foi escolhida como substituição oficial do PostgreSQL.
  4. **REA (Reverse Engineer Anything):** Alinhado que o REA é para desconstrução de caixas-pretas fechadas (ex.: desktop do Notion ou Linear) e não serve/não é necessário para o It's a Plan, que já é aberto.
- **Arquivos verificados/afetados:**
  - `AGENTS.md`, `docs/PLAN.md`, `docs/README.md`, `docs/ai/contexto-atual.md`, `docs/ai/chatgpt-chats.md`.
  - Atualização deste `docs/ai/antigravity-chats.md`.
- **Pendências:**
  - Aguardar definição de Will sobre o primeiro recorte do MVP visual para iniciar a codificação da Tabela e Kanban no `apps/web`.

## 2026-10-13 (Sessão 2) — Validação local do scaffold (Issue #2) e fluxo operacional (Issue #4)

- **Objetivo:** Validar no notebook local o scaffold do monorepo (`bun install`, `lint`, `typecheck`, `build`, `dev:web`, `apps/api` e `bun audit`) e exercitar o fluxo operacional com GitHub Issues e Projects.
- **Ações e resultados reais:**
  1. **Ambiente:** Bun v1.4.3 instalado com sucesso no Windows via script oficial.
  2. **Instalação:** `bun install --frozen-lockfile` concluiu em 21.59s (409 pacotes) com zero erros.
  3. **Lint:** `bun run lint` (`turbo lint`) passou em 10.50s com zero erros.
  4. **Typecheck:** `bun run typecheck` (`turbo typecheck`) validou todos os 8 pacotes em 7.21s com zero erros.
  5. **Build:** `bun run build` (`turbo build`) gerou build de produção Turbopack do Next.js 16.4.0 em 15.14s com zero erros.
  6. **Execução Web (`apps/web`):** Servidor de desenvolvimento testado em `http://localhost:3000`, retornou status 200 OK com HTML válido e `<html lang="pt-BR">`.
  7. **Execução API (`apps/api`):** Servidor Hono testado em `http://localhost:4000/health`, retornou `{"ok": true, "service": "planw-api"}`.
  8. **Segurança (`bun audit`):** 3 vulnerabilidades identificadas (`drizzle-orm <0.45.2`, `braces` e `esbuild` transitivos).
  9. **Gestão e Issues:**
     - Issue #2 atualizada com checklist completo e comentário detalhado com evidências reais.
     - Issue #4 comentada registrando a validação do fluxo e reportando que a CLI `gh` local não possui o escopo `project` para manipular cartões do Project v2 via terminal (Will pode mover no Kanban web/mobile ou rodar `gh auth refresh -s project`).
- **Pendências e Próximos Passos:**
  - Decisão de Will sobre a proposta de adotar SQLite local no `@planw/db` para o desenvolvimento offline.
  - Alinhamento do recorte de MVP (Issue #1) com Will e ChatGPT para iniciar a implementação da Tabela e Kanban no `apps/web`.

## 2026-10-13 (Sessão 3) — Desbloqueio do GitHub Projects, Orientação Arquitetural e Correção de Segurança (Issue #16 / PR #17)

- **Objetivo:** Desbloquear escopo de GitHub Projects no token local, atualizar cartões do Kanban conforme progresso real, registrar decisão arquitetural na Issue #2 e tratar alertas de segurança do `bun audit`.
- **Ações e resultados reais:**
  1. **GitHub Projects Desbloqueado:** Autorização do escopo `project` concluída com sucesso via device login no navegador por Will. `gh project` totalmente operacional via CLI.
  2. **Quadro Kanban Atualizado (Project 1 - PlanW):**
     - Issue #2: movida para `In Progress`.
     - Issue #4: movida para `In Progress`.
     - Issue #1: conferida em `Backlog` (P1, Research, Sprint 0).
     - Issue #16: criada para rastrear alertas do audit e movida para `In Review` (vinculada à PR #17).
  3. **Decisão de Arquitetura (Issue #2):** Tech lead orientou manter a configuração com PostgreSQL e **não migrar para SQLite agora**, preservando a base atual enquanto o escopo do MVP é finalizado. Comentário formal registrado na Issue #2.
  4. **Correção de Segurança (Issue #16 e PR #17):**
     - Criada Issue #16 e branch isolada `fix/sec-drizzle-orm`.
     - Atualizado `drizzle-orm` para `^0.45.4` em `packages/db/package.json` e `bun.lock`.
     - Vulnerabilidade de SQL injection (GHSA-gpj5-g38j-94v9) eliminada com sucesso.
     - Testes locais de regressão aprovados com 100% de sucesso (`bun install`, `lint`, `typecheck` e `build`).
     - Alertas restantes analisados como dependências puramente transitivas de desenvolvimento (`braces` no eslint-config-next e `esbuild` no drizzle-kit).
     - Aberta a PR #17 (`closes #16`) para revisão humana.
- **Pendências:**
  - Revisão e autorização de merge da PR #17 por Will.
  - Alinhamento final da visão/escopo do MVP (Issue #1) com Will e ChatGPT para iniciar a Tabela e Kanban.

## 2026-10-13 (Sessão 4) — Organização das Sprints e Views no GitHub Project PlanW (Issue #4)

- **Objetivo:** Criar e validar a view `Sprints | Histórico` no Project 1, auditar a atribuição da Sprint 0, retirar as ideias adiadas (#3, #5 e #6) da Sprint ativa e configurar as visões do painel.
- **Ações e resultados reais:**
  1. **Criação da View `Sprints | Histórico` (View 8):**
     - Layout: `Table`.
     - Filtro: `is:issue has:Sprint` (exibe tarefas ativas e concluídas).
     - Campos visíveis: `Title`, `Status`, `Sprint`, `Priority` e `Tipo`.
     - Link direto: https://github.com/users/victorwilliames/projects/1/views/8
  2. **Auditoria da Sprint 0:**
     - Total de 8 itens na Sprint 0: 4 em andamento (#1, #2, #4, #16) e 4 concluídos preservados no histórico (PR #7, #8, PR #9, #10).
     - As Issues adiadas (#3, #5 e #6) tiveram seu campo Sprint limpo via CLI, permanecendo no Backlog geral sem Sprint ativa.
  3. **Demais Views Preservadas e Configuradas no Project 1:**
     - `Board | Workflow` (View 3): `is:issue`
     - `Table | Backlog` (View 9): `is:issue is:open -status:Done`
     - `Sprint | Current` (View 10): `is:issue sprint:@current`
     - `Review | PRs` (View 11): `is:pr`
     - `Blocked` (View 12): `status:Blocked`
  4. **Atualização da Issue #4:**
     - Checklist da Issue #4 marcado com todas as etapas cumpridas.
     - Comentário com links diretos, filtros e contagem de itens publicado na Issue #4.
- **Pendências:**
  - Validação da visualização no celular por Will.
  - Finalização do recorte do MVP (Issue #1) com Will e ChatGPT para iniciar a implementação da Tabela e Kanban.

## 2026-10-15 (Sessão 5) — Ajustes Finais do GitHub Project PlanW (Issue #4)

- **Objetivo:** Aplicar a simplificação máxima aprovada por Will no GitHub Project PlanW: traduzir os Status para PT-BR preservando IDs, ocultar `Priority` e `Tipo` das três views principais, configurar os filtros exatos de fluxo e ajustar cartões da Sprint 0.
- **Ações e resultados reais:**
  1. **Preservação estrita das três abas de Will:**
     - `Backlog (Pendências)`: [View 9](https://github.com/users/victorwilliames/projects/1/views/9)
     - `Sprint (Atual)`: [View 10](https://github.com/users/victorwilliames/projects/1/views/10)
     - `Arquivados | Próximos Sprints`: [View 8](https://github.com/users/victorwilliames/projects/1/views/8)
  2. **Tradução das opções de `Status` para PT-BR (IDs e vínculos preservados):**
     - `Backlog` → `Backlog` (inalterado)
     - `Ready` → `A Fazer`
     - `In Progress` → `Em Andamento`
     - `In Review` → `Em Revisão`
     - `Blocked` → `Bloqueado`
     - `Done` → `Concluído`
  3. **Simplificação e Ocultação de Campos:**
     - `Priority` e `Tipo` foram ocultados das views 8, 9 e 10 via GraphQL (`visibleFieldIds`), sem deletar campos nem dados. As views exibem estritamente `Title`, `Status` e `Sprint`.
  4. **Fluxo e Filtros Atualizados:**
     - **View 9 (`Backlog (Pendências)`):** Filtro `is:issue is:open no:sprint` (mostra somente tarefas abertas sem Sprint atribuída: #3, #5 e #6).
     - **View 10 (`Sprint (Atual)`):** Filtro `is:issue sprint:@current -status:Backlog` (inicia na coluna `A Fazer`, ocultando a coluna `Backlog`).
     - **Ajuste de Card na Sprint 0:** Issue #1 atualizada para `Status: A Fazer` por já estar selecionada para o ciclo.
     - **View 8 (`Arquivados | Próximos Sprints`):** Filtro `is:issue has:Sprint` (exibe 6 Issues da Sprint 0: 4 ativas + 2 concluídas). Esclarecida a contagem total de 8 itens no banco devido às 2 PRs históricas (#7 e #9).
  5. **Documentação e Issue #4:**
     - `AGENTS.md` e `docs/ai/contexto-atual.md` sincronizados com a nova nomenclatura em PT-BR.
     - Issue #4 comentada com todas as evidências.
- **Pendências:**
  - Confirmação visual de Will pelo celular (concluída na sessão 6).
  - Finalização do recorte do MVP (Issue #1) com Will e ChatGPT para iniciar a implementação da Tabela e Kanban.

## 2026-10-15 (Sessão 6) — Encerramento da Issue #4, Validação da PR #17 e Diagnóstico de Segurança (Issue #16)

- **Objetivo:** Encerrar formalmente a Issue #4 após aprovação de Will, revisar e testar integralmente a PR #17 (`fix/sec-drizzle-orm`) contra a `main`, ajustar vínculo de fechamento trocando para `refs #16`, e diagnosticar tecnicamente os alertas de `braces` e `esbuild`.
- **Ações e resultados reais:**
  1. **Finalização da Issue #4 (Concluída):**
     - Will validou e aprovou a organização do quadro no celular.
     - As três views oficiais (`Backlog (Pendências)`, `Sprint (Atual)` e `Arquivados | Próximos Sprints`) foram revalidadas e permanecem íntegras.
     - Status da Issue #4 atualizado para `Concluído` no Project PlanW e Issue #4 formalmente fechada no GitHub via CLI. Histórico na `Sprint 0` preservado.
  2. **Revisão e Validação da PR #17:**
     - Branch `fix/sec-drizzle-orm` atualizada com a `main` recente via merge limpo.
     - Descrição da PR #17 editada no GitHub para trocar `closes #16` por `refs #16`, evitando encerramento prematuro da Issue #16.
     - Bateria completa de testes executada no notebook:
       - `bun install --frozen-lockfile` (aprovado, lockfile íntegro).
       - `bun run lint` (aprovado, 0 erros).
       - `bun run typecheck` (aprovado, 8 pacotes verificados com sucesso).
       - `bun run build` (aprovado, Next.js Turbopack compilado).
       - `bun audit` (confirmou eliminação da vulnerabilidade de SQL injection do `drizzle-orm`).
     - PR #17 validada e pronta para merge, aguardando aprovação de Will.
  3. **Diagnóstico dos Alertas Restantes (Issue #16):**
     - `braces@3.0.3` (High): dependência transitiva do ESLint (`micromatch`) sem patch upstream lançado na linha 3.x (3.0.3 é a versão mais recente). Não há entrada de dados não confiável exposta, impacto nulo em runtime de produção.
     - `esbuild@0.18.20` (Moderate): dependência transitiva do `drizzle-kit` via `@esbuild-kit/core-utils`. Falha restrita ao servidor de dev do esbuild (`--serve`), que nunca é executado no pipeline de migrações. Impacto nulo em runtime de produção.
     - Diagnóstico completo e recomendações registrados na Issue #16.
## 2026-10-15 (Sessão 7) — Primeira Implementação Visual de Tarefas: Tabela + Kanban (Issue #18)

- **Objetivo:** Implementar a primeira experiência real de Tabela e Kanban no frontend `apps/web`, substituindo o placeholder de scaffold por uma interface funcional e responsiva em React 19 / Next.js 16 / Tailwind CSS v4, mantendo independência Clean Room estrita (100% autoral, zero contaminação AGPL, sem persistência ou auth nesta etapa).
- **Ações e resultados reais:**
  1. **Acompanhamento no GitHub Project PlanW:**
     - Issue #18 associada à `Sprint 0` (`f42f935f`) e colocada em `Em Andamento` no Project 1.
     - Após implementação e validações, movida para `Em Revisão` para avaliação de Will.
  2. **Arquitetura e Implementação Autoral:**
     - Coleção única de tarefas em memória (`Task[]`) no cliente, com sincronização em tempo real entre Tabela e Kanban.
     - `apps/web/types/task.ts`: tipagem de tarefas, status (`A Fazer`, `Em Andamento`, `Em Revisão`, `Concluído`), prioridades, filtros e modos de visão.
     - `apps/web/lib/initial-data.ts`: dados realistas de demonstração da Sprint 0.
     - `apps/web/components/icons.tsx`: ícones SVG puros, leves e acessíveis.
     - `apps/web/components/task-table/`: tabela Notion-style com edição inline de título, seletor de status com badge colorido, prazos, linha de inserção rápida no rodapé e ações.
     - `apps/web/components/task-kanban/`: 4 colunas com contadores, suporte a Drag & Drop nativo HTML5 e botões acessíveis de movimentação (`←` / `→`) para suporte em mobile e teclado.
     - `apps/web/components/task-modal.tsx`: modal/drawer de detalhes com arquitetura key-based compatível com React 19 (sem `setState` em efeitos).
     - `apps/web/components/app-header.tsx`: alternador Tabela / Kanban, busca textual em tempo real, filtros de status/prioridade e CTA de criação.
     - `apps/web/components/sidebar.tsx`: métricas dinâmicas da Sprint (barra de progresso e contagens) e gaveta responsiva para mobile.
     - `apps/web/components/empty-state.tsx`: visualização de estados vazios para filtros ou ausência de tarefas.
     - `apps/web/app/page.tsx`: integração modular de alta performance.
  3. **Decisões autorais de UX registradas:**
     - Alternância de visão instantânea com estado compartilhado sem latência de rede.
     - Transições de status multimodais (Drag & Drop + botões direcionais no cartão).
     - Edição em linha ágil combinada com modal de detalhes para textos longos.
     - Cores semânticas padronizadas (Slate, Sky, Amber, Emerald) com alta legibilidade.
  4. **Validações e Testes Locais:**
     - `bun install --frozen-lockfile`: 419 instalações verificadas, sem alterações.
     - `bun run typecheck`: 8 pacotes verificados com sucesso.
     - `bun run lint`: 0 erros de ESLint com regras do React 19.
     - `bun run build`: compilação Turbopack do Next.js 16.4.0 concluída com sucesso em 16.9s.
     - `bun run dev:web`: servidor testado em `http://localhost:3000`, retornou status 200 OK com HTML e dados validados.
- **Pendências:**
  - Avaliação visual de Will em `http://localhost:3000` (conduzida pelo Tech Lead).
  - Execução da reconstrução visual detalhada na Sessão 8.

## 2026-10-15 (Sessão 8) — Reconstrução Visual Completa com shadcn/ui e Paridade ao It's a Plan (refs #18)

- **Objetivo:** Reformulação completa da camada visual de Tabela e Kanban no `apps/web` após reprovação visual da primeira entrega, adotando shadcn/ui real, paleta sóbria matte charcoal (`#101113`, `#18191C`), proporções compactas, eliminação da barra de rolagem forçada e resolução do erro de overlay `1 Issue` do Next.js.
- **Ações e resultados reais:**
  1. **Branch e Estratégia de Isolamento:**
     - Criada branch dedicada `redesign/shadcn-visual-overhaul` conforme processo de segurança do `AGENTS.md`.
  2. **Design System Sóbrio e Profissional:**
     - Abandonado o tom azul-marinho saturado em favor de uma paleta neutra charcoal/grafite inspirada no It's a Plan (`#101113` background, `#131416` sidebar, `#18191C` cards/popovers, `#26282C` bordas, `#E8E9EB` texto principal e `#92959C` texto secundário).
     - Scrollbars customizadas discretas e finas (`::-webkit-scrollbar`), eliminando a barra branca ruidosa do Windows.
     - `apps/web/app/layout.tsx`: configurado com classe `dark` padrão e `suppressHydrationWarning` em `<html>` e `<body>`, eliminando alertas de extensões do navegador (como ColorZilla / `cz-shortcut-listen`) que causavam a notificação `1 Issue` do Next.js.
     - Formatação determinística de datas em `apps/web/lib/initial-data.ts`, prevenindo hydration mismatches.
  3. **Instalação e Uso Real do shadcn/ui e Radix Primitives:**
     - Dependências adicionadas ao monorepo com Bun: `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-separator`, `@radix-ui/react-scroll-area`, `@radix-ui/react-tooltip`, `@radix-ui/react-slot`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`.
     - `components.json` configurado oficialmente.
     - Utilitário `cn` em `apps/web/lib/utils.ts`.
     - Componentes shadcn instalados e efetivamente integrados em `apps/web/components/ui/`: `Button`, `Input`, `Textarea`, `Dialog`, `DropdownMenu`, `Select`, `Table`, `Badge`, `Separator`, `ScrollArea`, `Tabs`, `Tooltip`.
  4. **Redesign dos Módulos da Interface:**
     - **Sidebar:** compacta (~200px), sem gradientes artificiais, sem barra de progresso desnecessária, com navegação limpa (`Inbox 24`, `Dashboards`, `Tarefas` ativo, `Iniciativas`, `Notas`, `Automação`, `Configuração`).
     - **Header & Sub-toolbar:** pílula flutuante centralizada com seletor `Filtros | Quadro | Tabela`, sub-toolbar com aba `Todas`, busca compacta, dropdowns shadcn para status e prioridade, e botão `+ Nova Tarefa`.
     - **Kanban:** colunas compactas (240-300px) responsivas, `min-w-[1160px]` estático removido, uso de `ScrollArea` do shadcn, cards com código do ticket (`PLAN-101`), ícone de prioridade em barras/alerta (`PriorityIcon`), ícone de status (`StatusIcon`), tag contextual, data enxuta (`16 out.`), avatar e steppers direcionais sutis.
     - **Tabela:** estrutura agrupada por status com seções colapsáveis (`⌄ ◌ A Fazer 2`, `⌄ ◷ Em Andamento 2`, etc.), linhas densas de 36px, edição inline de título ao clicar, alteração de status/prioridade por dropdown shadcn e linha rápida de adição (`+ Adicionar tarefa`) por grupo.
     - **Modal/Drawer:** construído com `Dialog`, `Input`, `Textarea` e `Select` do shadcn, com inicialização baseada em chaves do React 19.
  5. **Inspeção Visual e Screenshots Reais:**
     - Captura realizada via Chromium headless em `http://localhost:3000`:
       - `screenshots/desktop-kanban.png` (Desktop 1366x768 - Kanban)
       - `screenshots/desktop-table.png` (Desktop 1366x768 - Tabela)
       - `screenshots/mobile.png` (Mobile 390x844 - Kanban responsivo)
     - Imagens inspecionadas e validadas: alta sobriedade, densidade elegante, ausência de erros no console ou overlay.
  6. **Validações Técnicas:**
     - `bun install --frozen-lockfile`: 469 pacotes verificados, lockfile preservado.
     - `bun run typecheck`: 8 pacotes verificados com 100% de sucesso.
     - `bun run lint`: 0 erros, 0 avisos.
     - `bun run build`: Next.js 16.4.0 (Turbopack) compilado com sucesso em 24.1s.
- **Pendências:**
  - Avaliação visual de Will nas novas capturas e em `http://localhost:3000`.
  - Abrir PR para merge na `main` após aprovação de Will.

## 2026-10-15 (Sessão 9) — Auditoria shadcn/ui e Refinamento Final de UI/UX (refs #18 / PR #19)

- **Objetivo:** Responder aos 7 pontos da missão de auditoria shadcn/ui e refinamento de UI/UX solicitados pelo Tech Lead (ChatGPT) e Will:
  1. Preservar o novo visual aprovado.
  2. Auditar e demonstrar uso real dos componentes shadcn/ui e Radix primitives.
  3. Ajustar tipografia, contraste e dimensionamento (evitar microtextos e aumentar contraste).
  4. Refinar o Modal (`DialogDescription`, acessibilidade, contraste e botões de ação).
  5. Tornar a Sidebar honesta (alternância funcional `Quadro Kanban` / `Tabela` e selos `Breve` nos módulos futuros).
  6. Preservar todas as funcionalidades do MVP (estado React em memória sincronizado, dual view, edição inline, drag-and-drop, steppers e busca/filtros).
  7. Manter estrita blindagem Clean Room (zero código ou CSS AGPL).
- **Ações e resultados reais:**
  1. **Branch e PR:**
     - Trabalho mantido na branch `redesign/shadcn-visual-overhaul`.
     - Aberta a PR #19 no GitHub vinculada à Issue #18.
  2. **Auditoria Técnica shadcn/ui:**
     - `components.json` configurado oficialmente em `apps/web/components.json`.
     - Utilitário `cn` oficial em `apps/web/lib/utils.ts` usando `clsx` e `tailwind-merge`.
     - Componentes em `apps/web/components/ui/` utilizando primitivas oficiais do Radix UI: `button.tsx`, `input.tsx`, `textarea.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `table.tsx`, `tabs.tsx`, `badge.tsx`, `separator.tsx`, `scroll-area.tsx`, `tooltip.tsx`.
     - Todos os componentes mapeados em uso real no AppHeader, Sidebar, Kanban, Tabela e Modal.
  3. **Refinamento de UI/UX e Acessibilidade:**
     - Tipografia e contraste: tokens textuais elevados para `#EDEDED` (texto principal) e `#9EA1A8` (texto secundário), com rótulos em `#8C8F96`.
     - `apps/web/components/sidebar.tsx`: implementadas visões ativas funcionais com indicador visual e marcadores `Breve` nos módulos futuros.
     - `apps/web/components/task-modal.tsx`: adicionado `DialogDescription` acessível, campos refinados com rótulos legíveis, separador shadcn e botões padronizados.
     - Next.js 16 Partial Prerendering & URL Sync: `apps/web/components/task-app.tsx` isolado e envelopado com `<Suspense>` em `apps/web/app/page.tsx`, eliminando qualquer hydration mismatch e removendo completamente o overlay `1 Issue` do Next.js.
  4. **Capturas de Tela Reais com Chrome Headless:**
     - `screenshots/desktop-kanban.png` (Desktop 1366x768 — Kanban sóbrio e contrastado)
     - `screenshots/desktop-table.png` (Desktop 1366x768 — Tabela agrupada por status com edição inline)
     - `screenshots/desktop-modal.png` (Desktop 1366x768 — Modal de detalhes aberto com Radix Dialog)
     - `screenshots/mobile.png` (Mobile 390x844 — Visão responsiva em 390px)
  5. **Validações Técnicas 100% Aprovadas:**
     - `bun install --frozen-lockfile`: 469 pacotes verificados, lockfile preservado.
     - `bun run typecheck`: 8 pacotes verificados com 100% de sucesso.
     - `bun run lint`: 0 erros, 0 avisos.
     - `bun run build`: Next.js 16.4.0 (Turbopack) compilado em produção com sucesso.
- **Pendências:**
  - Avaliação final de Will e do Tech Lead na PR #19 e Issue #18 (mantida em `Em Revisão`).

## 2026-10-15 (Sessão 10) — Correções Técnicas da Revisão da PR #19 pelo Tech Lead (refs #18 / PR #19)

- **Objetivo:** Implementar as 4 correções objetivas solicitadas pelo Tech Lead (ChatGPT) no comentário da PR #19:
  1. Hidratação real e remoção de `suppressHydrationWarning` em `apps/web/app/layout.tsx`.
  2. IDs estáveis (`crypto.randomUUID()`) e contador sequencial unívoco de códigos (`PLAN-XXX`) centralizados em `TaskApp`.
  3. Acessibilidade por teclado (semântica ARIA, botões nativos, Enter/Space) e confirmação contra exclusão acidental no Kanban e Tabela.
  4. Padronização de tokens semânticos no `globals.css` (`@theme inline`), substituindo valores hexadecimais dispersos sem alterar o redesign aprovado.
- **Ações e resultados reais:**
  1. **Hidratação e SSR Comprovados:**
     - Removido `suppressHydrationWarning` de `<body>` e `<html>` em `apps/web/app/layout.tsx`.
     - Validado com Chromium headless sem extensões (`--disable-extensions`).
     - A rota raiz e todas as variações (`/?view=kanban`, `/?view=table`, `/?modal=PLAN-102`) compilaram e renderizaram com status 200 OK sem disparar avisos de mismatch de hidratação ou flags de runtime data.
  2. **IDs e Códigos Centralizados e Unívocos:**
     - Centralizada a geração em `TaskApp`: `generateTaskId()` utiliza `crypto.randomUUID()` quando disponível, e `generateTaskCode()` mantém um `nextCodeNumberRef` monotonicamente crescente inicializado acima do maior código existente (`PLAN-106`, `PLAN-107`, ...).
     - `TaskTable` e `TaskModal` não geram mais códigos locais nem usam `Math.random()`, evitando qualquer colisão após ciclos de criar/excluir/recriar.
  3. **Acessibilidade e Prevenção de Perda de Dados:**
     - `KanbanCard`: transformado em controle acessível via teclado (`role="button"`, `tabIndex={0}`, `onKeyDown` para Enter/Space, e `focus-visible:ring-1`). Ações ocultas agora exibem foco via `group-focus-within`.
     - Botão de exclusão no Kanban exige confirmação explícita (`window.confirm`) antes da remoção, alinhado ao comportamento do Modal.
     - `TaskTable`: cabeçalho de grupo transformado em `<button>` semântico com `aria-expanded`; títulos editáveis convertidos em botões acessíveis que ativam edição ao teclar Enter/Space; botão de exclusão protegido por confirmação.
  4. **Padronização de Tokens Semânticos:**
     - Expandido `@theme inline` em `apps/web/app/globals.css` com classes utilitárias semânticas: `bg-surface-hover`, `bg-surface-active`, `bg-surface-subtle`, `border-border-subtle`, `border-border-hover`, `text-text-label`, `text-text-icon`.
     - Aplicadas classes semânticas em `AppHeader`, `Sidebar`, `KanbanCard`, `KanbanColumn`, `TaskTable` e `TaskModal`.
  5. **Validações e Testes Locais:**
     - `bun install --frozen-lockfile`: 469 pacotes verificados, sem alterações.
     - `bun run typecheck`: 8 pacotes verificados com 100% de sucesso.
     - `bun run lint`: 0 erros, 0 avisos.
     - `bun run build`: compilação Turbopack de produção concluída com 100% de sucesso.
     - Screenshots recapturados e validados em `screenshots/` (Desktop Kanban, Desktop Tabela, Desktop Modal, Mobile).
- **Pendências:**
  - Nova revisão do Tech Lead e avaliação visual de Will. PR #19 e Issue #18 mantidas abertas em `Em Revisão`.

## 2026-10-16 (Sessão 11) — Limpeza de Branches, Fluxo Main-Only e Paridade do Kanban It's a Plan (refs #20)

- **Objetivo:**
  1. Executar a limpeza definitiva das 9 branches remotas legadas, preservando o histórico de commits exclusivos em tags `backup/branch-*` e consolidando o fluxo estritamente `main-only` determinado por Will e Tech Lead.
  2. Implementar a paridade comportamental do Kanban inspirado na referência visual do It's a Plan (`docs/ITSAPLAN_REFERENCE.md` e Issue #20), adicionando colunas colapsáveis em trilhos verticais, ação de ocultar/restaurar colunas, metas de estimativa e contadores de subtarefas nos cartões, além de checklist interativo e comentários locais no modal de detalhes.
- **Ações e resultados reais:**
  1. **Limpeza Segura de Branches e Transição Main-Only:**
     - Criadas 9 tags de backup para preservação de histórico antes de qualquer exclusão:
       `backup/branch-archive-plano-time-dev-solo`, `backup/branch-chore-audit-dev-solo`, `backup/branch-docs-ai-shared-context`, `backup/branch-docs-dev-offline-simplify`, `backup/branch-docs-muse-offline`, `backup/branch-docs-project-planw-config`, `backup/branch-docs-sprint-0-planw-lite`, `backup/branch-fix-sec-drizzle-orm`, `backup/branch-redesign-shadcn-visual-overhaul`.
     - Todas as 9 tags foram enviadas e confirmadas no GitHub remoto (`git push origin tag ...`).
     - Todas as 9 branches remotas foram deletadas com segurança (`git push origin --delete ...`).
     - Branches locais obsoletas eliminadas via `git branch -D` e `git fetch --prune`.
     - `git branch -a` confirmou estritamente `main` e `remotes/origin/main` ativos.
  2. **Matriz de Referência Atualizada (`docs/ITSAPLAN_REFERENCE.md`):**
     - Registrada observação detalhada dos componentes do Kanban: header de coluna com `< >` (collapse em trilho), olho riscado (hide column), `+` (quick add), estimativas com ícone de cronômetro, checklist com contadores `x/y`, e widget de colunas ocultas no topo do quadro.
  3. **Implementação da Paridade do Kanban (Frontend-Only, React 19, Tailwind CSS v4, shadcn):**
     - `apps/web/types/task.ts`: adicionadas interfaces `Subtask`, `TaskComment`, campo `estimate?: string`, `subtasks?: Subtask[]`, `comments?: TaskComment[]` e `updatedAt?: string`.
     - `apps/web/lib/initial-data.ts`: tarefas de demonstração enriquecidas com estimativas (`2d`, `1d`, `3d`, `4h`), subtarefas e comentários locais realistas da Sprint 0.
     - `apps/web/components/task-kanban/kanban-card.tsx`:
       - Adicionado badge de estimativa com ícone de timer.
       - Adicionado contador dinâmico de subtarefas (`completed/total`) com ícone de checklist.
       - Marcador bullet colorido na tag de categoria.
     - `apps/web/components/task-kanban/kanban-column.tsx`:
       - Implementado modo colapsado em trilho vertical estilizado (`[writing-mode:vertical-lr]`, largura 40px, rótulo vertical, botões de expandir e adição rápida). Suporta drag & drop diretamente sobre o trilho colapsado.
       - Implementado botão para ocultar coluna (`EyeOff`).
     - `apps/web/components/task-kanban/task-kanban.tsx`:
       - Estado local de `collapsedColumns` e `hiddenColumns`.
       - Widget de `Colunas Ocultas` no topo do quadro permitindo restaurar individualmente qualquer coluna com um clique no botão `Eye`.
     - `apps/web/components/task-modal.tsx`:
       - Adicionado campo de estimativa de tempo.
       - Seção interativa de **Checklist & Subtarefas**: alternância de status concluído/pendente com risco visual, inclusão rápida de nova subtarefa via Enter, exclusão de item e contador de progresso.
       - Seção de **Atividade & Comentários**: timeline de comentários com autor, avatar simulado e carimbo de data/hora, além de input para novos comentários demonstrativos locais.
  4. **Validações e Testes Locais 100% Aprovados:**
     - `bun run typecheck`: 8 pacotes validados com 100% de sucesso.
     - `bun run lint`: 0 erros de ESLint.
     - `bun run build`: compilação Turbopack de produção concluída com sucesso em 38.3s.
- **Pendências:**
  - Avaliação visual de Will e Tech Lead sobre a paridade do Kanban (Issue #20).

## 2026-10-16 (Sessão 8) — Refinamento Visual de Alta Fidelidade (It's a Plan): Cabeçalho Único, Superfícies Dark e Paleta da Sidebar (refs #20)

- **Objetivo:** Implementar refinamento estético e funcional solicitado por Will com base nas capturas reais de referência:
  1. Unificar barras superiores em um **único cabeçalho horizontal** (eliminando empilhamento de toolbars).
  2. Ajustar contraste, profundidade e superfícies pretas/foscas (sem azul neon/AI slop, cartões destacados por tonalidade suave e bordas sutis).
  3. Reduzir tipografia e cabeçalhos da barra lateral (`VISÕES ATIVAS`, `MÓDULOS FUTUROS`) para estilo minimalista uppercase tracking.
  4. Implementar seletor interativo de cores para a sidebar no rodapé com swatches rápidos, color picker hexadecimal, switch de contraste de texto (Dark/Light) e persistência em `localStorage`.
- **Ações e resultados reais:**
  1. **Cabeçalho Único (`apps/web/components/app-header.tsx`):**
     - Integradas abas de visualização (`Quadro`, `Tabela`, `+ Nova visualização`) alinhadas à esquerda em 44px de altura.
     - Controles alinhados à direita: busca rápida com ícone, menu popover de filtros (`Filtro`), menu de exibição (`Exibição`), badge numérico de tarefas ativas e botão de destaque `+ Nova Tarefa`.
     - Removida a barra secundária empilhada, ampliando a área útil vertical.
  2. **Contraste Dark e Superfícies Foscas:**
     - `apps/web/app/globals.css`: background do canvas ajustado para preto profundo `#08090a`, cartões `#151619` sobre colunas `#0e0f12`, com bordas refinadas `#1d1e22`.
     - `apps/web/components/task-kanban/kanban-column.tsx` e `task-kanban.tsx`: padronização de tons escuros foscos e eliminação total de acentos azuis saturados / gradientes artificiais.
  3. **Tipografia da Sidebar (`apps/web/components/sidebar.tsx`):**
     - Rótulos de seção reduzidos para `text-[9.5px] font-medium tracking-[0.14em] uppercase text-[#52545A]`.
  4. **Customização de Cores da Sidebar (Anexo 3):**
     - Ícone discreto `Palette` inserido no rodapé ao lado de `DEV OFFLINE`.
     - Popover elegante flutuando à direita da sidebar com swatches pré-configurados (`#0d0e10`, `#08090a`, `#121316`, `#16171b`, `#0d131a`, `#161118`, `#f4f4f5`), picker nativo e input HEX manual.
     - Controle de contraste de textos (`Dark`: texto claro / `Light`: texto escuro) aplicado exclusivamente à barra lateral.
     - Persistência reativa no `localStorage` (`planw_sidebar_bg`, `planw_sidebar_mode`) e botão de restauração padrão.
  5. **Evidências e Testes:**
     - Capturas atualizadas em `screenshots/desktop-kanban.png`, `screenshots/desktop-palette.png`, `screenshots/desktop-table.png` e `screenshots/mobile.png`.
     - `bun run typecheck`: 8 pacotes com 0 erros.
     - `bun run lint`: 0 erros, 0 avisos.
     - `bun run build`: compilação Turbopack de produção concluída em 15.0s.
- **Pendências:**
  - Avaliação de Will sobre o novo visual refinado.

## 2026-10-16 (Sessão 9) — Sistema Avançado de Temas daisyUI × shadcn/ui e Theme Studio (refs #20)

- **Objetivo:** Evoluir a customização de aparência para um sistema completo de temas visuais inspirado no daisyUI, porém 100% construído sobre a arquitetura de variáveis CSS e tokens semânticos do shadcn/ui:
  1. Catálogo completo de 12 temas Dark Mode e 12 temas Light Mode com paletas profissionais e contraste WCAG.
  2. Gerenciador de aparência em dois níveis: Modo (Dark, Light, Automático) + Tema por modo com memória persistente.
  3. Novo seletor de temas visual estilo daisyUI com micro-interface de preview (sidebar, canvas, card e acento) e 4-dot swatches.
  4. Theme Studio (`/theme-studio` e view in-app): página para criar, editar, duplicar, testar, exportar e importar temas com preview isolado em tempo real e testes de contraste WCAG.
  5. Adequação de componentes existentes aos tokens semânticos (`bg-card`, `bg-background`, `border-border`, etc.) sem quebras visuais.
- **Ações e resultados reais:**
  1. **Tipos e Utilidades (`apps/web/types/theme.ts` e `apps/web/lib/themes/theme-utils.ts`):**
     - Estrutura tipada para `ThemeTokens`, `ThemeDefinition` e `ThemeContextValue`.
     - Utilitários para conversão HEX/RGB, cálculo matemático de luminância e contraste WCAG 2.1 (AA/AAA), injeção de CSS custom properties em `:root` e validação estrita de JSON.
  2. **Catálogos Predefinidos:**
     - `presets-dark.ts`: 12 temas Dark completos (All Black, Matrix Green, Cyberpunk Yellow, Cookie Brown, Purple, IBM Blue, Red Hat, Dracula, Synthwave, Forest, Midnight Ocean, Graphite).
     - `presets-light.ts`: 12 temas Light completos (Clean White, Paper, Latte, Lavender, Ice Blue, Mint, Peach, Sand, Corporate, Sakura, Lemon, Nordic).
  3. **Contexto & Provider (`theme-context.tsx`):**
     - Controle reativo de `appearanceMode`, `resolvedMode`, `darkThemeId`, `lightThemeId` e `customThemes`.
     - Injeção imediata de tokens e controle da classe `.dark`.
     - Script inline anti-flash adicionado ao `<head>` em `layout.tsx`.
  4. **Novo Seletor de Temas (`theme-selector.tsx`):**
     - Controle segmentado Escuro / Claro / Auto.
     - Grade/lista de temas com micro-preview de interface, nome, 4 dots de cores e checkmark ativo.
     - Abas Catálogo (24) e Meus Temas, botões de restauração e atalho para o Theme Studio.
     - Suporte a alinhamento contextual (`sidebar-footer` e `right` para o cabeçalho).
  5. **Theme Studio (`theme-studio.tsx` e `app/theme-studio/page.tsx`):**
     - Editor de tokens categorizado: Base, Identidade, Superfícies, Sidebar, Gráficos (chart-1 a 5) e Avançado (`--radius`).
     - Seletor nativo de cor + input HEX com preview instantâneo e cálculo de contraste WCAG.
     - Área de preview isolada em tempo real com Mini Dashboard e catálogo de componentes shadcn/ui.
     - Ações de duplicar, salvar em Meus Temas, aplicar globalmente, excluir próprios, exportar JSON e importar JSON validado.
  6. **Validações e Testes:**
     - `bun run typecheck`: 8 pacotes validados com 100% de sucesso (0 erros).
     - `bun run lint`: 0 erros, 0 avisos.
     - `bun run build`: compilação Turbopack concluída com sucesso em 13.3s.
     - Capturas geradas: `screenshots/theme-selector-popover.png`, `screenshots/theme-studio.png`, `screenshots/desktop-kanban.png`.
- **Pendências:**
  - Avaliação de Will sobre a experiência daisyUI × shadcn/ui.

## 2026-10-16 (Sessão 10) — Simplificação de Temas (1-Clique Direto) e Enforçamento MAIN-ONLY (refs #20)

- **Decisão de Will:** Eliminar o Theme Studio e o criador de temas personalizados para manter o produto minimalista, rápido e enxuto. Preservar exclusivamente o catálogo de 24 temas profissionais prontos (12 Dark + 12 Light) com troca instantânea de 1 clique, e assegurar fluxo Git 100% `main`-only sem branches ou PRs soltas.
- **Ações e resultados reais:**
  1. **Remoção do Theme Studio:**
     - Excluídos: `apps/web/app/theme-studio/page.tsx` e `apps/web/components/theme-studio/theme-studio.tsx`.
     - Removidos botões e rotas do Theme Studio no `sidebar.tsx` e `app-header.tsx`.
     - Revertido `ViewMode` em `apps/web/types/task.ts` para `"table" | "kanban"`.
  2. **Seletor de Temas 1-Clique Otimizado (`theme-selector.tsx`):**
     - Removidas abas de "Meus Temas", editor e importação/exportação JSON.
     - Interface limpa com: Modo de Aparência (Escuro / Claro / Auto), Filtro rápido (Todos / Dark / Light) e lista de 24 paletas com mini-interface de preview e 4-dots swatches.
     - Botão de restauração rápida para o padrão oficial *All Black*.
  3. **Contexto Enxuto (`theme-context.tsx` & `theme-utils.ts`):**
     - Removidas rotinas de persistência e validação de temas customizados.
     - Contexto e hooks focados exclusivamente em alternância de modo, seleção de ID do tema e injeção de CSS vars.
  4. **Auditoria Git (MAIN ONLY):**
     - Verificado: 0 PRs abertas (`gh pr list --state open` vazio).
     - Branches ativas: exclusivamente `main` e `remotes/origin/main`.
     - Alterações comitadas e enviadas diretamente para `origin/main` (commit `af9aa83`).
  5. **Validações e Testes:**
     - `bun run typecheck`: 8 pacotes validados com 0 erros.
     - `bun run lint`: 0 erros, 0 avisos.
     - `bun run build`: compilação Turbopack de produção concluída com 100% de sucesso.
     - Servidor web ativo em `http://localhost:3000`.

## 2026-10-16 (Sessão 11) — Seletor de Temas em 3 Etapas por Cores e Entrada Única na Sidebar (refs #20)

- **Decisão e Especificação de Will:**
  1. Manter EXATAMENTE os 24 temas existentes (12 Dark + 12 Light), sem inventar paletas novas.
  2. Entrada Única: o seletor fica EXCLUSIVAMENTE no canto inferior esquerdo da sidebar (removido do `app-header.tsx`).
  3. Sem Auto/Sistema, sem filtro Todos, sem Theme Studio e sem backend.
  4. Fluxo guiado em 3 etapas:
     - Etapa 1: "Qual aparência você prefere?" -> Escuro (Dark) ou Claro (White).
     - Etapa 2: "Qual cor principal do tema?" -> Bolinhas de cor (Preto, Branco, Vermelho, Rosa, Verde, Azul, Amarelo, Roxo, Marrom, Cinza) + "Cor secundária (opcional)" com pares válidos ou "Sem preferência".
     - Etapa 3: "Temas compatíveis" -> Cartões compactos com preview e aplicação instantânea em 1-clique.
     - Navegação: botões "Trocar modo" e "Alterar cores" para transição fluida entre etapas.
  5. Estrutura de dados preparada para futuras adições via metadados `primaryColorFamily` e `secondaryColorFamilies`.
- **Ações e resultados reais:**
  1. Criada taxonomia em `apps/web/types/theme.ts` e `apps/web/lib/themes/color-families.ts` (`ColorFamily`, `COLOR_FAMILIES`, `ORDERED_COLOR_FAMILIES`).
  2. Classificados todos os 24 presets em `presets-dark.ts` e `presets-light.ts` com suas famílias de cor reais.
  3. Reconstruído `apps/web/components/theme/theme-selector.tsx` com o wizard em 3 etapas, botões semânticos acessíveis e navegação por teclado.
  4. Removida a duplicata do seletor do `app-header.tsx`.
  5. Simplificado `layout.tsx` e `theme-context.tsx` para operar estritamente em modo binário dark/light.
  6. Validações 100% aprovadas: `typecheck` (8 pacotes ok), `lint` (0 erros) e `build` Turbopack concluído com sucesso.

## 2026-10-16 (Sessão 12) — Validação Visual e Técnica do Seletor de Aparência do Figma (refs #20)

- **Objetivo:** Sincronizar a branch `main` com as implementações do ChatGPT no GitHub, validar `bun install`, `lint`, `typecheck` e `build`, capturar screenshots reais em `localhost:3000` cobrindo todos os cenários solicitados por Will e confrontar com o protótipo do Figma sem efetuar redesign.
- **Ações e resultados reais:**
  1. **Sincronização:** `git pull --ff-only origin main` integrou commits `c388183`, `77e32f6` e `611191e`.
  2. **Validação Técnica Monorepo:**
     - `bun install --frozen-lockfile`: 469 pacotes verificados, lockfile preservado (0 erros).
     - `bun run lint`: ESLint em `apps/web` com 0 erros e 0 avisos.
     - `bun run typecheck`: 8 pacotes verificados com 0 erros.
     - `bun run build`: compilação Turbopack de produção concluída com 100% de sucesso.
  3. **Inspeção Visual e Screenshots Reais (`http://localhost:3000`):**
     - `screenshots/appearance/01-cyberpunk-yellow-full.png` e `01-cyberpunk-yellow-dialog.png`: tema Cyberpunk Yellow ativo com Amarelo (primária) e Preto (secundária).
     - `screenshots/appearance/02-sidebar-header-colorido-full.png` e `02-sidebar-header-colorido-dialog.png`: toggle "Sidebar + Header colorido" ativado com injeção de `#ffd426` e portal sem contaminação.
     - `screenshots/appearance/03-busca-nome-cyberpunk-dialog.png`, `03-busca-nome-matrix-dialog.png` e `03-busca-cor-verde-dialog.png`: busca instantânea por nome e família de cor.
     - `screenshots/appearance/04-modo-claro-full.png` e `04-modo-claro-dialog.png`: modo claro ativo (Clean White) e busca em modo claro (`Peach`/`Sakura`).
     - `screenshots/appearance/05-modo-escuro-dialog.png` e `05-paleta-cores-popup-dialog.png`: modo escuro e grade popover de seleção de famílias de cores.

## 2026-10-16 (Sessão 13) — Padronização Completa do Frontend (Lei nº 1: Reutilização e Design System Único) (refs #20)

- **Objetivo:** Refatoração técnica de todo o frontend em `apps/web/` para cumprir rigorosamente a Lei nº 1 do @planw (shadcn/ui → Radix → Tailwind CSS 4 → Tokens Semânticos → Componentes Reutilizáveis), sem alterar a interface aprovada por Will (zero redesign).
- **Ações e resultados reais:**
  1. **Etapa A (Auditoria de Duplicações e Baselines):** Capturadas screenshots de referência do Kanban, Tabela, Modal e Seletor de Aparência em `screenshots/baseline/`. Identificados hexadecimais hardcoded e catálogos paralelos.
  2. **Etapa B (Consolidação de Catálogos):** Unificado o catálogo de cores e famílias em `apps/web/lib/themes/theme-catalog.ts` como fonte canônica única. `color-families.ts` convertido em adaptador retrocompatível. Tipos harmonizados em `types/theme.ts`. Commit: `737600c`.
  3. **Etapa C (Padronização de Primitivas e globals.css):**
     - Removidos todos os hexadecimais hardcoded de `badge.tsx`, `button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `table.tsx`, `tabs.tsx`, `tooltip.tsx`, `scroll-area.tsx` e `separator.tsx`. Substituídos por tokens semânticos (`border-border`, `bg-popover`, `text-popover-foreground`, `bg-muted`, etc.).
     - Adicionadas primitivas oficiais do shadcn/ui: `popover.tsx` e `switch.tsx`.
     - Atualizado `globals.css` com tokens dinâmicos de superfície (`--surface-hover`, `--surface-active`, `--surface-subtle`, `--border-subtle`, `--border-hover`, `--text-label`, `--text-icon`) para suportar perfeitamente alternância claro/escuro. Commit: `527b814`.
  4. **Etapa D (Refatoração do Seletor de Aparência):** Adotado `Switch` oficial do shadcn/Radix para o toggle de sidebar/header colorido, preservando 100% das dimensões (354×240), pílula com conic-gradient, busca inline e miniaturas aprovadas no Figma. Commit: `7155abb`.
  5. **Etapa E (Padronização de Kanban, Tabela e Indicadores):** Substituídos hexadecimais nos ícones de prioridade (`task-priority-icon.tsx`), status (`task-status-icon.tsx`) e tags/avatares (`kanban-card.tsx`) por classes semânticas Tailwind nativas. Commit: `96f3ab9`.
  6. **Etapa F (Validação Visual e Build):**
     - Capturadas screenshots pós-refatoração em `screenshots/refactored/` cobrindo Kanban, Tabela, Modal de tarefas, Modo Claro, Modo Escuro, Seletor com pílula livre gradiente, popover de cores e busca.
     - Validação visual comprovou paridade absoluta (zero regressão visual) e ganho substantivo de contraste e consistência em modo claro.
     - Executados `bun run lint` (0 erros), `bun run typecheck` (8 pacotes ok) e `bun run build` (Turbopack concluído com 100% de sucesso).

## 2026-10-17 (Sessão 14) — Validação da Arquitetura Extensível para 100+ Temas (refs #21)

- **Objetivo:** Sincronizar os commits `8015377`, `06a69de` e `68dd5d3` do ChatGPT da Issue #21 na `main`, corrigir o script `test:themes` no root `package.json`, executar testes automatizados e validar no navegador em `localhost:3000` sem alteração de layout.
- **Ações e resultados reais:**
  1. **Sincronização:** `git pull --ff-only origin main` integrou a migração dos metadados para `ThemeDefinition`, testes com 120 fixtures e proteção de modo.
  2. **Correção Técnica:** No `package.json` raiz, ajustado o comando de `test:themes` para `bun run --cwd apps/web test:themes` (commit `3065cf3`), permitindo execução direta na raiz.
  3. **Validação Técnica Monorepo:**
     - `bun install --frozen-lockfile`: 471 instalações checadas, 0 alterações.
     - `bun run test:themes`: 24 temas oficiais e 120 fixtures validadas com sucesso (IDs, famílias, tokens e busca).
     - `bun run lint`: ESLint com 0 erros e 0 avisos.
     - `bun run typecheck`: 8 pacotes verificados com 0 erros.
     - `turbo build`: compilação Turbopack de produção concluída em 28.3s.
  4. **Validação Visual no Navegador (`localhost:3000`):**
     - Capturadas 8 screenshots em `screenshots/issue-21/` (Kanban, Tabela, Modal, Seletor Dark, Popover de cores, Sidebar/Header colorido, Busca e Modo Claro).
     - Layout 100% idêntico ao protótipo aprovado por Will, com pílula de gradiente Livre, Switch shadcn e zero contaminação de estilos.
  5. **Registro:** Comentário completo com resultados reais postado diretamente na [Issue #21](https://github.com/victorwilliames/planw/issues/21#issuecomment-6233553527).

## 2026-10-17 (Sessão 15) — Auditoria e Configuração Bun-Only no @planw

- **Objetivo:** Auditar o uso de Node.js vs Bun no notebook e repositório, garantindo conformidade com a decisão de Will de adotar Bun como runtime/gerenciador principal, sem quebrar ferramentas externas de IA (Argon/OpenCode e MCPs) e isolando o PlanW como estritamente Bun-only.
- **Ações e resultados reais:**
  1. **Auditoria Técnica Local:**
     - Identificado Node.js `v24.15.0` no Windows e Bun `1.4.3`.
     - Identificado que o Node.js é requerido pelo ecossistema do notebook (`opencode.cmd` para a skill `argon` via Vertex AI e servidores MCP `figma-developer-mcp` e `mcpvault`), mas **desnecessário** para o PlanW.
     - Relatório completo gerado e salvo em artifact de auditoria.
  2. **Configuração Bun-Only no PlanW:**
     - Criado `bunfig.toml` na raiz com `[run] bun = true`, instruindo o Bun a interceptar scripts e executáveis sem invocar o Node.js do sistema.
     - Comprovado mecanismo de isolamento do Bun no Windows: executa scripts com seu shim emulado (`bun-node-.../node.exe`, hard link de `bun.exe`), contornando completamente o Node do sistema.
  3. **Alinhamento de Versões:**
     - Alinhado `packageManager` de `bun@1.4.2` para `bun@1.4.3` no `package.json` raiz e em `apps/web/package.json`, em paridade exata com a versão instalada no ambiente local.
     - `bun install --frozen-lockfile` validado em 500ms com zero alterações no lockfile.
  4. **Validação do Dev Server e Hot Reload:**
     - `bun run dev:web`: subiu Next.js 16.4.0 (Turbopack) em 3.0s, respondendo `HTTP 200`.
     - Teste real de Hot Reload: modificação em componente detectada instantaneamente e recompilada pelo Turbopack em 250ms e 242ms.
  5. **Bateria de Testes Monorepo:**
     - `bun run test:themes`: 24 temas oficiais e 120 fixtures validados com 100% de sucesso.
     - `bun run lint --force`: ESLint executado e aprovado com 0 erros.
     - `bun run typecheck --force`: 8 pacotes verificados com 100% de sucesso (0 erros).
     - `bun run build --force`: compilação de produção Turbopack finalizada com 100% de sucesso.

## 2026-10-17 (Sessão 16) — Migração Hono → Elysia + Bun no @planw/api (refs #22)

- **Objetivo:** Executar a substituição do framework HTTP de Hono para Elysia em `apps/api` conforme autorizado na Issue #22 e especificado pelo ChatGPT, operando estritamente via Bun, sem Node/npm/pnpm, preservando o frontend-only e sem deixar serviços em background.
- **Ações e resultados reais:**
  1. **Remoção de Hono e Instalação de Elysia:**
     - Executado `bun remove hono --cwd apps/api` (lockfile atualizado pelo Bun).
     - Executado `bun add elysia --cwd apps/api` (instalado `elysia@1.4.30` e dependências resolvidas no `bun.lock`).
  2. **Scaffold Mínimo de `apps/api`:**
     - Reescrito `apps/api/src/index.ts` usando `Elysia`, expondo `GET /health` na porta 4000 com retorno `{ ok: true, service: "planw-api" }` e tipagem `export type App = typeof app`.
     - Preservada independência frontend-only: a API não é executada no fluxo normal `dev:web` e não há conexão com banco, auth ou regras de negócio.
  3. **Smoke Test Isolado:**
     - Executado `bun apps/api/src/index.ts` temporariamente; porta 4000 respondeu `HTTP 200` com `{"ok":true,"service":"planw-api"}` via `Invoke-RestMethod`.
     - Processo encerrado imediatamente após o teste, garantindo porta fechada e ausência de processos em background.
  4. **Validações Monorepo:**
     - `bun install --frozen-lockfile`: 485 instalações em 643 pacotes (zero alterações, 1.38s).
     - `bun run test:themes`: 24 temas e 120 fixtures 100% aprovados.
     - `bun run lint`: ESLint com 0 erros e 0 avisos.
     - `bun run typecheck`: 8 pacotes verificados com 100% de sucesso (0 erros).
     - `bun run build`: build Turbopack do Next.js gerado com 100% de sucesso.

## 2026-10-17 (Sessão 17) — Ajustes Finais e Blindagem Operacional (refs #22)

- **Objetivo:** Atender às duas pendências da revisão técnica do ChatGPT: (1) ajustar o script `dev` raiz para executar exclusivamente a web Next.js (`turbo dev --filter=web`), mantendo a API Elysia e o worker 100% inativos por padrão, com `dev:api` disponível para teste isolado; (2) atualizar `docs/PLAN.md` e `AGENTS.md` com a decisão arquitetural vigente (Bun-only e Elysia).
- **Ações e resultados reais:**
  1. **Ajuste de Scripts no `package.json` Raiz:**
     - `"dev": "turbo dev --filter=web"` (inicia exclusivamente o frontend web na porta 3000).
     - `"dev:web": "turbo dev --filter=web"` (preservado como alias).
     - `"dev:api": "bun run --cwd apps/api dev"` (permite inicialização explícita e isolada para testes quando desejado).
  2. **Atualização Documental:**
     - `docs/PLAN.md`: scaffold atualizado de Hono para Elysia + Bun (inativo por padrão).
     - `AGENTS.md`: adicionada seção *Runtime e arquitetura vigentes* consagrando Bun como runtime/gerenciador oficial, Elysia como framework da API (scaffold inativo) e frontend-only estrito.
  3. **Validação Operacional e de Regressão:**
     - Teste de `bun run dev`: validado que sobe apenas `web` (Next.js 16.4 Turbopack) na porta 3000; nem porta 4000 (API) nem worker foram iniciados.
     - Teste de `bun run dev:web`: confirmado comportamento idêntico.
     - `bun install --frozen-lockfile`: 485 instalações em 643 pacotes validadas (0 alterações).
     - `bun run test:themes`: 24 temas oficiais e 120 fixtures 100% aprovados.
     - `bun run lint`: ESLint aprovado com 0 erros.
     - `bun run typecheck`: 8 pacotes monorepo validados com 0 erros.
     - `bun run build`: compilação Turbopack de produção concluída com 100% de sucesso.





## 2026-10-17 (Sessão 18) — Subentrega 1 do Kanban: Ações de Tarefa sem Perda Silenciosa e Descarte Seguro (refs #20)

- **Objetivo:** Executar a primeira iteração da Issue #20 autorizada pelo ChatGPT (comment #6235258477):
  1. Reproduzir em navegador e capturar baseline visual do bug de perda silenciosa de comentários e subtarefas/checklists ao fechar o modal.
  2. Atualizar reativamente as ações imediatas (concluir/desmarcar checklist, adicionar/remover subtarefas e adicionar comentários) no estado central do `TaskApp`, refletindo nos cartões/contadores e sobrevivendo ao fechamento e reabertura do modal em sessão.
  3. Proteger campos de formulário não salvos com contrato explícito Salvar/Cancelar e banner de confirmação de descarte acessível, interceptando fechamento por botão 'X', tecla Escape, backdrop e botão Cancelar.
  4. Garantir UX honesta de comentários ("Demonstração local — não enviados a servidor").
  5. Manter estrita sincronização bidirecional entre Kanban e Tabela.
- **Ações e resultados reais:**
  1. **Reprodução e Baseline:**
     - Confirmado em `localhost:3000` que ações em `TaskModal` eram descartadas ao fechar via 'X', Escape ou backdrop se o usuário não clicasse em "Salvar Alterações".
     - Capturas de baseline registradas em `screenshots/issue-20/baseline/`:
       `01-desktop-kanban-baseline.png`, `02-desktop-modal-baseline.png`, `02b-desktop-modal-with-action.png`, `02c-desktop-modal-reopened-lost.png`, `03-mobile-kanban-baseline.png`, `04-mobile-modal-baseline.png`.
  2. **Arquitetura e Implementação:**
     - `apps/web/components/task-app.tsx`: `selectedTaskId` armazena ID selecionado e `selectedTask` é derivado reativamente via `useMemo` contra a lista central `tasks`. Adicionadas `handleUpdateTaskSubtasks` e `handleAddTaskComment` com atualização instantânea na coleção central.
     - `apps/web/components/task-modal.tsx`:
       - Checklist e comentários conectados diretamente às props da tarefa existente, com disparo imediato para o estado central.
       - Campos de formulário mantidos em rascunho local; dirty state detectado comparando rascunho contra valores iniciais.
       - Interceptação de fechamento unificada via ref imperativa `contentRef.requestClose()` prevenindo fechamento acidental quando `isDirty === true`.
       - Banner acessível posicionado de forma fixa abaixo do cabeçalho com ações "Descartar edições" e "Continuar editando" (sem `window.confirm` e sem modais em cascata).
       - UX transparente para comentários: badge `Demonstração local — não enviados a servidor`, tag `(local)` nos autores e botão `Adicionar (local)`.
  3. **Validação Automatizada no Navegador (CDP):**
     - 5 casos testados de ponta a ponta com 100% de sucesso (ações instantâneas persistem após fechar/reabrir; banner impede perda de edições não salvas; salvar atualiza Kanban e reflete instantaneamente na Tabela; mobile 390px responsivo; tema Clean White íntegro).
     - Capturas de validação salvas em `screenshots/issue-20/validated/` (`01` a `08`).
  4. **Testes do Monorepo:**
     - `bun install --frozen-lockfile` (485 pacotes verificados, 0 mudanças).
     - `bun run typecheck` (8 pacotes verificados, 0 erros).
     - `bun run lint` (ESLint 0 erros, 0 avisos).
     - `bun run test:themes` (24 temas oficiais e 120 fixtures validadas).
     - `bun run build` (Next.js Turbopack build de produção concluído com sucesso).
  5. **Git e Issue #20:**
     - Commit `a70f5e9` enviado diretamente para `origin/main` (`refs #20`).
     - Relatório detalhado com evidências e testes publicado no comentário https://github.com/victorwilliames/planw/issues/20#issuecomment-6235781188.
     - Issues #20 e #18 mantidas abertas.

## 2026-10-17 (Sessão 10) — Issue #20 (Subentrega 2): Menu de ações rápidas nos cartões e resolução das lacunas da revisão técnica

- **Objetivo:** Executar a Subentrega 2 da Issue #20 aprovada na revisão técnica do Tech Lead (comment #6238811106):
  1. Reproduzir e corrigir as 3 lacunas pontuais identificadas na revisão da Subentrega 1:
     - *Lacuna 1 (isDirty)*: cobrir `status` e `priority` em nova tarefa contra defaults e textos pendentes não submetidos em `newSubtaskTitle` e `newCommentText`.
     - *Lacuna 2 (Banner com scroll)*: garantir que o banner de descarte fique imediatamente visível e focado mesmo quando o modal estiver rolado até o rodapé (mobile/desktop).
     - *Lacuna 3 (Preservação de ações ao salvar)*: refatorar `handleSaveFromModal` para patch funcional por ID, preservando estritamente `subtasks` e `comments` já comitados no estado central.
  2. Implementar a primeira versão compacta e acessível do **Menu de Ações Rápidas nos cartões Kanban** (`KanbanCard`):
     - Substituir o botão isolado de lixeira pelo trigger `...` (`MoreHorizontal`) com `DropdownMenu` do shadcn/Radix.
     - Ações disponíveis: **Abrir detalhes**, **Alterar status / mover coluna** (com submenu e checkmark), **Alterar prioridade** (com submenu e checkmark) e **Excluir tarefa com confirmação**.
     - Evitar conflito de clique entre o menu e o card (`e.stopPropagation()` em `pointerdown` e `click`).
     - Acessibilidade: botão sempre visível no mobile e no hover/focus no desktop; navegação completa por teclado.
  3. Validar no navegador com testes CDP automatizados em desktop, mobile, temas e monorepo.
- **Ações e resultados reais:**
  1. **Reprodução e Correção das 3 Lacunas:**
     - Script `scratch/reproduce-gaps.mjs` automatizou a reprodução no Edge CDP.
     - *Lacuna 1*: `isDirty` em `task-modal.tsx` expandido para verificar `status !== initialStatus`, `priority !== "Média"`, `newSubtaskTitle.trim()` e `newCommentText.trim()`. Testes 1A e 1B passaram 100%.
     - *Lacuna 2*: Banner tornado `sticky top-0 z-20 bg-card/95 backdrop-blur-md shadow-sm` com scroll automático do container para o topo no acionamento do descarte. Teste 2 comprovou `isVisibleInDialog: true` mesmo com `dialogScrollTop: 365`.
     - *Lacuna 3*: `handleSaveFromModal` em `task-app.tsx` refatorado para patch funcional de propriedades, preservando `t.subtasks` e `t.comments`. Teste 3 comprovou persistência de comentários e checklist com 100% de integridade.
  2. **Menu de Ações Rápidas no `KanbanCard`:**
     - `apps/web/components/task-kanban/kanban-card.tsx`:
       - `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuSeparator` integrados.
       - Ações rápidas 100% conectadas ao estado central `onUpdateTask` e `onDeleteTask`.
       - Prevenção de propagação de clique e pointerdown para não disparar abertura de detalhes do cartão.
       - Acessibilidade mobile: botão `MoreHorizontal` visível nativamente no mobile (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`).
     - `apps/web/components/task-kanban/kanban-column.tsx`:
       - Adicionado `data-column-status={status}` para clareza semântica e suporte a testes automatizados.
  3. **Validação Automatizada no Navegador (CDP):**
     - Script `scratch/validate-subentrega-2.mjs` validou 8 passos de ponta a ponta:
       - *Passo 1*: Menu aberto no card sem disparar modal de detalhes (`modalOpen: false`).
       - *Passo 2*: Submenu de status aberto e alteração para "Concluído" refletida imediatamente no Kanban.
       - *Passo 3*: Sincronização em tempo real com a Tabela (PLAN-103 exibido sob grupo "Concluído").
       - *Passo 4*: Submenu de prioridade aberto e alteração para "Urgente" comitada com sucesso.
       - *Passo 5*: Opção "Abrir detalhes" no menu abriu o modal com os dados corretos da tarefa.
       - *Passo 6*: Viewport mobile (390×844) validado com menu funcional e botão de ações visível.
       - *Passo 7*: Tema Clean White (Light) validado com menu e submenus nítidos no design system.
       - *Passo 8*: Exclusão de tarefa com confirmação nativa (`Page.handleJavaScriptDialog`) removendo a tarefa do estado compartilhado e atualizando o contador de exibição de 5 para 4.
     - 9 capturas gravadas em `screenshots/issue-20/subentrega-2/` (`01` a `09`).
  4. **Bateria de Verificação do Monorepo:**
     - `bun install --frozen-lockfile` (485 pacotes verificados, 0 mudanças).
     - `bun run test:themes` (24 temas oficiais e 120 fixtures validadas).
     - `bun run lint` (ESLint 0 erros, 0 avisos).
     - `bun run typecheck` (8 pacotes verificados, 0 erros).
     - `bun run build` (Next.js Turbopack build de produção concluído com sucesso em 36.56s).
  5. **Git e Próximos Passos:**
     - Commits aplicados diretamente na `main` (`refs #20`).
     - Issues #20 e #18 mantidas abertas para avaliação visual de Will.
