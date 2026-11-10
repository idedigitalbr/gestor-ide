# @planw — política obrigatória FRONTEND ONLY

**Aprovação de Will (15/10/2026): FRONTEND ONLY · MOCK DATA ONLY · BACKEND ON HOLD até o mockup interativo do produto inteiro estar avaliado/aprovado.** Nenhum agente pode antecipar a fase de backend apenas porque há scaffold no repo.

## O que fazer agora

Criar **interfaces reais, navegáveis e clicáveis** usando Next.js, React, TypeScript, Tailwind e shadcn/Radix; dados de exemplo, estado React, fixtures e mocks totalmente locais. Sidebar, toolbars, cards, formulários, modais, dropdowns, popovers, atalhos, drag-and-drop, confirmações, erros e responsividade precisam ser experimentáveis. Mudanças de estado devem refletir na mesma sessão, sem prometer persistência definitiva.

Prioridade atual: **Kanban completo (Issue #20)**: mapear primeiro os fluxos observáveis no It's a Plan, prototipar cada clique e o painel de detalhes; depois aprofundar Tabela/Lista; depois outros módulos verificados, em sequência acordada com Will.

Para UI de comentários, usuários, anexos, automações, login ou integrações, apenas **simular a interface localmente e identificar os dados como demonstração**. Não fingir envio real, upload persistente, colaboração entre pessoas ou alteração de conta externa. Deixar claro ao avaliar que recarregar a página pode restaurar os dados de exemplo.

## O que está proibido nesta fase

- Desenvolver/conectar APIs reais, endpoints, banco PostgreSQL/Drizzle ou migrações;
- Autenticação, armazenamento, upload ou serviço de rede de produção;
- Ativar VPS, deploy, agentes em nuvem, infraestrutura, serviços pagos, integrações externas;
- Alterar a arquitetura para viabilizar um backend antes da aprovação explícita de Will;
- Tratar elementos visuais de demonstração como funcionalidade operacional concluída.

**Scaffolds existentes podem permanecer intocados**; não apagá-los por não serem usados ainda. Nenhuma fase posterior é desbloqueada automaticamente.

**Padrão inegociável:** nenhuma tela do protótipo, mock ou interação de teste pode fugir da [lei nº 1 do Design System](DESIGN_SYSTEM.md): shadcn/Radix, Tailwind, tokens e componentes reutilizados; novos controles personalizados ou cores soltas somente conforme as exceções rigorosas documentadas.

## Qualidade e validação

Cada fluxo entrega: screenshot real (desktop/mobile conforme pertinente), resultado da ação, estado atualizado e teste de teclado, quando aplicável. Comparar com [matriz de referência](ITSAPLAN_REFERENCE.md), registrar limitações e testar lint/typecheck/build. **UX visual interativo aprovado ≠ produção pronta.** Backend será um projeto separado apenas quando Will liberar.
