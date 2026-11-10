# ADR-001 — Registro histórico da escolha de stack

**Criado:** 2026-10-08
**Status atual:** escolha anteriormente aceita, **EM REAVALIAÇÃO** após decisão DEV OFFLINE de 13/10/2026.
**Natureza:** histórico técnico; não é aprovação definitiva para instalar/ativar todos os componentes.

Stack registrada na fase anterior:
- Runtime/gerenciador: Bun; linguagem TypeScript.
- Monorepo: Turborepo e workspaces Bun.
- Frontend: Next.js (App Router), React e Tailwind CSS.
- API: Hono no Bun, com REST.
- Banco: PostgreSQL + Drizzle.
- Autenticação: better-auth.

Justificativa original: familiaridade acumulada com tecnologias similares durante observação do It's a Plan. Conhecimento aprendido é aproveitável; **nenhum código do fork antigo** deve ser reutilizado.

**Ponto em aberto:** confirmar que cada camada ainda é necessária para desenvolver localmente no notebook, sem VPS nem agentes de infraestrutura. Evitar manter worker, API separada e banco sempre ligado apenas por inércia.

Para decisões e plano atual, consultar [../PLAN.md](../PLAN.md). Quando a auditoria for concluída, atualizar este registro com a decisão real e justificativa, após validação de Will.
