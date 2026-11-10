# @planw — LEI Nº 1: design system único e reutilização obrigatória

**Dono da decisão:** Will (16/10/2026). **Aplicação:** todo o frontend, todos os agentes e todas as próximas telas. **Maior regra de UI:** **SHADCN/UI → RADIX → TAILWIND CSS 4 → TOKENS SEMÂNTICOS → COMPONENTES REUTILIZÁVEIS**. É obrigatório olhar o que já existe antes de criar algo novo.

O @planw tem identidade e comportamentos autorais, mas **não deve inventar uma nova biblioteca de componentes e estilos a cada tela**. O design aprovado por Will é referência, não autorização para duplicar CSS ou violar a arquitetura. Independência de código AGPL continua obrigatória.

## Fonte da verdade (uma por conceito)

| Conceito | Onde usar/consultar |
| --- | --- |
| Instalação e aliases shadcn | `apps/web/components.json` |
| Button, Input, Dialog, Select, Dropdown, Table, Tabs, Badge etc. | `apps/web/components/ui/` |
| Composições reutilizáveis e componentes de feature | `apps/web/components/`; extrair compartilhado se houver potencial de segundo uso |
| Tailwind v4, cores semânticas, `@theme inline`, `--radius` e CSS variables | `apps/web/app/globals.css` |
| 24 temas existentes, seus tokens e aplicação global | `apps/web/lib/themes/presets-dark.ts`, `presets-light.ts`, `theme-context.tsx`, `theme-utils.ts` |
| Famílias/cores, filtros de tema | `apps/web/lib/themes/theme-catalog.ts`; consolidar catálogo legado paralelo (abaixo) |
| UX de referência e visuais aprovados | `docs/ITSAPLAN_REFERENCE.md` e capturas/Figma de Will |
| Direitos e licenças | `docs/provenance/README.md`, `docs/LICENSE_COMPLIANCE.md` |

## Hierarquia de implementação — LEI, não sugestão

1. **Procurar e reutilizar:** importar o que já existe, sem reescrever outra cópia para cada tela.
2. **Primitives oficiais primeiro:** shadcn/Radix para Button, Input, Dialog, Popover, Switch, Select, DropdownMenu, Tabs, Tooltip, ScrollArea, Checkbox etc.; Lucide para ícones. Antes de instalar algo, checar dependências e componente existente.
3. **Variações com props/tokens:** variantes `cva`/`cn`, sem novos botões, controles e menus paralelos. Escolher Tailwind utilitário com tokens `bg-background`, `bg-card`, `bg-popover`, `bg-sidebar`, `text-foreground`, `text-muted-foreground`, `border-border`, `focus-visible:ring-ring`. Escala de fontes/espaços/raios consistente.
4. **Compartilhar por padrão:** padrão com uso atual/futuro em mais de uma tela vira componente/hook compartilhado com props tipadas; Kanban/Tabela usam os mesmos modelos e controles de tarefa. Não duplicar lógica ou estilos só por economia momentânea de tempo.
5. **Exceção realmente necessária:** componente específico só quando nenhuma primitive/variante/compartilhado serve, a experiência é exclusiva e o motivo está documentado no commit/Issue. Mesmo assim compor sobre shadcn/Radix e tokens, sem CSS paralelo. Layout exclusivo e lógica de negócio continuam possíveis.
6. **Preservar o visual aprovado:** mudanças arquiteturais/refatorações não podem redesenhar telas que Will já aprovou. Comparar screenshots e interações.

## Lei das cores — 24 temas hoje, mais no futuro

- **Nenhum novo HEX/RGB/HSL arbitrário em JSX, `className`, estilos inline ou CSS de páginas/componentes.** Novas cores entram somente em **tokens semânticos centrais**, presets e famílias de tema apropriados; novas classes são reutilizadas. Proibir `bg-[#...]`, `text-[#...]` e similares em código novo.
- **Um catálogo central por informação**: famílias primária/secundária para filtro não são os tokens semânticos `--primary`/`--secondary` do shadcn. Não criar listas alternativas do mesmo catálogo para cada tela.
- Componentes **consomem** `ThemeProvider`/tokens; não alteram variáveis globais por conta própria. Apenas o mecanismo central aplica paleta, estados, classes e preferência.
- Validar no mínimo Dark/Light, neutro e saturado, sidebar/header coloridos ligado/desligado, contraste e foco, overlays/popovers, responsividade. Ao adicionar presets, testar o catálogo completo (24 atualmente).
- Não fazer multiplicação artificial de todas as combinações de cores sem decisão de Will.

## Dívida legada já detectada — resolver gradualmente SEM REDESIGN

Auditoria de código GitHub (16/10/2026) encontrou três pontos a consolidar. **Não seguir estes padrões em código novo:**

- **Resolvido na Issue #21:** famílias centralizadas em `theme-catalog.ts`, com `color-families.ts` apenas como adaptador de compatibilidade; classificação e termos de busca ficam no próprio preset. Não reintroduzir mapeamento por IDs.
- `app/globals.css` contém alguns auxiliares hardcoded; substituí-los progressivamente por tokens que respeitem Dark/Light e estados, **sem conversão mecânica** que cause regressão.
- O seletor `components/theme/theme-selector.tsx` ainda compõe popovers e switches manualmente, embora use Button/Input shadcn. Refatorar para shadcn/Radix Popover e Switch quando aplicável **sem mudar tamanho, posicionamento e UX do Figma aprovados**. Acessibilidade real prevalece sobre réplica estética de controles feitos à mão.

Não declarar a arquitetura atual como 100% conforme a lei antes dessa limpeza; não criar um redesign ou nova plataforma de temas para corrigir isto.

## Checklist de aceite para cada tela, commit e Issue frontend

- [ ] Verifiquei componentes existentes antes de criar?
- [ ] Usei shadcn/Radix quando disponíveis? Novos padrões reutilizáveis são compartilhados?
- [ ] Não há novas cores soltas, estilos divergentes, definições de paleta duplicadas?
- [ ] Toda exceção de componente próprio está justificada e usa as primitives/tokens?
- [ ] Funciona no tema escuro/claro, outros presets e sidebar/header coloridos, com acessibilidade/teclado/mobile?
- [ ] Comparei com a UX de referência e **preservei o design aprovado**?
- [ ] Registrei resultados reais de `bun run lint`, `bun run typecheck`, `bun run build`, screenshots e eventuais pendências?

**Se a UI descumprir esta lei, não está concluída.** Fluxo Git normal segue exclusivamente `main`, com commits pequenos; não abrir PR por rotina. **Só Will autoriza alterar esta regra.**

## Arquitetura escalável para 100+ temas (Issue #21)

**Novo tema usando uma família existente = editar somente UM dos arquivos** `apps/web/lib/themes/presets-dark.ts` ou `presets-light.ts`: adicionar `ThemeDefinition` com ID único kebab-case, nome, `mode`, `isPreset`, `primaryColorFamily`, `secondaryColorFamilies`, `searchKeywords` (opcional), descrição e todos os tokens semânticos. **Não alterar o seletor, Kanban, Tabela, Modal, Sidebar, Header ou listas de IDs para registrar tema novo.**

A única lista oficial de famílias é `lib/themes/theme-catalog.ts` (IDs em português). O tipo `ColorFamily` deriva automaticamente de suas chaves. Para adicionar uma família inédita, registrar ali uma entrada com `id`, `name`, `swatch` e `chrome` (alto contraste acessível); a lista de opções e o filtro passam a reconhecê-la. `classifyTheme()` usa os próprios metadados do preset; `searchKeywords` permite sinônimos sem um segundo registro por tema.

**Teste obrigatório após adicionar/mudar tema:**

```bash
bun run test:themes
bun run lint
bun run typecheck
bun run build
```

`test:themes` valida 24 presets oficiais e **120 fixtures adicionais em memória**, sem colocá-las na UI de produção: IDs únicos, famílias, HEX/tokens obrigatórios, classificação, busca e cenários inválidos. Também imprime avisos WCAG AA de pares de texto para inspeção humana; **não altera automaticamente as cores aprovadas**. Na revisão de UI, testar um tema escuro e claro, contrastes de foco/hover, chrome colorido e responsividade.

**Limite conhecido:** a validação cobre estrutura, cores HEX e contraste básico dos pares textuais. Não prova percepção visual de todos os estados em todas as 100+ paletas nem faz captura de browser automaticamente; validar interface no navegador antes da aprovação. Futuros tokens obrigatórios devem ser adicionados ao contrato em `types/theme.ts` e `REQUIRED_THEME_TOKENS` em `theme-validation.ts`.
