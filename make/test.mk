DC := docker compose -f ai/docker-compose.yml

.PHONY: test test-watch

test:
	$(DC) exec backend npm test

test-watch:
	$(DC) exec -it backend npm run test:watch
