# @planw — proveniência e independência de implementação

**Status:** regra operacional atual, recuperada da política original do repositório. **Objetivo:** registrar que o @planw persegue equivalência de produto com o It's a Plan **sem incorporar implementação de terceiros**. Não é parecer jurídico.

## Origem documentada (antes de 15/10/2026)

O [documento original `docs/provenance/README.md` no commit `041ff945`](https://github.com/victorwilliames/planw/blob/041ff945f979aec35beeadc464208dab11f623f6/docs/provenance/README.md) já permitia referência conceitual ao It's a Plan e proibia derivar nosso código do código dele. O [registro do Antigravity em 13/10](../ai/antigravity-chats.md) descreve a estratégia Clean Room/AGPL. A antiga linha PLANW1 foi encerrada como fork; **o desejo de recriar as funcionalidades do produto continuou**. O material de produto anterior também existe em [`PLANO TIME/`](../../PLANO%20TIME/).

## Como desenvolver uma alternativa independente

1. **Observar comportamento legitimamente acessível:** usar experiência de usuário, documentação pública e referências visuais para descrever *o que* uma função faz: campos, comandos, estados, navegação, resultado esperado e problemas de uso. It's a Plan é referência principal para todo o produto; Notion, ClickUp e Linear podem complementar.

2. **Projetar solução própria:** desenhar fluxos, componentes, estado, estrutura, layout e estilo no repositório @planw, sem seguir estruturas internas da implementação referenciada. Sem screenshots como assets, marca/logotipo/ícones/textos distintivos copiados e sem réplica pixel a pixel.

3. **Não importar material AGPL:** não usar o antigo fork PLANW1 como origem de código; não copiar, adaptar, traduzir, transcrever ou pedir a IA para reescrever código, CSS, componentes ou assets do It's a Plan. Não instalar componentes do projeto de referência como dependências do @planw. Caso seja inevitável aproveitar código externo, **parar e solicitar avaliação de licença e impacto antes da incorporação**.

4. **Verificar dependências novas:** priorizar bibliotecas com licenças apropriadas (MIT/Apache-2.0/BSD, por exemplo), registrar nome, versão e licença quando introduzidas; compatibilidade depende também das condições concretas.

5. **Evidência proporcional por entrega:** na Issue/PR, registrar referências de comportamento observadas, decisões de implementação própria, arquivos alterados, testes e dependências externas. **Não criar um arquivo por decisão nem burocracia sem necessidade.**

## O que esta política NÃO garante

Reimplementar funcionalidades ou ideias gerais independentemente **não significa automaticamente adotar AGPL**; a licença do software original não se estende por mera semelhança de finalidade. Isso **não concede liberdade irrestrita** para copiar expressão protegida, identidade comercial, imagens, textos, designs distintivos ou código. A licença e outras normas devem ser analisadas conforme o uso; avaliação jurídica antes de comercialização pública pode ser necessária.

## Fontes e documentos vigentes

- [Visão do produto e fase atual](../PLAN.md)

- [Regras dos agentes](../../AGENTS.md)

- [Issue #18 — implementação visual](https://github.com/victorwilliames/planw/issues/18)

- [Registro histórico de proveniência](https://github.com/victorwilliames/planw/blob/041ff945f979aec35beeadc464208dab11f623f6/docs/provenance/README.md)
