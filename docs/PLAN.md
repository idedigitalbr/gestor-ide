# @planw — produto e plano vigente

**Atualizado:** 15/10/2026  
**Situação:** produto em construção, DEV SOLO OFFLINE. **Fonte de verdade da visão:** este documento. **Fonte de verdade de execução:** Issues, código e testes.

## 1. Missão original — NÃO reduzir a Tabela e Kanban

Construir o **@planw** como alternativa própria com **paridade progressiva de experiência e capacidades do [It's a Plan](https://itsaplan.dev/)**. Ele é nossa **referência nº 1 para TUDO**: organização do produto, projetos, tarefas, navegação, fluxos, interações, apresentação e comportamento. A intenção de equivalência é de **produto**, não de copiar sua implementação.

**Notion, ClickUp, Linear, Plane e Twenty** são referências complementares para ideias, ajustes e recursos que melhorem o @planw. Nunca inverter essa hierarquia. **Tabela e Kanban são a primeira entrega**, não a definição completa do aplicativo.

Queremos entender o funcionamento do It's a Plan a partir de interfaces, usos e documentação de comportamento disponíveis legitimamente, transformar observações em requisitos verificáveis e construir as soluções no nosso repositório. Elaborar um inventário de funcionalidades e diferenças **progressivamente**, conforme cada módulo for planejado; não inventar uma lista exaustiva sem observação.

**Lei arquitetural do frontend (Will, 16/10/2026):** todas as telas devem consumir **shadcn/ui + Radix, Tailwind 4, tokens semânticos e componentes compartilhados por padrão**, sem estilos, primitives ou catálogos de cores paralelos. Componente próprio só por necessidade exclusiva comprovada; quando houver reutilização possível, o componente será compartilhado. Preservar o visual/UX aprovado, com consistência em todos os temas. Detalhes: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## 2. Estratégia de implementação independente e licença

O antigo fork **PLANW1** foi encerrado como base de código. Isso **não cancelou a visão original de produto**. O @planw é uma implementação independente em código próprio, sem reaproveitar, traduzir ou adaptar código AGPL, componentes, CSS, assets, logos ou marcas do software de referência e sem reprodução visual pixel a pixel. Bibliotecas externas devem ter licenças verificadas. As regras, exemplos e a origem histórica da política estão em [proveniência](provenance/README.md).

**Nota jurídica:** funcionalidades e conceitos gerais podem ser reimplementados independentemente sem impor automaticamente a AGPL ao novo código; porém semelhanças com elementos protegidos e questões de licença/marca continuam exigindo análise caso a caso. Não prometer blindagem jurídica absoluta; antes de comercialização, avaliar necessidade de parecer especializado.

## 3. Escopo efetivamente autorizado — primeira tela

**Aprovação de Will em 15/10/2026:** executar [Issue #18 — Tabela + Kanban](https://github.com/victorwilliames/planw/issues/18), após aprovação do recorte na [Issue #1 (fechada)](https://github.com/victorwilliames/planw/issues/1). Implementar em `apps/web`: casca visual original, uma tela de tarefas moderna e responsiva, navegação entre **Tabela e Kanban**, **mesmas tarefas** nas duas visões, criação/edição de título e descrição curta opcional, alteração de Status e estados vazios. Os dados são demonstrativos e ficam **somente no estado React**.

**Não autorizado nesta primeira entrega:** integração com PostgreSQL/Drizzle, migrações, APIs, autenticação, localStorage, múltiplos workspaces, colaboração, agentes IA, CRM, documentos, automações ou deploy. Nada disso está cancelado como visão futura; só fica fora do protótipo visual. O aceite depende de Will avaliar a interface em execução, não só de passar no build.

## 4. Caminho de evolução — sem datas ou escopo inventados

**Etapa atual — Experiência visual:** a [PR #19](https://github.com/victorwilliames/planw/pull/19) foi **integrada à main** no commit `301be90`; a [Issue #18](https://github.com/victorwilliames/planw/issues/18) continua **aberta** para aceite visual. Prioridade seguinte: observar e prototipar o **Kanban completo** (Issue #20) antes de aprofundar Tabela/Lista. Sem banco nem backend.

**Próxima prioridade de produto, solicitada por Will em 15/10/2026:** após a integração da [PR #19](https://github.com/victorwilliames/planw/pull/19) e a revisão visual da Issue #18, aprofundar **primeiro o Kanban inteiro** — o que abre ao clicar no cartão, painel de detalhes, propriedades, menus, filtros, grupos e demais comportamentos **efetivamente observados** na interface do It's a Plan. Só **depois** ampliar a Tabela/Lista. Registrar o inventário observacional e os limites de backend na [Issue #20](https://github.com/victorwilliames/planw/issues/20). **O fork AGPL é referência histórica para documentar capacidades, não origem de código, CSS ou assets.** Observar a aplicação rodando, não sua implementação, com separação de papéis quando possível.

**Direção de execução ratificada por Will em 15/10/2026 — FRONTEND FIRST PARA O PRODUTO INTEIRO:** concluir progressivamente o **mockup funcional de todas as áreas e fluxos da experiência do It's a Plan** (Kanban completo primeiro; depois Tabela/Lista; depois os demais módulos que forem sendo mapeados e aprovados), com navegação, componentes, janelas, formulários, edição, estados, interações e dados fictícios em memória/mocks locais. **Não ativar banco, API real, autenticação, persistência remota, armazenamento, integrações ou infraestrutura até Will aprovar a experiência frontend do sistema inteiro.** Backend e modelagem real são uma **fase posterior**; a presença do scaffold técnico no repo não autoriza usá-lo. Interfaces que pressupõem rede/usuários/arquivos podem demonstrar o fluxo em **simulação explicitamente identificada**, sem alegar upload, colaboração ou persistência real. Não confundir "mockup interativo aprovado" com "funcionalidade pronta para produção". Definir e validar módulo a módulo, sem escopo infinito implícito.

**Mudança de arquitetura ou gastos:** precisam de decisão explícita de Will; não ativar infraestrutura por inércia.

## 5. Estado técnico e operacional

- **Repositório:** `victorwilliames/planw`, Bun/TypeScript/Turborepo; `apps/web` usa Next.js 16/React/Tailwind; scaffold adicional Elysia + Bun API (Issue #22, inativo por padrão), worker (inativo), Drizzle/PostgreSQL, auth, UI, core e SDK. **O scaffold não significa produto pronto.**

- **Testes:** Antigravity validou instalação, lint, typecheck, build e smoke tests do scaffold no notebook. A PR #17 atualizou `drizzle-orm` e já foi integrada; [Issue #16](https://github.com/victorwilliames/planw/issues/16) mantém acompanhamento dos alertas transitivos de ferramentas de desenvolvimento. [Issue #2](https://github.com/victorwilliames/planw/issues/2) registra a auditoria/decisões arquiteturais restantes; **não migrar para SQLite sem decisão**.

- **Execução:** Antigravity desenvolve no notebook (DEV SOLO OFFLINE), ChatGPT faz coordenação/revisão/GitHub e Will decide produto, grandes riscos e orçamento. **Sem VPS, Muse, Hermes, OpenCode ou agentes remotos nesta fase.**

- **Gestão:** único [Project PlanW](https://github.com/users/victorwilliames/projects/1), views oficiais `Backlog (Pendências)` (9), `Sprint (Atual)` (10), `Arquivados | Próximos Sprints` (8). Status: Backlog, A Fazer, Em Andamento, Em Revisão, Bloqueado e Concluído. `Priority` e `Tipo` são campos opcionais ocultos nas views principais, não colunas de andamento. Sprint 0 registrada como 06–19/10/2026 (datas inicialmente provisórias; conferir Project). [Issue #4](https://github.com/victorwilliames/planw/issues/4) concluída.

- **Fluxo main-only (Will, 15/10):** Issue/critério de aceite → Project/Sprint → inspecionar referência → construir frontend independente → testar/comparar screenshots → commit direto na `main` → evidência/aceite → Concluído. **Sem PR rotineira nem branches paralelas**. Exceções realmente arriscadas param para decisão explícita de Will; branch/PR só com autorização extraordinária. Preservar a Sprint original e histórico.
- **Documentação do frontend:** seguir [matriz It's a Plan](ITSAPLAN_REFERENCE.md), [política frontend-only](FRONTEND_ONLY_POLICY.md) e [proveniência](provenance/README.md); bibliotecas/AGPL em [conformidade de licenças](LICENSE_COMPLIANCE.md). Não gerar clones pixel a pixel nem copiar código-fonte de referência.

## 6. Memória, fontes e história recuperável

**Autoridade:** decisão explícita de Will > [AGENTS.md](../AGENTS.md) e este plano > Issues aprovadas/código/testes > resumos auxiliares em [docs/ai](ai/). Documentos antigos podem explicar a origem, mas não reativam instruções superadas. O [índice](README.md) mostra o que ler.

**Provas anteriores à correção do contexto:** [registro original de proveniência, commit `041ff945`](https://github.com/victorwilliames/planw/blob/041ff945f979aec35beeadc464208dab11f623f6/docs/provenance/README.md); [PRD, PROJECT e ROADMAP históricos](../PLANO%20TIME/historico/pre-dev-offline/docs/); [sessões Antigravity de 13/10](ai/antigravity-chats.md), que já mencionam Clean Room e `HANDOFF_REA_ITSAPLAN_PLANW.md`. Esse handoff **foi citado no histórico, mas não encontrado como arquivo versionado nas árvores consultadas**. A perda de ênfase da visão completa foi erro de consolidação de documentação, **não uma mudança de objetivo de Will**.

**Regra de manutenção:** corrigir a fonte oficial quando os fatos mudarem; usar links para evidências, não criar documentos paralelos para a mesma decisão. Não afirmar que funcionalidade/teste foi entregue sem evidência.
