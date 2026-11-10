# It's a Plan → @planw — matriz de experiência e fidelidade

**Regra obrigatória:** referência principal = **It's a Plan como PRODUTO INTEIRO**, não apenas uma inspiração estética. Fonte de execução: observar a interface de referência operando, registrar comportamentos e comparar com o @planw. **Não consultar/transcrever código AGPL, CSS, algoritmos, hooks ou assets para implementar.** Consulte [proveniência](provenance/README.md).

**Referências:** [site It's a Plan](https://itsaplan.dev/) · [fork histórico de Will — AGPL, arquivado](https://github.com/victorwilliames/itsaplan-fork) (snapshot observado: `1ce0a058`, 07/10/2026) · [Issue #20](https://github.com/victorwilliames/planw/issues/20). O fork é referência de versão/documentação de capacidades, **não biblioteca de código**. Screenshots reais fornecidos por Will (`itsaplan.dev/board`) e a interface ao vivo são fontes da aparência e dos cliques.

## Estado verificado — 16/10/2026

| Área | Referência efetivamente analisada | Situação no @planw | Próximo ajuste (Issue #20) |
| --- | --- | --- | --- |
| Sidebar / shell | Observada no print real de `itsaplan.dev/board`: Workspace ISAP, Inbox (badge 24), Dashboards, Work items ativo, Initiatives, Notes, AI Team (Chat, Schedules), Configure (Integrations, Agents, Skills, Tools), Configuration (Members, Notifications, Project settings). | Shell compacta matte charcoal (`#131416`) na `main` com visões ativas e módulos futuros marcados com `Breve`. | Manter alinhamento com shadcn e densidade sóbria. |
| Kanban (colunas) | Observado em `itsaplan.dev/board`: colunas com status icon, contador, botão colapsar `< >`, botão ocultar `eye-slash`, botão adicionar `+`. Colunas colapsadas viram trilho vertical (`Todo 2`). Widget `Hidden columns: Canceled 1` com botão de reexibir (`eye`). | 4 colunas básicas com DnD e steppers táteis. | **Frente ativa #20:** implementar colapso em trilho vertical e widget de colunas ocultas. |
| Kanban (cards) | Observado em `itsaplan.dev/board`: Ticket code (`PLAN-142`), ícone de prioridade (barras de sinal e alerta laranja), ícone de status antes do título, tag com ponto (`• tag`), tempo/estimativa (`3d`, `47m`), avatar/responsável e rodapé de atualização. | Cards com código, prioridade, status, tag, prazo, avatar e steppers. | Adicionar estimativa/tempo demonstrativo e timestamp de atualização. |
| Detalhes da tarefa | Observado em documentação pública e prints: painel completo com título, descrição markdown, status, prioridade, responsável, prazo, subtarefas/checklist e atividade/comentários. | Modal com campos básicos (título, descrição, status, prioridade, prazo, tag). | **Frente ativa #20:** adicionar checklist/subtarefas interativas e aba de comentários simulados. |
| Tabela / Lista | Observado em print real: visualização agrupada por status com colunas `Title` e `Priority`, subtabs (`All`, `Roadmap`, `Soon`, `+ New view`). | Implementada na `main` com grupos colapsáveis e edição inline. | Aprofundar após aprovação do Kanban. |

---

## Matriz detalhada por fluxo (observações reais da referência)

| Tela/componente | Pré-condição + ação | O que abre / muda (observado no It's a Plan) | Evidência | @planw (mock interativo) | Diferencial autoral |
| --- | --- | --- | --- | --- | --- |
| Kanban → Coluna | Clicar no botão colapsar `< >` no topo da coluna | A coluna encolhe para um trilho vertical estreito (~40px) exibindo `< >`, `+` e o nome/contador verticalmente (ex.: `Todo 2`). Clicar no trilho expande a coluna de volta. | `media_1792094200027_6058cf8d.png` (`itsaplan.dev/board`) | Implementado via estado React local com transição fluida e acessibilidade por teclado | Layout próprio em Tailwind 4 e shadcn/ui |
| Kanban → Coluna | Clicar no botão ocultar `eye-slash` | A coluna sai da esteira principal e passa a constar no bloco `Hidden columns` no canto direito, com botão de olho para restaurá-la. | `media_1792094200027_6058cf8d.png` | Estado `hiddenColumns` gerenciado em React; widget no topo do Kanban permite reexibir | Sem código AGPL, estilização própria |
| Kanban → Card | Visualizar metadados no card | Exibe código unívoco (`PLAN-XXX`), ícone de prioridade em barras ou caixa de alerta, ícone de status antes do título, tag, estimativa/tempo (`3d`), data e avatar. | `media_1792094200027_6058cf8d.png` | Exibição de código sequencial, prioridade em barras/alerta, tag badge, prazo e avatar | Design system matte charcoal autoral |
| Kanban → Card | Clicar no card | Abre painel/modal detalhado de inspeção e edição da tarefa com subtarefas/checklist e histórico. | `media_1792094200027_6058cf8d.png` & README do fork | Modal Radix Dialog com edição de propriedades, checklist interativo com contagem e histórico de comentários na sessão | Implementação independente com Radix Dialog e estado React |
| Kanban → Toolbar | Visualizar controles superiores | Tabs de visualização (`All`, `+ New view`), botão `Filters`, botão `Display` (configuração de colunas). | `media_1792094200027_6058cf8d.png` | Pílula flutuante (`Filtros`, `Quadro`, `Tabela`), busca textual e dropdowns de status/prioridade | Componentes Radix UI |

---

## Procedimento de conformidade e avanço
1. **Frontend-Only estrito:** Todo o comportamento de colunas colapsadas, colunas ocultas, checklist e comentários opera em memória no estado React do cliente, sem chamadas de rede ou APIs fictícias.
2. **Independência:** Proibido inspecionar código AGPL do fork; todas as estruturas são criadas com React 19, TypeScript, Tailwind 4 e primitivas Radix/shadcn.
3. **Critério de avanço:** Concluir o Kanban completo interativo na `main`, testar localmente com `bun run lint`, `typecheck` e `build`, capturar screenshots reais e registrar na Issue #20.
