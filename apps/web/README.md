# Interface web — @planw

Frontend Next.js App Router do @planw. **Norte do produto inteiro: recriar progressivamente a experiência funcional do It's a Plan em implementação independente**; Tabela + Kanban é o primeiro módulo, não a visão total. **LEI Nº 1: consulte obrigatoriamente [Design System e Reutilização](../../docs/DESIGN_SYSTEM.md).** Leia [plano](../../docs/PLAN.md), [política de proveniência](../../docs/provenance/README.md) e [Issue #18](https://github.com/victorwilliames/planw/issues/18). O código atual na `main` contém Tabela/Kanban, seletor de aparência e 24 presets; validar o aplicativo no navegador para alegar que as interações funcionam.

## Iniciar apenas a web (DEV SOLO OFFLINE)

Na **raiz** do repositório, com a versão de Bun indicada em `package.json`:

```bash
bun install --frozen-lockfile
bun run dev:web
```

Abrir [http://localhost:3000](http://localhost:3000). Esse comando executa somente o workspace `web`, economizando recursos no notebook. `bun run dev` na raiz continua disponível para iniciar todos os workspaces com tarefas `dev`.

## Conferir antes de integrar alterações

Na raiz:

```bash
bun run lint
bun run typecheck
bun run build
```

O projeto ainda não possui testes de interação ou uma suíte automatizada; não afirmar que navegação, responsividade ou o MVP estão validados por executar somente esses comandos.

## Notas técnicas

- Componentes existentes em `components/ui/` e `components/` são a primeira escolha; novos padrões reutilizáveis entram em módulos compartilhados. Tailwind e tokens em `app/globals.css`, temas em `lib/themes/`. **Proibido criar primitives e paletas locais duplicadas**; ver [Design System](../../docs/DESIGN_SYSTEM.md).
- `app/globals.css` contém Tailwind CSS v4.
- As configurações existentes de Next/Turbopack foram preservadas; o Antigravity já registrou testes básicos de build do scaffold no notebook. **A nova interface ainda precisa de testes próprios**.
- Ler [AGENTS.md](AGENTS.md) para a regra de documentação gerada pelo Next.js, e [documentação principal](../../docs/PLAN.md) para escopo e decisões aprovadas.
