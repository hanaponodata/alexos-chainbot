# ChainBot ALEX OS Module Makefile
# Development and deployment automation

.PHONY: help install dev-install test lint format clean build deploy docs

# Default target
help:
	@echo "ChainBot ALEX OS Module - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  install      - Install production dependencies"
	@echo "  dev-install  - Install development dependencies"
	@echo "  test         - Run test suite"
	@echo "  test-unit    - Run unit tests only"
	@echo "  test-integration - Run integration tests only"
	@echo "  lint         - Run linting checks"
	@echo "  format       - Format code with black and isort"
	@echo "  clean        - Clean build artifacts"
	@echo "  build        - Build package"
	@echo ""
	@echo "Deployment:"
	@echo "  deploy-local - Deploy to local environment"
	@echo "  deploy-alex  - Deploy to ALEX OS"
	@echo "  deploy-prod  - Deploy to production"
	@echo ""
	@echo "Documentation:"
	@echo "  docs         - Build documentation"
	@echo "  docs-serve   - Serve documentation locally"
	@echo ""
	@echo "Utilities:"
	@echo "  health       - Check system health"
	@echo "  logs         - View application logs"
	@echo "  backup       - Create backup"
	@echo "  restore      - Restore from backup"

# Python and pip settings
PYTHON := python3
PIP := pip3
PYTEST := pytest
BLACK := black
ISORT := isort
FLAKE8 := flake8
MYPY := mypy

# Project settings
PROJECT_NAME := chainbot-alex-os
VERSION := 1.0.0
PACKAGE_DIR := chainbot
TEST_DIR := tests
DOCS_DIR := docs

# Installation targets
install:
	@echo "Installing production dependencies..."
	$(PIP) install -r requirements.txt

dev-install:
	@echo "Installing development dependencies..."
	$(PIP) install -r requirements.txt
	$(PIP) install -e ".[dev,docs]"

# Testing targets
test:
	@echo "Running full test suite..."
	$(PYTEST) $(TEST_DIR)/ -v --cov=$(PACKAGE_DIR) --cov-report=term-missing --cov-report=html

test-unit:
	@echo "Running unit tests..."
	$(PYTEST) $(TEST_DIR)/unit/ -v

test-integration:
	@echo "Running integration tests..."
	$(PYTEST) $(TEST_DIR)/integration/ -v

test-coverage:
	@echo "Running tests with coverage..."
	$(PYTEST) $(TEST_DIR)/ -v --cov=$(PACKAGE_DIR) --cov-report=html --cov-report=xml

# Code quality targets
lint:
	@echo "Running linting checks..."
	$(FLAKE8) $(PACKAGE_DIR)/ $(TEST_DIR)/
	$(MYPY) $(PACKAGE_DIR)/

format:
	@echo "Formatting code..."
	$(BLACK) $(PACKAGE_DIR)/ $(TEST_DIR)/
	$(ISORT) $(PACKAGE_DIR)/ $(TEST_DIR)/

format-check:
	@echo "Checking code formatting..."
	$(BLACK) --check $(PACKAGE_DIR)/ $(TEST_DIR)/
	$(ISORT) --check-only $(PACKAGE_DIR)/ $(TEST_DIR)/

# Build targets
clean:
	@echo "Cleaning build artifacts..."
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/
	rm -rf .mypy_cache/
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete

build: clean
	@echo "Building package..."
	$(PYTHON) setup.py sdist bdist_wheel

# Deployment targets
deploy-local:
	@echo "Deploying to local environment..."
	$(PYTHON) -m chainbot.cli.main deploy local

deploy-alex:
	@echo "Deploying to ALEX OS..."
	./deploy_alex_os.sh

deploy-prod:
	@echo "Deploying to production..."
	@echo "Production deployment not yet implemented"

# Documentation targets
docs:
	@echo "Building documentation..."
	mkdocs build

docs-serve:
	@echo "Serving documentation locally..."
	mkdocs serve

# Utility targets
health:
	@echo "Checking system health..."
	$(PYTHON) -m chainbot.cli.main health

logs:
	@echo "Viewing application logs..."
	tail -f /var/log/alex_os/chainbot.log

backup:
	@echo "Creating backup..."
	@timestamp=$$(date +%Y%m%d_%H%M%S); \
	backup_dir="/var/backups/alex_os/chainbot/backup_$$timestamp"; \
	mkdir -p "$$backup_dir"; \
	cp -r /opt/alex_os/modules/chainbot "$$backup_dir/"; \
	echo "Backup created: $$backup_dir"

restore:
	@echo "Restoring from backup..."
	@read -p "Enter backup timestamp (YYYYMMDD_HHMMSS): " timestamp; \
	backup_dir="/var/backups/alex_os/chainbot/backup_$$timestamp"; \
	if [ -d "$$backup_dir" ]; then \
		sudo systemctl stop chainbot.service; \
		cp -r "$$backup_dir/chainbot" /opt/alex_os/modules/; \
		sudo systemctl start chainbot.service; \
		echo "Restore completed from: $$backup_dir"; \
	else \
		echo "Backup not found: $$backup_dir"; \
	fi

# Development workflow
dev-setup: dev-install
	@echo "Setting up development environment..."
	$(PYTHON) -m chainbot.cli.main version

dev-test: format lint test
	@echo "Development test cycle completed"

# CI/CD targets
ci-test: format-check lint test-coverage
	@echo "CI test cycle completed"

# Docker targets (if needed)
docker-build:
	@echo "Building Docker image..."
	docker build -t $(PROJECT_NAME):$(VERSION) .

docker-run:
	@echo "Running Docker container..."
	docker run -p 8000:8000 $(PROJECT_NAME):$(VERSION)

# Release targets
release-patch:
	@echo "Creating patch release..."
	@new_version=$$(echo $(VERSION) | awk -F. '{print $$1"."$$2"."$$3+1}'); \
	sed -i "s/VERSION := $(VERSION)/VERSION := $$new_version/" Makefile; \
	git add Makefile; \
	git commit -m "Bump version to $$new_version"; \
	git tag "v$$new_version"

release-minor:
	@echo "Creating minor release..."
	@new_version=$$(echo $(VERSION) | awk -F. '{print $$1"."$$2+1".0"}'); \
	sed -i "s/VERSION := $(VERSION)/VERSION := $$new_version/" Makefile; \
	git add Makefile; \
	git commit -m "Bump version to $$new_version"; \
	git tag "v$$new_version"

release-major:
	@echo "Creating major release..."
	@new_version=$$(echo $(VERSION) | awk -F. '{print $$1+1".0.0"}'); \
	sed -i "s/VERSION := $(VERSION)/VERSION := $$new_version/" Makefile; \
	git add Makefile; \
	git commit -m "Bump version to $$new_version"; \
	git tag "v$$new_version"

# System targets
system-status:
	@echo "Checking system status..."
	sudo systemctl status chainbot.service

system-start:
	@echo "Starting ChainBot service..."
	sudo systemctl start chainbot.service

system-stop:
	@echo "Stopping ChainBot service..."
	sudo systemctl stop chainbot.service

system-restart:
	@echo "Restarting ChainBot service..."
	sudo systemctl restart chainbot.service

system-logs:
	@echo "Viewing system logs..."
	sudo journalctl -u chainbot.service -f

# Database targets
db-migrate:
	@echo "Running database migrations..."
	cd backend && alembic upgrade head

db-rollback:
	@echo "Rolling back database migration..."
	cd backend && alembic downgrade -1

db-reset:
	@echo "Resetting database..."
	cd backend && alembic downgrade base && alembic upgrade head

# Security targets
security-check:
	@echo "Running security checks..."
	bandit -r $(PACKAGE_DIR)/
	safety check

# Performance targets
profile:
	@echo "Running performance profiling..."
	$(PYTHON) -m cProfile -o profile.stats -m chainbot.cli.main start

profile-view:
	@echo "Viewing profile results..."
	$(PYTHON) -c "import pstats; p = pstats.Stats('profile.stats'); p.sort_stats('cumulative').print_stats(20)"
