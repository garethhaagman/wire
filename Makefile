.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down restart logs ps build rebuild clean \
	install typecheck lint lint-fix knip format \
	migrate dev-api dev-web dev-docs

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

up: ## Start the full stack (postgres, api, web, docs) in the background
	$(COMPOSE) up -d --build
	@echo ""
	@echo "  web          http://localhost:5173"
	@echo "  api          http://localhost:3001"
	@echo "  api docs     http://localhost:3001/docs"
	@echo "  markdown docs http://localhost:3000"
	@echo ""
	@echo "  run 'make logs' to tail service output"

down: ## Stop and remove all containers
	$(COMPOSE) down

restart: ## Restart all services
	$(COMPOSE) restart

logs: ## Tail logs for all services
	$(COMPOSE) logs -f

ps: ## Show running services
	$(COMPOSE) ps

build: ## Build all service images without starting them
	$(COMPOSE) build

rebuild: ## Force-rebuild all images with no cache
	$(COMPOSE) build --no-cache

clean: ## Stop containers and remove volumes (DESTROYS local Postgres data)
	$(COMPOSE) down -v

migrate: ## Run Postgres migrations against the compose stack
	$(COMPOSE) run --rm migrate

install: ## Install JS dependencies for local (non-Docker) development
	bun install

typecheck: ## Typecheck every package/app
	bun run typecheck

lint: ## Lint every package/app (oxlint fast pass + type-aware eslint)
	bun run lint

knip: ## Find unused files, exports, and dependencies
	bun run knip

format: ## Format the repo with Prettier
	bun run format

dev-api: ## Run the API locally (outside Docker) with hot reload
	bun run dev:api

dev-web: ## Run the web app locally (outside Docker) with hot reload
	bun run dev:web

dev-docs: ## Run the docs viewer locally (outside Docker)
	bun run dev:docs
