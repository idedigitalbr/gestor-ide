# ADR-001 — Registro e Arquitetura da Stack Oficial do IDE Gestor

**Criado:** 2026-10-08  
**Atualizado:** 17/11/2026  
**Status:** **ACEITO E IMPLEMENTADO** (Issue #1)

## 1. Contexto e Decisão de Persistência

O IDE Gestor atua integrado ao ecossistema IDE Digital, onde o **IDE CRM** (`https://crm.suporteide.digital`) é a **fonte única da verdade** para dados empresariais (MySQL/Prisma), RBAC e regras de negócio.

Para manter o desempenho instantâneo (0ms Stale-While-Revalidate) e resiliência offline sem introduzir bancos de dados paralelos ou SQLite local:
- **Aposentadoria do SQLite local:** O projeto não utiliza banco relacional embutido (`data/*.db`) nem duplica tabelas do CRM.
- **Transição para TanStack Query + IndexedDB:** O estado de servidor da UI foi padronizado em `@tanstack/react-query` v5 persistido em IndexedDB (`idb-keyval` + `@tanstack/query-async-storage-persister`).
- **Transporte Oficial:** `@gestor-ide/sdk` atua como o cliente HTTP tipado e transporte seguro para a API do IDE CRM.

## 2. Stack Oficial Atualizada

- **Runtime & Pacotes:** Bun (`bun@1.4.3+`) com Turborepo.
- **Frontend Web:** Next.js 16.4 (App Router), React 19.3, Tailwind CSS 4, Radix UI + shadcn/ui.
- **Estado de Servidor & Cache Local-First:** TanStack Query v5 + `@tanstack/react-query-persist-client` com persister IndexedDB (`idb-keyval`).
- **Desktop Nativo:** Tauri v2 (Rust) com suporte a bandeja do sistema (tray), autostart com Windows, notificações e instalador OneClick `.exe`.
- **API Proxy:** Proxy integrado Next.js (`/api/crm/*`) apontando para o IDE CRM online com suporte a OpenAPI 3.1 e MCP (`/api/mcp`).
