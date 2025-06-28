# ChainBot ALEX OS Module

## Overview

ChainBot is an advanced workflow orchestration engine with AI agent management capabilities, designed to integrate seamlessly with ALEX OS on Raspberry Pi systems. This module provides sophisticated workflow execution, agent coordination, and real-time monitoring capabilities.

## Features

### 🚀 **Core Capabilities**
- **Advanced Workflow Orchestration**: Execute complex workflows with conditional logic and parallel execution
- **AI Agent Management**: Spawn and manage different types of AI agents (Assistant, Data Processor, API, Workflow)
- **Entanglement Coordination**: Enable collaborative problem-solving between multiple agents
- **Real-time Monitoring**: WebSocket-based event streaming and comprehensive audit logging
- **Raspberry Pi Integration**: Hardware monitoring and optimization for Pi systems

### 🔧 **Technical Features**
- **FastAPI-based REST API**: High-performance API with automatic documentation
- **PostgreSQL Database**: Robust data persistence with Alembic migrations
- **WebSocket Support**: Real-time event broadcasting and communication
- **Health Monitoring**: Comprehensive health checks and metrics collection
- **Security**: JWT authentication, role-based access control, and audit logging

### 🏗️ **ALEX OS Integration**
- **Event Bus Integration**: Publish/subscribe to ALEX OS system events
- **Module Registry**: Automatic discovery and registration with ALEX OS
- **Webhook Support**: Receive and process external events
- **Health Reporting**: Continuous status reporting to ALEX OS
- **Configuration Management**: Hierarchical configuration with validation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ALEX OS Integration                      │
├─────────────────────────────────────────────────────────────┤
│  Event Bus │ Webhooks │ Module Registry │ Health Monitoring │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    ChainBot Core Services                   │
├─────────────────────────────────────────────────────────────┤
│ WorkflowOrchestrator │ AgentSpawner │ EntanglementManager   │
├─────────────────────────────────────────────────────────────┤
│ WebSocketManager │ AuditService │ ConfigurationManager      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│ PostgreSQL │ Alembic Migrations │ Connection Pooling        │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Raspberry Pi (3B+ or newer recommended)
- Python 3.8+
- PostgreSQL 12+
- ALEX OS installed and configured

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/chainbot.git
   cd chainbot
   ```

2. **Run the deployment script**:
   ```bash
   chmod +x deploy_alex_os.sh
   ./deploy_alex_os.sh
   ```

3. **Follow the interactive prompts** to configure:
   - Database credentials
   - API settings
   - Security keys
   - Sample data creation

### Manual Installation

If you prefer manual installation:

1. **Install system dependencies**:
   ```bash
   sudo apt-get update
   sudo apt-get install python3 python3-pip python3-venv postgresql postgresql-contrib git
   ```

2. **Create virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Setup database**:
   ```bash
   sudo -u postgres createdb chainbot
   sudo -u postgres createuser chainbot
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE chainbot TO chainbot;"
   ```

4. **Run migrations**:
   ```bash
   cd backend
   alembic upgrade head
   ```

5. **Start the service**:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```

## Configuration

### Environment Variables

```bash
# Database Configuration
ALEX_OS_CHAINBOT_DATABASE_URL=postgresql://chainbot:password@localhost/chainbot

# API Configuration
ALEX_OS_CHAINBOT_API_URL=http://127.0.0.1:8000
ALEX_OS_CHAINBOT_HOST=127.0.0.1
ALEX_OS_CHAINBOT_PORT=8000

# ALEX OS Integration
ALEX_OS_CHAINBOT_WEBHOOK_URL=http://127.0.0.1:8000/api/webhooks/chainbot
ALEX_OS_CHAINBOT_EVENT_BUS_URL=ws://127.0.0.1:8000/ws/events

# Security
ALEX_OS_CHAINBOT_SECRET_KEY=your-secret-key-here

# Logging
ALEX_OS_CHAINBOT_LOG_LEVEL=INFO
ALEX_OS_CHAINBOT_LOG_FILE=/var/log/alex_os/chainbot.log
```

### Configuration Files

The module uses a hierarchical configuration system:

1. **Default Configuration** (`config/default.yaml`)
2. **Environment Variables** (prefixed with `ALEX_OS_CHAINBOT_`)
3. **File Configuration** (JSON/YAML/TOML)
4. **Runtime Configuration** (dynamic changes)

### Configuration Schema

The configuration is validated against `config/schema.json` to ensure:
- Required fields are present
- Data types are correct
- Value ranges are within acceptable limits
- Security settings are properly configured

## API Reference

### Health and Monitoring

```bash
# Health check
GET /api/chainbot/health

# Metrics
GET /api/chainbot/metrics

# Module info
GET /api/chainbot/info

# Status
GET /api/chainbot/status
```

### Workflow Management

```bash
# List workflows
GET /api/chainbot/workflows

# Execute workflow
POST /api/chainbot/workflows/{workflow_id}/execute
{
  "parameters": {},
  "priority": "normal"
}
```

### Agent Management

```bash
# List agents
GET /api/chainbot/agents

# Spawn agent
POST /api/chainbot/agents
{
  "name": "My Agent",
  "type": "assistant",
  "config": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7
  }
}
```

### Webhooks

```bash
# Workflow events
POST /api/webhooks/chainbot/workflow/started
POST /api/webhooks/chainbot/workflow/completed

# Agent events
POST /api/webhooks/chainbot/agent/spawned
```

## Service Management

### Systemd Service

The deployment script creates a systemd service for automatic management:

```bash
# Start service
sudo systemctl start chainbot.service

# Stop service
sudo systemctl stop chainbot.service

# Check status
sudo systemctl status chainbot.service

# View logs
sudo journalctl -u chainbot.service -f

# Enable auto-start
sudo systemctl enable chainbot.service
```

### Health Monitoring

The module includes comprehensive health monitoring:

```bash
# Run health check
/opt/alex_os/modules/chainbot/scripts/health_check.sh

# Check exit codes:
# 0 = Healthy
# 1 = Warning
# 2 = Critical
```

## ALEX OS Integration

### Event Bus Topics

**Publish Events**:
- `chainbot.workflow.started`
- `chainbot.workflow.completed`
- `chainbot.agent.spawned`
- `chainbot.entanglement.created`

**Subscribe to Events**:
- `alex_os.system.status`
- `alex_os.module.health`

### Module Registration

The module automatically registers with ALEX OS using `alex_os_module.json`:

```json
{
  "name": "chainbot",
  "version": "1.0.0",
  "description": "Advanced workflow orchestration engine",
  "api_endpoints": {
    "health": "/api/chainbot/health",
    "metrics": "/api/chainbot/metrics"
  },
  "event_topics": {
    "publish": ["chainbot.workflow.started"],
    "subscribe": ["alex_os.system.status"]
  }
}
```

## Development

### Project Structure

```
chainbot/
├── deploy_alex_os.sh          # Deployment script
├── chainbot_module.py         # ALEX OS module implementation
├── api_routes.py             # REST API endpoints
├── config/
│   ├── default.yaml          # Default configuration
│   └── schema.json           # Configuration validation
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── api/             # API routes
│   │   │   ├── models/          # Database models
│   │   │   ├── schemas/         # Pydantic schemas
│   │   │   └── services/        # Business logic
│   │   ├── alembic/             # Database migrations
│   │   └── requirements.txt     # Python dependencies
│   └── README.md                # This file
```

### Running in Development

```bash
# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations
cd backend
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Testing

```bash
# Run tests
cd backend
pytest

# Run with coverage
pytest --cov=app

# Run specific test
pytest tests/test_workflows.py
```

## Monitoring and Logging

### Log Files

- **Application Logs**: `/var/log/alex_os/chainbot.log`
- **Systemd Logs**: `sudo journalctl -u chainbot.service`
- **Audit Logs**: Database table `audit_logs`

### Metrics

The module provides comprehensive metrics via:
- **Prometheus Endpoint**: `/metrics`
- **Health Endpoint**: `/api/chainbot/health`
- **Performance Metrics**: CPU, memory, disk usage

### Alerting

Configure alerts for:
- CPU usage > 80%
- Memory usage > 80%
- Disk usage > 90%
- Error rate > 5%

## Security

### Authentication

- JWT-based authentication
- Role-based access control
- Secure password hashing with bcrypt
- Token expiration and refresh

### Data Protection

- Database SSL connections
- Sensitive data masking in logs
- Secure configuration file permissions (750)
- Non-root service execution

### Network Security

- Localhost-only API access by default
- CORS configuration for web interfaces
- WebSocket connection limits
- Rate limiting on API endpoints

## Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   # Check logs
   sudo journalctl -u chainbot.service
   
   # Check configuration
   cat /opt/alex_os/modules/chainbot/.env
   ```

2. **Database connection issues**:
   ```bash
   # Test database connection
   sudo -u postgres psql -d chainbot -c "SELECT 1;"
   
   # Check database status
   sudo systemctl status postgresql
   ```

3. **Permission issues**:
   ```bash
   # Fix permissions
   sudo chown -R pi:pi /opt/alex_os/modules/chainbot
   sudo chmod 750 /opt/alex_os/modules/chainbot/.env
   ```

4. **Port conflicts**:
   ```bash
   # Check port usage
   sudo netstat -tlnp | grep :8000
   
   # Kill conflicting process
   sudo kill -9 <PID>
   ```

### Health Check Failures

```bash
# Run detailed health check
/opt/alex_os/modules/chainbot/scripts/health_check.sh

# Check individual components
curl -f http://127.0.0.1:8000/api/chainbot/health
curl -f http://127.0.0.1:8000/api/chainbot/metrics
```

### Performance Issues

1. **High CPU usage**:
   - Check workflow execution
   - Monitor agent activity
   - Review system resources

2. **Memory issues**:
   - Check agent memory limits
   - Review connection pooling
   - Monitor cache usage

3. **Database performance**:
   - Check connection pool settings
   - Review query performance
   - Monitor database size

## Backup and Recovery

### Backup

```bash
# Backup database
sudo -u postgres pg_dump chainbot > backup_$(date +%Y%m%d).sql

# Backup configuration
sudo cp -r /opt/alex_os/modules/chainbot /var/backups/alex_os/chainbot/

# Backup logs
sudo cp /var/log/alex_os/chainbot.log /var/backups/alex_os/chainbot/
```

### Recovery

```bash
# Stop service
sudo systemctl stop chainbot.service

# Restore database
sudo -u postgres psql chainbot < backup_YYYYMMDD.sql

# Restore configuration
sudo cp -r /var/backups/alex_os/chainbot/* /opt/alex_os/modules/chainbot/

# Start service
sudo systemctl start chainbot.service
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines

- Follow PEP 8 style guidelines
- Add type hints to all functions
- Write comprehensive docstrings
- Include unit tests for new features
- Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:

1. Check the documentation
2. Review the troubleshooting section
3. Check the logs for error messages
4. Open an issue on GitHub

### Contact

- **Email**: support@chainbot.local
- **GitHub**: https://github.com/your-org/chainbot
- **Documentation**: https://chainbot.readthedocs.io

## Changelog

### Version 1.0.0
- Initial release
- ALEX OS integration
- Workflow orchestration
- Agent management
- Real-time monitoring
- Comprehensive API
- Security features
- Health monitoring
- Backup and recovery 