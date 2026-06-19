DC := docker compose -f ai/docker-compose.yml

.PHONY: up down build restart logs ps migrate seed

up:
	$(DC) up -d

down:
	$(DC) down

build:
	$(DC) up -d --build

restart:
	$(DC) restart

logs:
	$(DC) logs -f

ps:
	$(DC) ps

migrate:
	$(DC) exec backend npm run migrate

seed:
	sh scripts/seed/seed.sh
