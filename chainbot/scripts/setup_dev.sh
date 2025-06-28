#!/bin/bash

# ChainBot Development Environment Setup Script
# This script sets up a complete development environment for ChainBot

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] ${message}${NC}"
}

print_info() {
    print_status "${BLUE}" "INFO: $1"
}

print_success() {
    print_status "${GREEN}" "SUCCESS: $1"
}

print_warning() {
    print_status "${YELLOW}" "WARNING: $1"
}

print_error() {
    print_status "${RED}" "ERROR: $1"
}

print_header() {
    echo -e "${PURPLE}"
    echo "=================================================================="
    echo "                ChainBot Development Setup"
    echo "=================================================================="
    echo -e "${NC}"
}

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="${PROJECT_ROOT}/venv"
PYTHON_VERSION="3.11"

print_header

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "This script should not be run as root. Please run as a regular user."
    exit 1
fi

# Check Python version
print_info "Checking Python version..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION_ACTUAL=$(python3 --version | cut -d' ' -f2)
    PYTHON_MAJOR=$(echo $PYTHON_VERSION_ACTUAL | cut -d'.' -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION_ACTUAL | cut -d'.' -f2)
    
    if [[ $PYTHON_MAJOR -ge 3 && $PYTHON_MINOR -ge 8 ]]; then
        print_success "Python $PYTHON_VERSION_ACTUAL found"
    else
        print_error "Python 3.8+ required, found $PYTHON_VERSION_ACTUAL"
        exit 1
    fi
else
    print_error "Python3 not found. Please install Python 3.8+"
    exit 1
fi

# Check for required system packages
print_info "Checking system dependencies..."
REQUIRED_PACKAGES=("git" "curl" "wget")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if ! command -v "$package" &> /dev/null; then
        MISSING_PACKAGES+=("$package")
    fi
done

if [[ ${#MISSING_PACKAGES[@]} -gt 0 ]]; then
    print_warning "Missing packages: ${MISSING_PACKAGES[*]}"
    print_info "Please install missing packages and run this script again."
    exit 1
fi

print_success "All system dependencies found"

# Create virtual environment
print_info "Setting up Python virtual environment..."
if [[ ! -d "$VENV_DIR" ]]; then
    python3 -m venv "$VENV_DIR"
    print_success "Virtual environment created at $VENV_DIR"
else
    print_info "Virtual environment already exists at $VENV_DIR"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# Upgrade pip
print_info "Upgrading pip..."
pip install --upgrade pip

# Install development dependencies
print_info "Installing development dependencies..."
pip install -r requirements.txt

# Install additional development tools
print_info "Installing development tools..."
pip install \
    black \
    isort \
    flake8 \
    mypy \
    pytest \
    pytest-asyncio \
    pytest-cov \
    pytest-mock \
    httpx \
    locust \
    bandit \
    safety \
    pre-commit

# Install pre-commit hooks
print_info "Setting up pre-commit hooks..."
if command -v pre-commit &> /dev/null; then
    pre-commit install
    pre-commit install --hook-type commit-msg
    print_success "Pre-commit hooks installed"
else
    print_warning "pre-commit not available, skipping hook installation"
fi

# Create development configuration
print_info "Creating development configuration..."
DEV_CONFIG_DIR="${PROJECT_ROOT}/config/dev"
mkdir -p "$DEV_CONFIG_DIR"

# Create development environment file
cat > "${PROJECT_ROOT}/.env.dev" << EOF
# ChainBot Development Environment Configuration

# Database Configuration
ALEX_OS_CHAINBOT_DATABASE_URL=postgresql://chainbot:chainbot@localhost:5432/chainbot_dev

# API Configuration
ALEX_OS_CHAINBOT_HOST=127.0.0.1
ALEX_OS_CHAINBOT_PORT=8000
ALEX_OS_CHAINBOT_DEBUG=true

# Security
ALEX_OS_CHAINBOT_SECRET_KEY=dev-secret-key-change-in-production

# Logging
ALEX_OS_CHAINBOT_LOG_LEVEL=DEBUG
ALEX_OS_CHAINBOT_LOG_FILE=logs/chainbot_dev.log

# ALEX OS Integration
ALEX_OS_CHAINBOT_WEBHOOK_URL=http://127.0.0.1:8000/api/webhooks/chainbot
ALEX_OS_CHAINBOT_EVENT_BUS_URL=ws://127.0.0.1:8000/ws/events

# Development Settings
ALEX_OS_CHAINBOT_AUTO_RELOAD=true
ALEX_OS_CHAINBOT_TEST_MODE=true
ALEX_OS_CHAINBOT_SAMPLE_DATA=true
EOF

print_success "Development environment file created: .env.dev"

# Create logs directory
print_info "Creating logs directory..."
mkdir -p "${PROJECT_ROOT}/logs"
touch "${PROJECT_ROOT}/logs/chainbot_dev.log"
print_success "Logs directory created"

# Setup database (if PostgreSQL is available)
print_info "Checking database setup..."
if command -v psql &> /dev/null; then
    print_info "PostgreSQL found, setting up development database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw chainbot_dev; then
        print_info "Development database 'chainbot_dev' already exists"
    else
        print_info "Creating development database..."
        createdb chainbot_dev 2>/dev/null || print_warning "Could not create database (may need sudo access)"
    fi
    
    # Check if user exists
    if psql -t -c '\du' | cut -d \| -f 1 | grep -qw chainbot; then
        print_info "Database user 'chainbot' already exists"
    else
        print_info "Creating database user..."
        createuser --interactive chainbot 2>/dev/null || print_warning "Could not create user (may need sudo access)"
    fi
else
    print_warning "PostgreSQL not found. Please install PostgreSQL for full functionality."
fi

# Setup Docker (if available)
print_info "Checking Docker setup..."
if command -v docker &> /dev/null; then
    print_info "Docker found, building development image..."
    cd "$PROJECT_ROOT"
    docker build -t chainbot:dev .
    print_success "Docker development image built"
else
    print_warning "Docker not found. Please install Docker for containerized development."
fi

# Create development scripts
print_info "Creating development scripts..."

# Development start script
cat > "${PROJECT_ROOT}/scripts/dev_start.sh" << 'EOF'
#!/bin/bash
# Start ChainBot in development mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="${PROJECT_ROOT}/venv"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Load development environment
export $(cat "${PROJECT_ROOT}/.env.dev" | xargs)

# Start the development server
cd "$PROJECT_ROOT/backend"
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --log-level debug
EOF

chmod +x "${PROJECT_ROOT}/scripts/dev_start.sh"

# Test runner script
cat > "${PROJECT_ROOT}/scripts/run_tests.sh" << 'EOF'
#!/bin/bash
# Run ChainBot tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="${PROJECT_ROOT}/venv"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Load development environment
export $(cat "${PROJECT_ROOT}/.env.dev" | xargs)

# Run tests
cd "$PROJECT_ROOT"
pytest "$@"
EOF

chmod +x "${PROJECT_ROOT}/scripts/run_tests.sh"

# Code quality script
cat > "${PROJECT_ROOT}/scripts/code_quality.sh" << 'EOF'
#!/bin/bash
# Run code quality checks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VENV_DIR="${PROJECT_ROOT}/venv"

# Activate virtual environment
source "$VENV_DIR/bin/activate"

# Run code quality checks
cd "$PROJECT_ROOT"

echo "Running code formatting..."
black --check --diff .
isort --check-only --diff .

echo "Running linting..."
flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=88 --statistics

echo "Running type checking..."
mypy chainbot/ backend/app/ --ignore-missing-imports

echo "Running security checks..."
bandit -r chainbot/ backend/ -f json -o bandit-report.json
safety check --json --output safety-report.json

echo "All code quality checks passed!"
EOF

chmod +x "${PROJECT_ROOT}/scripts/code_quality.sh"

print_success "Development scripts created"

# Create VS Code configuration
print_info "Setting up VS Code configuration..."
VSCODE_DIR="${PROJECT_ROOT}/.vscode"
mkdir -p "$VSCODE_DIR"

cat > "${VSCODE_DIR}/settings.json" << EOF
{
    "python.defaultInterpreterPath": "${VENV_DIR}/bin/python",
    "python.linting.enabled": true,
    "python.linting.flake8Enabled": true,
    "python.linting.mypyEnabled": true,
    "python.formatting.provider": "black",
    "python.sortImports.args": ["--profile", "black"],
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": [
        "tests"
    ],
    "python.testing.unittestEnabled": false,
    "python.testing.nosetestsEnabled": false,
    "files.exclude": {
        "**/__pycache__": true,
        "**/*.pyc": true,
        "**/.pytest_cache": true,
        "**/htmlcov": true,
        "**/.coverage": true
    },
    "python.envFile": "\${workspaceFolder}/.env.dev"
}
EOF

cat > "${VSCODE_DIR}/launch.json" << EOF
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "ChainBot Development Server",
            "type": "python",
            "request": "launch",
            "program": "\${workspaceFolder}/backend/app/main.py",
            "console": "integratedTerminal",
            "envFile": "\${workspaceFolder}/.env.dev",
            "cwd": "\${workspaceFolder}/backend",
            "args": ["--host", "127.0.0.1", "--port", "8000", "--reload"]
        },
        {
            "name": "Run Tests",
            "type": "python",
            "request": "launch",
            "module": "pytest",
            "args": ["tests/", "-v"],
            "console": "integratedTerminal",
            "envFile": "\${workspaceFolder}/.env.dev"
        }
    ]
}
EOF

print_success "VS Code configuration created"

# Create development documentation
print_info "Creating development documentation..."
cat > "${PROJECT_ROOT}/DEVELOPMENT.md" << 'EOF'
# ChainBot Development Guide

## Quick Start

1. **Activate virtual environment:**
   ```bash
   source venv/bin/activate
   ```

2. **Load development environment:**
   ```bash
   export $(cat .env.dev | xargs)
   ```

3. **Start development server:**
   ```bash
   ./scripts/dev_start.sh
   ```

4. **Run tests:**
   ```bash
   ./scripts/run_tests.sh
   ```

5. **Run code quality checks:**
   ```bash
   ./scripts/code_quality.sh
   ```

## Development Workflow

### Code Quality
- Use `black` for code formatting
- Use `isort` for import sorting
- Use `flake8` for linting
- Use `mypy` for type checking
- Use `pre-commit` hooks for automatic checks

### Testing
- Write unit tests in `tests/unit/`
- Write integration tests in `tests/integration/`
- Run tests with `pytest tests/ -v`
- Check coverage with `pytest --cov=chainbot --cov=backend/app`

### Database
- Development database: `chainbot_dev`
- Run migrations: `cd backend && alembic upgrade head`
- Create new migration: `alembic revision --autogenerate -m "description"`

### Docker
- Build image: `docker build -t chainbot:dev .`
- Run container: `docker run -p 8000:8000 chainbot:dev`
- Use docker-compose: `docker-compose up -d`

## Project Structure

```
chainbot/
├── chainbot_module.py      # Main ALEX OS module
├── api_routes.py          # REST API endpoints
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py       # FastAPI app
│   │   ├── api/          # API routes
│   │   ├── models/       # Database models
│   │   ├── services/     # Core services
│   │   └── schemas/      # Pydantic schemas
│   └── alembic/          # Database migrations
├── tests/                # Test suite
├── config/               # Configuration files
├── scripts/              # Development scripts
└── monitoring/           # Monitoring configuration
```

## Environment Variables

See `.env.dev` for development environment variables.

## API Documentation

Once the development server is running:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Monitoring

- Prometheus: http://127.0.0.1:9090
- Grafana: http://127.0.0.1:3000

## Troubleshooting

### Common Issues

1. **Database connection failed:**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env.dev`
   - Run database migrations

2. **Import errors:**
   - Ensure virtual environment is activated
   - Install dependencies: `pip install -r requirements.txt`

3. **Test failures:**
   - Check test database configuration
   - Ensure all dependencies are installed
   - Run tests with verbose output: `pytest -v`

### Getting Help

- Check the logs in `logs/chainbot_dev.log`
- Review the test output for specific errors
- Check the API documentation for endpoint details
EOF

print_success "Development documentation created"

# Final setup summary
print_header
print_success "ChainBot development environment setup complete!"
echo
print_info "Next steps:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Load environment: export \$(cat .env.dev | xargs)"
echo "  3. Start development server: ./scripts/dev_start.sh"
echo "  4. Run tests: ./scripts/run_tests.sh"
echo "  5. Check code quality: ./scripts/code_quality.sh"
echo
print_info "Documentation:"
echo "  - Development guide: DEVELOPMENT.md"
echo "  - API documentation: http://127.0.0.1:8000/docs (after starting server)"
echo "  - Project summary: PROJECT_SUMMARY.md"
echo
print_info "VS Code:"
echo "  - Open the project in VS Code for the best development experience"
echo "  - Use the provided launch configurations for debugging"
echo
print_success "Happy coding! 🚀" 