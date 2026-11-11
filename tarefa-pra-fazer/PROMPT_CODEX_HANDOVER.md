# HANDOVER DO PROJETO GESTOR-IDE — PROMPT PARA O CODEX

> **Atenção Codex**: Este documento contém todo o contexto, requisitos, estado atual, arquivos modificados, prints de referência e checklist do que já foi implementado e do que resta para finalizar o refinamento do **IDE Gestor**.

---

## 1. Contexto Geral & Diretrizes do Repositório

- **Repositório único oficial**: `D:\.GITHUB\sistemas\gestor-ide`
- **Porta em execução**: `http://localhost:3005` (Next.js 15 App Router com Turborepo e Bun)
- **Regra estrita**: Não existe mais a pasta `crm` (já foi apagada). Não sincronizar com Notion. Deploys em VPS só se expressamente solicitados.
- **Stack**: Next.js 15, Turborepo, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons, Bun.

---

## 2. Checklist do que Já Foi Feito (Status: CONCLUÍDO)

### A. Modal de Detalhes da Tarefa (`apps/web/components/task-modal.tsx`)
- [x] **Largura exata fixada em 800px**:
  - `w-[800px] max-w-[800px]` e `style={{ width: "800px", maxWidth: "min(800px, 96vw)" }}`.
- [x] **Barra Superior Minimalista de Propriedades**:
  - Pill de Status: dropdown clicável com badge e cores padronizadas.
  - Pill de Prioridade / Urgência: seletor de prioridade (Normal, Média, Alta, Urgente).
  - Pill de Prazo com `NotionDatePicker`: suporte a data única ou intervalo (`startDate` e `dueDate`), com alerta de urgência.
  - Pill de Projeto / Módulo: badge roxo com dropdown de projetos.
  - Pill de Responsável unificado: avatar e nome juntos no mesmo trigger do dropdown (`Will`, `Edmundo`, `Aline`, `Hesron`).
  - Botão chevron `>` para expandir detalhes adicionais se desejado.
- [x] **Descrição retrátil**:
  - Bloco de descrição com toggle colapsável via chevron.
- [x] **Checklist & Subtarefas inteligente**:
  - Diferenciação visual: se um item tem apenas título, exibe checkbox quadrado `[ ]` (checklist rápido). Se tiver data, responsável ou sub-itens, exibe checkbox circular `( )` (subtarefa completa).
  - Barra de progresso superior na cor roxa (`#7c5dfa`) com badge de contagem (ex: `5 de 9 concluídas (56%)`).
  - Sub-itens aninhados em árvore hierárquica (Nível 1 e Nível 2) com linhas conectoras de 90°.
  - Ações no hover: `+ Item`, editar título inline, definir prazo, definir responsável, excluir.
- [x] **Abas inferiores**:
  - Atividades, Comentários (com contador) e Anexos.

---

### B. Table View Hierárquica (`apps/web/components/task-table/task-table.tsx`)
- [x] **Aparência dos Blocos & Fundo Preto Puro**:
  - Fundo principal `#000000` (preto puro).
  - Containers dos blocos em grafite escuro sólido `#121317` (`border border-[#1f212a] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.5)]`).
  - Sem gradientes neon ou fundos brilhantes.
  - Espaçamento de 16–20px entre os blocos principais (`space-y-4 mb-4`).
  - Faixa vertical fina colorida de 3.5px à esquerda identificando o tipo especial (`STAGE` #8b5cf6, `PAGE` #3b82f6, `SECTION` #f59e0b, `MODULE` #06b6d4).
  - Altura padrão de linha: `h-[50px] min-h-[50px]`.
- [x] **Alinhamento Rigoroso das Colunas**:
  - Ordem principal no cabeçalho e em todos os níveis da hierarquia:
    `TAREFA (flex-1) | STATUS (w-36) | DATA (w-44) | RESPONSÁVEL (w-36) | AÇÕES (w-8)`
  - Alinhamento perfeito entre pais, filhos e sub-elementos.
- [x] **Progresso Segmentado Junto ao Título (`TaskSegmentedProgress`)**:
  - Posicionado imediatamente após o título da tarefa.
  - Segmentos coloridos correspondentes aos status dos descendentes (verde `#10b981`, roxo `#8b5cf6`, laranja `#f59e0b`, vermelho `#ef4444`, cinza `#374151`).
  - Contagem discreta ao lado (`0/8`, `4/9`).
  - 100% verde quando todas concluídas.
  - Tooltip no hover estilo balão branco com seta para baixo: `Feito X/Y ZZ%`.
  - Oculto quando a tarefa não possui descendentes. Sem contagem duplicada.
- [x] **Badges de Status Sólidos (`TaskSolidStatusBadge`)**:
  - Preenchimento sólido compacto na respectiva cor do status:
    - `CONCLUÍDO`: fundo `#132a22`, texto `#6ee7b7`, bolinha `#10b981`.
    - `EM ANDAMENTO`: fundo `#241b42`, texto `#d8b4fe`, bolinha `#a855f7`.
    - `PENDENTE`: fundo `#1c1e28`, texto `#9ca3af`, bolinha `#6b7280`.
    - `BLOQUEADO`: fundo `#2d1519`, texto `#fca5a5`, bolinha `#ef4444`.
    - `EM REVISÃO`: fundo `#2d2012`, texto `#fcd34d`, bolinha `#f59e0b`.
  - Dropdown clicável para alteração rápida de status.
- [x] **Célula de Data com Barra Temporal Decorrida (`TaskTimelineDateCell`)**:
  - Pill arredondado compacto exibindo as datas (`1 nov - 20 nov` ou `sex (20/nov)`).
  - Barra interna horizontal discreta indicando o tempo decorrido entre `startDate` e `dueDate`:
    - Azul (`#3b82f6`) durante o andamento normal.
    - Laranja (`#f59e0b`) próximo do vencimento (<= 2 dias) ou urgente.
    - Vermelho (`#ef4444`) com alerta `!` quando vencido sem conclusão.
    - Verde (`#10b981`) se concluído no prazo.
  - Abre o `NotionDatePicker` com `allowRange` no clique para alterar data de início, prazo e urgência.
- [x] **Célula de Responsável (`TaskAssigneeCell`)**:
  - Avatar circular (`w-4 h-4`) e nome do responsável (`Will`, `Edmundo`, `Aline`, `Hesron`).
  - Dropdown completo para selecionar membro da equipe ou desatribuir.
- [x] **Organização por Grupos (Grupos Especiais vs Grupos Livres)**:
  - **Grupo Especial**: tarefa real com tipo especial configurável (Etapa, Página, etc.). Possui status, data, responsável próprios e filhos organizados em árvore com linhas conectoras.
  - **Grupo Livre**: container visual com título, contagem agregada de tarefas/sub-elementos e botão `+ Adicionar tarefa`.
  - Botão `+ Adicionar novo grupo` no rodapé da tabela com Popover (`CreateGroupPopover`) permitindo criar Grupo Livre ou Grupo Especial (selecionando tipo especial, título e status).
- [x] **Conectores de Árvore**:
  - Guias verticais e ramos curvos a 90° (`border-l-[1.5px] border-b-[1.5px] rounded-bl-[6px]`) conectando visualmente as tarefas pais aos seus filhos em múltiplos níveis.
- [x] **Typecheck e Integridade**:
  - `bun run typecheck` passando 100% em todos os 7 pacotes do monorepo (`turbo typecheck`: 7 successful, 0 errors).

---

## 3. Mapeamento de Arquivos Criados e Editados

Todos os arquivos estão no projeto `D:\.GITHUB\sistemas\gestor-ide`:

| Arquivo | Descrição |
|---|---|
| `apps/web/components/task-table/task-table.tsx` | Componente mestre da Table View hierárquica, blocos `#121317`, fundo `#000000`, colunas alinhadas e árvore recursiva. |
| `apps/web/components/task-table/task-segmented-progress.tsx` | Componente da barra de progresso segmentada colada ao título com tooltip `Feito X/Y ZZ%`. |
| `apps/web/components/task-table/task-solid-status-badge.tsx` | Badges de status com preenchimento sólido colorido e dropdown. |
| `apps/web/components/task-table/task-timeline-date-cell.tsx` | Célula de prazo com barra decorrida de tempo consumido entre `startDate` e `dueDate`. |
| `apps/web/components/task-table/task-assignee-cell.tsx` | Célula de responsável com avatar e menu de seleção. |
| `apps/web/components/task-table/create-group-popover.tsx` | Popover do botão `+ Adicionar novo grupo` (Grupo livre vs Grupo especial). |
| `apps/web/components/task-modal.tsx` | Modal de detalhes com largura exata travada em 800px (`w-[800px] max-w-[800px]`), barra minimalista e checklists. |
| `apps/web/components/task-app.tsx` | Orquestrador principal da aplicação com suporte a navegação por gestão, projeto, sincronização e fallback de dados. |
| `apps/web/lib/initial-data.ts` | Estrutura de dados com etapas (01 a 05), páginas, seções, módulos, subtarefas, datas e membros. |
| `packages/core/src/index.ts` | Extensão das interfaces `Task` e `Subtask` com `parentId`, `parentTaskId`, `startDate`, `customGroup`. |

---

## 4. O que Resta / Tarefas de Ajuste Fino para o Codex (`[ ] A Fazer`)

Caso o usuário solicite novos refinamentos, as seguintes melhorias podem ser trabalhadas:

- [ ] **Drag & Drop entre Níveis Hierárquicos**:
  - Permitir arrastar uma tarefa comum para dentro de uma tarefa especial para torná-la filha (`parentTaskId`), ou arrastar para fora para torná-la raiz.
- [ ] **Animação Suave no Expand/Collapse**:
  - Adicionar transição de colapso nos grupos e itens da árvore usando Radix Collapsible ou framer-motion/tailwindcss transitions.
- [ ] **Ações de Seleção em Lote na Árvore**:
  - Permitir arrastar seleção em lote ou aplicar tags em lote a partir da barra flutuante que já existe na tabela.
- [ ] **Sincronização em Tempo Real com WebSocket/CRM (Opcional)**:
  - Caso o CRM remoto receba alterações, reconciliar os dados locais sem sobrescrever edições em andamento no modal.

---

## 5. Mapeamento dos Mockups Salvos

Todos os mockups e prints enviados pelo usuário foram salvos em:
`D:\.GITHUB\sistemas\gestor-ide\tarefa-pra-fazer\mockups\`

Principais arquivos de referência visual:
- `media_1794350056071_27dffc03.jpg`: **Mockup Mestre Geral**. Mostra o visual escuro minimalista, blocos elevados `#121317`, faixas coloridas à esquerda, barras de progresso segmentadas e alinhamento das colunas.
- `media_1794348063424_0c6e7332.png` e `media_1794348099579_789589e9.png`: Detalhe da barra segmentada com tooltip `Feito 1/3 33.3%` e barra temporal `nov 9 - 11`.
- `media_1794348258313_8496c72b.png` e `media_1794348321294_ec00b384.png`: Zoom do pill de data com a barra azul de tempo consumido preenchendo o fundo.
- `media_1794348366206_5c490448.png`: Mockup de criação de novos grupos e hierarquia.
- `media_1794347439479_f3b4fd8a.png`: Mockup do Modal de Tarefa com largura 800px, grupos de checklist, datas de vencimento e responsáveis.
- `media_1794347994868_55565454.png`: Detalhe das linhas conectoras de árvore (linhas verticais e ramos curvos a 90° conectando pais e filhos).

---

## 6. Como Rodar e Testar

```bash
# 1. Entrar na pasta oficial
cd D:\.GITHUB\sistemas\gestor-ide

# 2. Executar o servidor dev (porta 3005)
bun run dev

# 3. Validar tipagem TypeScript (deve passar 7 de 7)
bun run typecheck
```

O dev server já está rodando perfeitamente na porta **3005**.
Qualquer dúvida ou novo comando pode ser executado diretamente em `D:\.GITHUB\sistemas\gestor-ide`.
