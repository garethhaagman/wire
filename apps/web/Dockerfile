FROM oven/bun:1.3.9
WORKDIR /repo

COPY package.json bun.lock* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/docs/package.json apps/docs/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/eslint-plugin-wire-api/package.json packages/eslint-plugin-wire-api/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui-config/package.json packages/ui-config/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY infra/package.json infra/package.json
RUN bun install

COPY tsconfig.base.json ./
COPY packages/types ./packages/types
COPY packages/ui-config ./packages/ui-config
COPY apps/web ./apps/web

WORKDIR /repo/apps/web
EXPOSE 5173
CMD ["bun", "run", "dev", "--host"]
