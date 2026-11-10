# @planw — proveniência e acompanhamento de licenças

**Finalidade:** reduzir o risco de incorporar software/expressão AGPL ao produto independente. **Inventário operacional, NÃO parecer jurídico.** Para regras de comportamento consulte [proveniência](provenance/README.md) e [referência funcional](ITSAPLAN_REFERENCE.md).

## Referência proprietária / copyleft externa

| Origem | Situação | Uso no @planw |
| --- | --- | --- |
| [It's a Plan — croffasia/itsaplan](https://github.com/croffasia/itsaplan), [fork de Will](https://github.com/victorwilliames/itsaplan-fork) | Fork GitHub identificado com **AGPL-3.0**; exceção `packages/runner` Apache-2.0 informada no README original | **Somente observação de interface pública e documentação funcional**; sem incorporar código, CSS, componentes, assets, logos ou marca |
| Capturas fornecidas por Will | Material de pesquisa/validação | Usar exclusivamente na comparação privada; **nunca como imagens/assets da aplicação** |

## Dependências usadas no frontend

A PR #19 (integrada à `main` pelo commit `301be90`) adicionou arquivos `apps/web/components/ui/*` no estilo shadcn e dependências `@radix-ui/react-*`, `lucide-react`, `clsx`, `tailwind-merge` e `class-variance-authority`. Os testes e licenças permissivas foram **reportados pelo Antigravity**, mas não se deve tratar essa declaração como auditoria jurídica completa.

| Componente/família | Fonte de licenciamento a conferir na versão instalada | Status |
| --- | --- | --- |
| shadcn/ui (código local `components/ui/*`) | [shadcn/ui](https://github.com/shadcn-ui/ui), arquivos e LICENSE upstream | Implantado; conferir avisos/licenças aplicáveis |
| Radix UI `@radix-ui/react-*` | [Radix Primitives](https://github.com/radix-ui/primitives), LICENSE / package metadata | Reportado como permissivo; confirmar versões |
| Lucide React | [Lucide](https://github.com/lucide-icons/lucide), LICENSE / package metadata | Reportado como permissivo; confirmar avisos |
| `clsx`, `tailwind-merge`, `class-variance-authority` | Repositórios oficiais, LICENSE e `node_modules/*/package.json` | Reportado como permissivo; conferir versões |
| Next.js, React, Tailwind, Bun, demais dependências transitivas | LICENSE / package metadata de versões realmente instaladas e seus `NOTICE` | Avaliação de cadeia completa **pendente** |

## Checklist proporcional de conformidade

- [ ] Ao introduzir dependência, registrar nome, versão, licença e URL da fonte e avaliar transitivas críticas.
- [ ] Não copiar, adaptar, reescrever ou derivar código-fonte AGPL do It's a Plan; nem usar recursos protegidos ou marca.
- [ ] Registrar observações de UI em palavras próprias (ações, estados, fluxo, resultado) e construir componentes próprios usando bibliotecas com licença compatível.
- [ ] Preservar textos de copyright/NOTICE exigidos por dependências; não remover avisos.
- [ ] Antes de comercialização ou reuso externo expressivo, submeter eventuais dúvidas de licença, identidade visual e propriedade intelectual a revisão jurídica.

**Nenhuma destas regras garante ausência total de risco legal.** Equivalência funcional é distinta de cópia de expressão/código, mas a avaliação deve ser caso a caso.
