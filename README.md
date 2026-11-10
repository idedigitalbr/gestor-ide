# IDE Gestor (`gestor-ide`)

**Missão:** Plataforma moderna de gestão empresarial do ecossistema IDE Digital (`https://gestor.suporteide.digital`), originada a partir da base tecnológica e visual do PlanW e integrada nativamente à API central e ao banco de dados do **IDE CRM** (`https://crm.suporteide.digital`).

## Arquitetura do Ecossistema

- **Frontend Moderno (`apps/web`):** Next.js 16.4, React 19.3, Tailwind CSS 4, Radix UI + shadcn/ui, Lucide Icons e motor de 24 temas (`Dark`/`Light`) com conformidade estrita à [Lei Nº 1 do Design System](docs/DESIGN_SYSTEM.md).
- **Contratos & Mapeadores (`packages/core` — `@gestor-ide/core`):** Tipagens unificadas e mapeadores bidirecionais entre os modelos do IDE Gestor e a API do IDE CRM (Projetos, Tarefas, Checklists, Comentários, Clientes, Empresas, CRM Comercial e Financeiro).
- **SDK Tipado (`packages/sdk` — `@gestor-ide/sdk`):** Cliente HTTP unificado com suporte a sessão compartilhada (`credentials: "include"`), Bearer Tokens (`sp_mcp_...`), proxy reverso (`/api/crm/*`) e `Idempotency-Key` automática em mutações.
- **Autenticação & RBAC (`packages/auth` — `@gestor-ide/auth`):** Gestão de sessão e permissões por módulo (`projects`, `crm`, `finance`) compartilhada com o IDE CRM, sem duplicação de banco de dados ou cadastros.

## Como Executar Localmente

1. **Instalar dependências (via Bun):**
   ```bash
   bun install
   ```
2. **Iniciar o servidor de desenvolvimento (`http://localhost:3005`):**
   ```bash
   bun run dev
   ```
   *(Por padrão, o `next.config.ts` redireciona `/api/crm/*` para o backend do IDE CRM em `http://localhost:3004/api/*`. Configure `IDE_CRM_BASE_URL` se o CRM estiver em outra URL).*

3. **Validações de Qualidade:**
   ```bash
   bun run test:themes
   bun run typecheck
   bun run lint
   bun run build
   ```
