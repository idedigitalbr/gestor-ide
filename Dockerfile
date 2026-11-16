FROM oven/bun:1-slim AS builder

WORKDIR /app

# Instalar dependências respeitando o lockfile do Bun
COPY package.json bun.lock bunfig.toml turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/web/tsconfig.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/core/package.json ./packages/core/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/worker/package.json ./apps/worker/
COPY apps/desktop/package.json ./apps/desktop/

RUN bun install --frozen-lockfile

# Copiar todo o código-fonte
COPY . .

# Build de produção do Next.js (apenas web e seus pacotes de dependência)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build --filter=web...

# Runner stage limpo
FROM oven/bun:1-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3005

COPY --from=builder /app ./

EXPOSE 3005

CMD ["bun", "run", "--cwd", "apps/web", "start", "-H", "0.0.0.0", "-p", "3005"]
