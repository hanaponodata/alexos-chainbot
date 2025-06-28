# ChainBot ALEX OS Module

## Overview

ChainBot is a native ALEX OS module that provides advanced workflow orchestration and AI agent management capabilities. It integrates seamlessly with the ALEX OS ecosystem on Raspberry Pi, offering real-time workflow execution, agent spawning, entanglement coordination, and comprehensive monitoring.

## Features

### 🚀 Core Capabilities
- **Workflow Orchestration**: Execute complex multi-step workflows with conditional logic, loops, and parallel execution
- **AI Agent Management**: Spawn and manage different types of AI agents (Assistant, Data Processor, API, Workflow)
- **Entanglement Coordination**: Create agent networks for collaborative problem-solving
- **Real-time Monitoring**: Live execution tracking with WebSocket events and audit logging
- **Raspberry Pi Integration**: Hardware monitoring and GPIO control capabilities

### 🔧 ALEX OS Integration
- **Module Registry**: Automatic discovery and registration with ALEX OS
- **Event Bus**: Pub/sub communication with other ALEX OS modules
- **Configuration Management**: Hierarchical configuration with environment variable overrides
- **Health Monitoring**: Continuous health checks and status reporting
- **API Integration**: RESTful endpoints for external system integration

### 🛡️ Security & Reliability
- **RBAC**: Role-based access control for all operations
- **Audit Logging**: Comprehensive audit trail for compliance
- **Error Recovery**: Automatic retry mechanisms and graceful failure handling
- **Resource Management**: CPU, memory, and disk usage monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ALEX OS Core                             │
├─────────────────────────────────────────────────────────────┤
│  Module Registry  │  Event Bus  │  Config Manager  │  API   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ChainBot Module                          │
├─────────────────────────────────────────────────────────────┤
│  ChainBotModule  │  WorkflowOrchestrator  │  AgentSpawner  │
│  EntanglementManager  │  WebSocketManager  │  AuditService │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                           │
│  PostgreSQL  │  SQLAlchemy  │  Alembic Migrations         │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### Prerequisites
- ALEX OS running on Raspberry Pi
- PostgreSQL database
- Python 3.8+

### Module Installation

1. **Clone the module**:
```bash
cd /opt/alex_os/modules
git clone https://github.com/your-repo/chainbot.git
```

2. **Install dependencies**:
```bash
cd chainbot
pip install -r requirements.txt
```

3. **Configure database**:
```bash
# Create database
createdb chainbot

# Run migrations
alembic upgrade head
```

4. **Register with ALEX OS**:
```bash
# The module will be auto-discovered by ALEX OS
# Or manually register:
alex_os module register chainbot
```

## Configuration

### Default Configuration
The module uses a hierarchical configuration system:

1. **Default configs** (`config/default.yaml`)
2. **Environment variables** (`ALEX_OS_CHAINBOT_*`)
3. **File configs** (JSON/YAML/TOML)
4. **Runtime configs** (dynamic changes)

### Key Configuration Sections

#### Database
```yaml
database:
  url: "postgresql://localhost/chainbot"
  pool_size: 10
  max_overflow: 20
```

#### Workflow Engine
```yaml
workflow:
  max_concurrent_executions: 5
  default_timeout_hours: 1
  retry_attempts: 3
```

#### Agent Management
```yaml
agents:
  types: ["assistant", "data_processor", "api", "workflow"]
  max_instances_per_type: 10
  max_total_instances: 50
```

#### Raspberry Pi Integration
```yaml
raspberry_pi:
  enable_hardware_monitoring: true
  cpu_temp_threshold_celsius: 80
  enable_gpio_integration: false
  gpio_pins:
    status_led: 18
    error_led: 23
```

### Environment Variables
```bash
# Database
export ALEX_OS_CHAINBOT_DATABASE_URL="postgresql://user:pass@host/chainbot"

# Workflow settings
export ALEX_OS_CHAINBOT_WORKFLOW_MAX_CONCURRENT_EXECUTIONS="10"

# Agent settings
export ALEX_OS_CHAINBOT_AGENTS_MAX_TOTAL_INSTANCES="100"
```

## Usage

### Module Lifecycle

#### Initialization
```python
from modules.chainbot import ChainBotModule

# Create module instance
module = ChainBotModule()

# Initialize with configuration
config = {
    "database": {"url": "postgresql://localhost/chainbot"},
    "workflow": {"max_concurrent_executions": 5},
    "agents": {"max_total_instances": 50}
}

success = await module.initialize(config)
```

#### Starting the Module
```python
# Start the module
success = await module.start()

# Check status
status = module.get_status()  # "running", "stopped", "error"
```

#### Health Monitoring
```python
# Perform health check
health_score = await module.health_check()  # 0.0 to 1.0

# Get module info
info = module.get_module_info()
```

### API Usage

#### Workflow Management
```python
# List workflows
workflows = await module.get_workflows()

# Execute workflow
execution_id = await module.execute_workflow(
    workflow_id="workflow_123",
    input_data={"param1": "value1"}
)
```

#### Agent Management
```python
# List agents
agents = await module.get_agents()

# Spawn new agent
agent_id = await module.spawn_agent(
    agent_type="assistant",
    config={"name": "My Assistant", "personality": "helpful"}
)
```

#### Entanglement Management
```python
# List entanglements
entanglements = await module.get_entanglements()
```

### REST API Endpoints

#### Workflows
- `GET /api/chainbot/workflows` - List all workflows
- `POST /api/chainbot/workflows` - Create new workflow
- `GET /api/chainbot/workflows/{id}` - Get workflow details
- `POST /api/chainbot/workflows/{id}/execute` - Execute workflow

#### Agents
- `GET /api/chainbot/agents` - List all agents
- `POST /api/chainbot/agents` - Spawn new agent
- `GET /api/chainbot/agents/{id}` - Get agent details
- `DELETE /api/chainbot/agents/{id}` - Terminate agent

#### Entanglements
- `GET /api/chainbot/entanglements` - List all entanglements
- `POST /api/chainbot/entanglements` - Create new entanglement
- `POST /api/chainbot/entanglements/{id}/messages` - Send message

#### Health & Metrics
- `GET /api/chainbot/health` - Get module health status
- `GET /api/chainbot/metrics` - Get module metrics

### Event Bus Integration

#### Subscribing to Events
```python
# Subscribe to workflow events
await event_bus.subscribe("chainbot.workflow.started", handler)
await event_bus.subscribe("chainbot.workflow.completed", handler)
await event_bus.subscribe("chainbot.workflow.failed", handler)

# Subscribe to agent events
await event_bus.subscribe("chainbot.agent.spawned", handler)
await event_bus.subscribe("chainbot.agent.terminated", handler)
```

#### Event Data Format
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "module_id": "chainbot",
  "workflow_id": "workflow_123",
  "execution_id": "exec_456",
  "status": "completed",
  "duration": 45.2,
  "steps_completed": 5,
  "total_steps": 5
}
```

## Workflow Examples

### Simple Sequential Workflow
```json
{
  "name": "Data Processing Pipeline",
  "description": "Process data through multiple stages",
  "type": "sequential",
  "steps": [
    {
      "id": "step1",
      "type": "agent_task",
      "agent_type": "data_processor",
      "task": "validate_input_data",
      "config": {"validation_rules": ["required", "format"]}
    },
    {
      "id": "step2",
      "type": "agent_task",
      "agent_type": "data_processor",
      "task": "transform_data",
      "config": {"transformation": "normalize"}
    },
    {
      "id": "step3",
      "type": "api_call",
      "url": "https://api.example.com/process",
      "method": "POST",
      "headers": {"Authorization": "Bearer ${api_token}"}
    }
  ]
}
```

### Conditional Workflow
```json
{
  "name": "Smart Data Processing",
  "description": "Process data with conditional logic",
  "type": "conditional",
  "steps": [
    {
      "id": "step1",
      "type": "agent_task",
      "agent_type": "assistant",
      "task": "analyze_data_quality",
      "config": {"threshold": 0.8}
    },
    {
      "id": "condition1",
      "type": "condition",
      "expression": "${step1.quality_score} > 0.8",
      "true_steps": ["step2_high_quality"],
      "false_steps": ["step2_low_quality"]
    },
    {
      "id": "step2_high_quality",
      "type": "agent_task",
      "agent_type": "data_processor",
      "task": "advanced_processing"
    },
    {
      "id": "step2_low_quality",
      "type": "agent_task",
      "agent_type": "data_processor",
      "task": "basic_processing"
    }
  ]
}
```

## Agent Types

### Assistant Agent
- **Capabilities**: Conversation, task execution, reasoning
- **Use Cases**: User interaction, problem-solving, decision support
- **Configuration**: Personality, knowledge base, response style

### Data Processor Agent
- **Capabilities**: Data processing, analysis, reporting
- **Use Cases**: ETL pipelines, data validation, statistical analysis
- **Configuration**: Processing type, algorithms, output format

### API Agent
- **Capabilities**: API calls, integration, webhooks
- **Use Cases**: External service integration, data fetching, notifications
- **Configuration**: Base URL, authentication, rate limiting

### Workflow Agent
- **Capabilities**: Workflow management, orchestration, monitoring
- **Use Cases**: Complex process coordination, multi-step automation
- **Configuration**: Workflow engine, monitoring rules, alerting

## Entanglement Management

### Creating Entanglements
```python
# Create entanglement with multiple agents
entanglement = entanglement_manager.create_entanglement(
    name="Data Analysis Team",
    description="Team of agents for data analysis",
    user_id=1
)

# Add agents to entanglement
entanglement_manager.add_agent_to_entanglement(
    entanglement_id=entanglement.id,
    agent_id=agent1.id,
    user_id=1
)
```

### Agent Communication
```python
# Send private message
message = await entanglement_manager.send_message(
    sender_id=agent1.id,
    receiver_id=agent2.id,
    content="Process this data segment",
    message_type="task"
)

# Broadcast message to all agents
messages = await entanglement_manager.broadcast_message(
    sender_id=coordinator.id,
    entanglement_id=entanglement.id,
    content="Team meeting in 5 minutes",
    message_type="notification"
)
```

## Monitoring & Troubleshooting

### Health Checks
```bash
# Check module health
curl http://localhost:8000/api/chainbot/health

# Response:
{
  "status": "healthy",
  "health_score": 0.95,
  "components": {
    "database": {"status": "healthy", "score": 1.0},
    "workflow_orchestrator": {"status": "healthy", "score": 1.0},
    "agent_spawner": {"status": "healthy", "score": 0.9},
    "entanglement_manager": {"status": "healthy", "score": 1.0}
  }
}
```

### Metrics Dashboard
```bash
# Get module metrics
curl http://localhost:8000/api/chainbot/metrics

# Response:
{
  "workflows": {
    "total": 10,
    "active": 8,
    "completed": 150,
    "failed": 5
  },
  "agents": {
    "total": 25,
    "idle": 15,
    "working": 8,
    "terminated": 2
  },
  "system": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "disk_usage": 23.4
  }
}
```

### Logging
```bash
# View module logs
tail -f /var/log/alex_os/chainbot.log

# Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
```

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
psql -h localhost -U chainbot -d chainbot -c "SELECT 1"

# Verify connection pool
curl http://localhost:8000/api/chainbot/health
```

#### Workflow Execution Failures
```bash
# Check workflow status
curl http://localhost:8000/api/chainbot/executions/{execution_id}

# View execution logs
grep "execution_id" /var/log/alex_os/chainbot.log
```

#### Agent Spawning Issues
```bash
# Check agent spawner health
curl http://localhost:8000/api/chainbot/health

# Verify agent limits
curl http://localhost:8000/api/chainbot/metrics
```

## Security

### RBAC Permissions
- `chainbot:read` - Read access to workflows, agents, entanglements
- `chainbot:workflow:execute` - Execute workflows
- `chainbot:workflow:create` - Create new workflows
- `chainbot:workflow:delete` - Delete workflows
- `chainbot:agent:spawn` - Spawn new agents
- `chainbot:agent:terminate` - Terminate agents
- `chainbot:entanglement:manage` - Manage entanglements
- `chainbot:admin` - Full administrative access

### Audit Logging
All operations are logged with:
- User ID and session information
- Action performed
- Resource affected
- Timestamp and metadata
- Success/failure status

### Sensitive Data Protection
- API keys, passwords, and tokens are masked in logs
- Database connections use encrypted credentials
- WebSocket connections require authentication

## Performance Optimization

### Caching
- Workflow definitions cached in memory
- Agent configurations cached for faster spawning
- Database query results cached with TTL

### Resource Limits
- Configurable memory limits per module
- CPU usage monitoring and throttling
- Database connection pooling

### Scaling
- Horizontal scaling with multiple module instances
- Load balancing across workflow executions
- Agent distribution across available resources

## Development

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/your-repo/chainbot.git
cd chainbot

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up development database
createdb chainbot_dev
alembic upgrade head

# Run tests
pytest tests/

# Start development server
uvicorn app.main:app --reload
```

### Testing
```bash
# Run unit tests
pytest tests/unit/

# Run integration tests
pytest tests/integration/

# Run with coverage
pytest --cov=modules/chainbot tests/
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Roadmap

### Phase 1: Core Integration ✅
- [x] Module architecture and lifecycle
- [x] Workflow orchestration engine
- [x] Agent management system
- [x] Entanglement coordination
- [x] Basic ALEX OS integration

### Phase 2: Advanced Features 🚧
- [ ] Machine learning workflow support
- [ ] Advanced agent types (LLM, Vision, Audio)
- [ ] Distributed workflow execution
- [ ] Real-time collaboration features
- [ ] Advanced monitoring and alerting

### Phase 3: Enterprise Features 📋
- [ ] Multi-tenant support
- [ ] Advanced security features
- [ ] Performance optimization
- [ ] Enterprise integrations
- [ ] Compliance and governance

### Phase 4: AI Enhancement 📋
- [ ] Autonomous agent learning
- [ ] Workflow optimization
- [ ] Predictive analytics
- [ ] Natural language workflow creation
- [ ] Advanced AI agent capabilities

## Support

### Documentation
- [API Reference](docs/api.md)
- [Workflow Examples](docs/workflows.md)
- [Agent Development](docs/agents.md)
- [Troubleshooting Guide](docs/troubleshooting.md)

### Community
- [GitHub Issues](https://github.com/your-repo/chainbot/issues)
- [Discord Community](https://discord.gg/chainbot)
- [Documentation](https://docs.chainbot.ai)

### Enterprise Support
- Email: enterprise@chainbot.ai
- Phone: +1-555-CHAINBOT
- SLA: 24/7 support with 4-hour response time

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- ALEX OS team for the excellent module framework
- FastAPI community for the robust web framework
- SQLAlchemy team for the powerful ORM
- All contributors and users of ChainBot 