.DEFAULT_GOAL := help
COMPOSE := docker compose
DOCKER_STACK := $(COMPOSE) --profile docker
ENV_DIRS := apps/api apps/web apps/mcp packages/db

.PHONY: help setup env dev dev-api dev-web dev-docs dev-mcp dev-storybook \
	db db-down migrate seed clean \
	docker-up docker-down docker-logs docker-ps docker-rebuild \
	observability-up observability-down \
	install typecheck lint test knip format \
	mcp-generate mcp-check mcp-lint

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# --- Local development (apps run natively with Bun, only Postgres + Redis in Docker) ---

setup: install env ## One-time: install deps and create .env files from .env.example

env: ## Create any missing .env files from .env.example (never overwrites)
	@for dir in $(ENV_DIRS); do \
		if [ ! -f $$dir/.env ]; then cp $$dir/.env.example $$dir/.env && echo "  created $$dir/.env"; fi; \
	done

dev: env db migrate seed ## Start Postgres + Redis, migrate, seed, then api + web + docs + storybook + mcp
	@echo ""
	@echo "  web           http://localhost:5173"
	@echo "  api           http://localhost:3001"
	@echo "  api docs      http://localhost:3001/docs"
	@echo "  markdown docs http://localhost:3000"
	@echo "  storybook     http://localhost:6006"
	@echo "  mcp (http)    http://127.0.0.1:3002/mcp"
	@echo ""
	bun run dev

dev-api: env db ## Run only the API (plus Postgres + Redis)
	bun run dev:api

dev-web: env ## Run only the web app
	bun run dev:web

dev-docs: ## Run only the docs viewer
	bun run dev:docs

dev-mcp: env ## Run only the MCP server (expects the API at WIRE_API_URL)
	bun run dev:mcp

dev-storybook: ## Run only Storybook for the @wire/ui design system
	bun run dev:storybook

db: ## Start Postgres and Redis in Docker and wait until they're healthy
	bun run db:up

db-down: ## Stop Postgres and Redis (keeps data)
	$(COMPOSE) stop postgres redis

migrate: ## Run Postgres migrations from your machine
	bun run db:migrate

seed: ## Create the dev user (dev@wire.local) and "Wire Dev" workspace if missing
	bun run db:seed

clean: ## Stop all containers and remove volumes (DESTROYS local Postgres data)
	$(DOCKER_STACK) down -v

# --- Full stack in Docker (closer to deployment; no hot reload of host edits) ---

observability-up: ## Start Grafana + Tempo + Loki + Alloy (OTLP on :4318)
	$(COMPOSE) --profile observability up -d
	@echo ""
	@echo "  grafana   http://localhost:3003"
	@echo "  otlp      http://localhost:4318"
	@echo ""
	@echo "  1. Set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 in apps/api/.env"
	@echo "  2. Restart the API (make dev / make dev-api)"
	@echo "  3. Hit any API route, then refresh the Wire API overview dashboard"

observability-down: ## Stop Grafana/Tempo/Loki/Alloy (keeps volumes)
	$(COMPOSE) --profile observability stop grafana alloy tempo loki

docker-up: ## Build and start postgres, redis, api, web, docs all in Docker
	$(DOCKER_STACK) up -d --build
	@echo ""
	@echo "  web           http://localhost:5173"
	@echo "  api           http://localhost:3001"
	@echo "  markdown docs http://localhost:3000"

docker-down: ## Stop and remove all containers
	$(DOCKER_STACK) down

docker-logs: ## Tail logs for all containers
	$(DOCKER_STACK) logs -f

docker-ps: ## Show running containers
	$(DOCKER_STACK) ps

docker-rebuild: ## Force-rebuild all images with no cache
	$(DOCKER_STACK) build --no-cache

# --- MCP (OpenAPI-derived tools) ---

mcp-generate: ## Rewrite apps/mcp/tools.snapshot.json from the committed OpenAPI spec
	bun run --cwd apps/mcp generate

mcp-check: ## Fail if tools.snapshot.json drifts from the OpenAPI spec
	bun run --cwd apps/mcp check:openapi

mcp-lint: ## rustfmt + clippy + OpenAPI drift check for apps/mcp
	bun run lint:mcp

# --- Checks ---

install: ## Install JS dependencies
	bun install

typecheck: ## Typecheck every package/app (turbo, cached)
	bun run typecheck

lint: ## Biome + wire-rules eslint + markdown + mcp rustfmt/clippy/drift (turbo, cached)
	bun run lint

test: ## Run tests (turbo, cached)
	bun run test

knip: ## Find unused files, exports, and dependencies
	bun run knip

format: ## Format the repo with Biome
	bun run fix
