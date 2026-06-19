include make/dev.mk
include make/test.mk

.PHONY: help
help:
	@echo ""
	@echo "  dev"
	@echo "    up          Start all containers"
	@echo "    down        Stop all containers"
	@echo "    build       Rebuild and start containers"
	@echo "    restart     Restart all containers"
	@echo "    logs        Tail logs (all services)"
	@echo "    ps          Show container status"
	@echo "    migrate     Run pending DB migrations"
	@echo "    seed        Seed DB with stations, buses and routes"
	@echo ""
	@echo "  test"
	@echo "    test        Run full test suite inside container"
	@echo "    test-watch  Run tests in watch mode"
	@echo ""
