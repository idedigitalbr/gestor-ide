# @planw — notas de conversas com ChatGPT

**Natureza:** memória manual e resumida. Não faz parte de ai-memory.
**Editor preferencial:** ChatGPT.

## 2026-10-15 — Recuperação da visão ORIGINAL do @planw após erro de contexto

- **Retificação:** não é uma decisão nova. Desde o início, Will quer **recriar progressivamente a experiência e as funcionalidades do It's a Plan** em produto próprio (@planw), mantendo implementação independente para não incorporar código sujeito à AGPL. O fork antigo PLANW1 foi descontinuado como base de código; não cancelou a direção funcional do produto.
- **It's a Plan = referência principal para TODO O PRODUTO.** Notion, ClickUp, Linear, Plane e Twenty são referências adicionais para aprender e incluir melhorias; Tabela e Kanban são apenas a primeira entrega.
- **Evidência do repositório:** a antiga [`docs/provenance/README.md` no commit `041ff945`](https://github.com/victorwilliames/planw/blob/041ff945f979aec35beeadc464208dab11f623f6/docs/provenance/README.md) já determinava independência do código It's a Plan. `docs/ai/antigravity-chats.md` registrou em 13/10/2026 a estratégia Clean Room/AGPL e a referência ao documento `HANDOFF_REA_ITSAPLAN_PLANW.md` (citado, mas não localizado como arquivo versionado nas árvores consultadas). Os arquivos PRD/PROJECT/ROADMAP arquivados no `PLANO TIME/` guardam o contexto da fase anterior, mas não substituem o norte de produto.
- **Erro do ChatGPT:** nas consolidações posteriores, o contexto foi reduzido a um genérico "Tabela tipo Notion + Kanban", levando o assistente a tratar a reiteração de Will como novidade. Corrigir esse erro nas fontes de verdade (`README.md`, `AGENTS.md`, `docs/PLAN.md`, `docs/ai/contexto-atual.md`) e ler a proveniência/histórico antes de redefinir a visão.
- **Limite legal:** reimplementar ideias/funcionalidades a partir de observações públicas em código próprio é diferente de reutilizar, traduzir ou adaptar código AGPL. Não afirmar imunidade jurídica automática; respeitar marcas, materiais protegidos e licenças de dependências.
- **Execução atual:** a Issue #18 continua sendo somente a primeira etapa Tabela + Kanban; não lançar uma suposta reimplementação integral em uma sprint.

## 2026-10-13 — decisão de Will: histórico de Sprints organizado

- Will exigiu ver o agrupamento histórico `Sprint 0` com período, Issues concluídas e futuras Sprints, sem poluir o Kanban da Sprint atual.
- No GitHub antigo, a configuração documentada da Issue #8 já previa `Sprint 0` 06/10 a 19/10/2026 (provisório), field Sprint e views Board | Workflow, Table | Backlog, Sprint | Current, Review | PRs e Blocked. Não refazer Project.
- Tech lead fixou ciclo: Issues Done/closed **permanecem associadas à Sprint original no mesmo Project, não arquivar nem excluir**; pendentes podem ser replanejadas para nova Sprint; ideias adiadas ficam fora da Sprint atual.
- Issue **#4** atualizada com checklist de implementação e validação da view `Sprints | Histórico` (Table, agrupada por Sprint). A conexão GitHub do ChatGPT **não manipula views/fields do Project**; o Antigravity tem `gh` com permissão `project` e deve concluir a configuração/verificação efetiva no navegador/API. Não marcar como criada antes da evidência.
- Nada de criar outro Project, issue duplicada ou nova Sprint com datas inventadas. Registrar URL da view na Issue #4 após confirmar.

## 2026-10-13 — rastreamento obrigatório com Issues + Kanban, sem PR burocrática

- **Decisão expressa de Will:** preservar GitHub Issues, Kanban do Project PlanW e Sprint Backlog **mesmo no DEV SOLO OFFLINE**. Planejar e registrar as entregas antes de executá-las; atualizar andamento e checklist até Done.
- **Fluxo:** análise → plano → Issue (uma por entrega verificável, não por arquivo) → Project/Backlog/Sprint → execução/testes → evidência → conclusão. Mesmo ChatGPT e Antigravity devem consultar os tickets antes de começar e não criar duplicatas.
- **PRs:** opcionais para mudanças pequenas; commits diretamente na main podem referenciar Issue e exigir fechamento manual após testes. Branch + PR para mudanças de risco, segurança, banco/arquitetura e alterações difíceis de reverter.
- **Project:** manter campos/status já existentes; Sprint 0 possui datas provisórias. Conferir iterações e acessos ao Project antes de atribuir; não afirmar que um status foi alterado sem confirmação.
- **Trabalho pendente:** validação local dos ajustes da PR #15 na Issue #2; definição do escopo MVP na Issue #1; validação do novo fluxo na Issue #4. Issues #3, #5 e #6 sobre Muse/OpenCode/ai-memory seguem adiadas, fora das Sprints atuais.
- Esta decisão **substitui** o registro anterior desta mesma data que tornava Issues/Kanban opcionais. Muse, Hermes, VPS e ai-memory continuam inativos.

## 2026-10-13 — modo SOLO / DEV OFFLINE

- **Decidido por Will:** somente Antigravity programando no notebook, ChatGPT planejando/analisando e GitHub como repositório. Muse, Hermes, VPS e outros agentes ficam desativados.
- **Decisão histórica, substituída pelo registro acima:** inicialmente Issues/Kanban seriam opcionais. Agora Issues e Project são obrigatórios para entregas rastreáveis; PRs continuam opcionais em mudanças pequenas.
- **Documentação:** consolidar visão, MVP e roadmap em docs/PLAN.md; AGENTS.md contém regras. Não manter pastas vazias/README de reserva.
- **Memória atual:** docs/ai/contexto-atual.md e notas separadas de ChatGPT e Antigravity; sem instalação ou automação de ai-memory.
- **Aprovação de produto:** MVP e stack local ainda precisam de escolhas do Will. Não confundir proposta de trabalho com permissão de implementar.

## Histórico útil

- Pesquisas/experiências com It's a Plan, Plane, Twenty e visual de tabela e Kanban tipo Notion motivaram o @planw.
- Fork antigo PLANW1 e experimentos com VPS Oracle não são o produto vigente.
- Foram estruturados repositório GitHub, scaffold, normas básicas e GitHub Project. PRs #7, #9, #13, #14 e #15 foram integradas; Issues #8 e #10 encerradas. GitHub Project voltou a ser o painel obrigatório de planejamento, mesmo no DEV SOLO OFFLINE.
- Registros passados de Muse/agy/OpenCode podem aparecer em Git/histórico: **não tratá-los como plano ativo**.

## Como atualizar

Registrar só mudanças relevantes: data, fato confirmado/decisão aprovada, evidência quando houver e pendência. Corrigir fatos ultrapassados no resumo atual. Não copiar conversas inteiras.
