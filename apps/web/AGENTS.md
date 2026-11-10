<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## LEI Nº 1 DE TODO O FRONTEND — OBRIGATÓRIA

**MANDATORY: SHADCN/UI + RADIX + TAILWIND + SEMANTIC TOKENS + REUSE FIRST. NEVER CREATE A PARALLEL DESIGN SYSTEM.**

Antes de editar qualquer arquivo `apps/web/`, ler [docs/DESIGN_SYSTEM.md](../../docs/DESIGN_SYSTEM.md) e [AGENTS.md](../../AGENTS.md). Esta regra vale para **todas as telas futuras, componentes, páginas e agentes**.

- **Pesquisar antes de criar:** `components/ui/` (shadcn), `components/` (composições), `lib/themes/` (paletas/presets), `app/globals.css` (tokens) e `components.json` (registro).
- **Reutilizar** primitives Radix/shadcn, Tailwind e tokens; ícones Lucide. Estender props/variants; não recriar Switch, Popover, Dialog, Button, Input, Tooltip ou menus por conta própria se houver equivalentes. Uma nova composição reutilizável deve ser compartilhada, não duplicada por feature.
- **Nenhuma nova cor HEX/RGB/HSL solta em página, JSX, classe Tailwind ou CSS de componente.** Somente definições centralizadas de tema/tokens; novas cores/variantes do catálogo são reutilizáveis.
- **Exceção específica:** permitir componente próprio somente se não houver equivalente que sirva, com justificativa documentada, mínimo de código e composição sobre shadcn/tokens. Exclusivo não significa criar biblioteca de UI paralela.
- **Validar todos os modos:** Dark/Light, 24 presets, sidebar/header coloridos, acessibilidade e mobile. Preservar o seletor de aparência e demais visuais aprovados por Will; refatoração técnica NÃO autoriza redesign.
- Antes de encerrar uma Issue, registrar components/tokens reaproveitados, justificativa das exceções, testes executados de verdade e screenshots comparativos pertinentes. Se não for possível validar, declarar a pendência.

**Não modificar o bloco gerado automaticamente pelo Next.js acima.**
