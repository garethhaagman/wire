FROM oven/bun:1.3.9 AS base
WORKDIR /repo

FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/eslint-plugin-wire-api/package.json packages/eslint-plugin-wire-api/package.json
COPY packages/eslint-plugin-wire-ui/package.json packages/eslint-plugin-wire-ui/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/ui-config/package.json packages/ui-config/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY infra/package.json infra/package.json
RUN bun install

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/types ./packages/types
COPY packages/ui-config ./packages/ui-config
COPY packages/config ./packages/config
COPY packages/db ./packages/db
COPY apps/api ./apps/api

FROM build AS runtime
ENV NODE_ENV=production
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["bun", "src/main.ts"]
